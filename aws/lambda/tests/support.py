"""Test support: in-memory AWS fakes and a loader for the hyphenated handler modules.

The suite runs on any machine with only the Python standard library — boto3 and
botocore are replaced with stubs installed into sys.modules before a handler is
imported, so tests exercise the real handler logic against fake tables/clients.
"""

import importlib.util
import os
import sys
import types
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

LAMBDA_DIR = Path(__file__).resolve().parent.parent


class FakeClientError(Exception):
    def __init__(self, error_response: Dict[str, Any], operation_name: str = "Op"):
        super().__init__(str(error_response))
        self.response = error_response
        self.operation_name = operation_name


class FakeKey:
    """Stand-in for boto3.dynamodb.conditions.Key; produces inspectable tuples."""

    def __init__(self, name: str):
        self.name = name

    def eq(self, value: Any) -> Tuple[str, str, Any]:
        return ("eq", self.name, value)


class FakeTable:
    """In-memory DynamoDB table recording every call for assertions."""

    def __init__(self, items: Optional[List[Dict[str, Any]]] = None):
        self.items: List[Dict[str, Any]] = list(items or [])
        self.calls: List[Tuple[str, Dict[str, Any]]] = []

    def scan(self, **kwargs: Any) -> Dict[str, Any]:
        self.calls.append(("scan", kwargs))
        return {"Items": list(self.items)}

    def query(self, **kwargs: Any) -> Dict[str, Any]:
        self.calls.append(("query", kwargs))
        condition = kwargs.get("KeyConditionExpression")
        items = list(self.items)
        if isinstance(condition, tuple) and condition[0] == "eq":
            _, attr, value = condition
            items = [i for i in items if i.get(attr) == value]
        return {"Items": items}

    def get_item(self, Key: Dict[str, Any], **kwargs: Any) -> Dict[str, Any]:
        self.calls.append(("get_item", {"Key": Key}))
        for item in self.items:
            if all(item.get(k) == v for k, v in Key.items()):
                return {"Item": item}
        return {}

    def put_item(self, Item: Dict[str, Any], **kwargs: Any) -> Dict[str, Any]:
        self.calls.append(("put_item", {"Item": Item}))
        self.items.append(Item)
        return {}

    def update_item(self, **kwargs: Any) -> Dict[str, Any]:
        self.calls.append(("update_item", kwargs))
        key = kwargs.get("Key", {})
        found = None
        for item in self.items:
            if all(item.get(k) == v for k, v in key.items()):
                found = item
                break

        condition = kwargs.get("ConditionExpression", "")
        if "attribute_exists" in str(condition) and found is None:
            raise FakeClientError(
                {"Error": {"Code": "ConditionalCheckFailedException"}}, "UpdateItem"
            )
        # Extra equality guards (e.g. "#status = :proposed") beyond existence.
        if found is not None and "#status = :proposed" in str(condition):
            if found.get("status") != "proposed":
                raise FakeClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException"}}, "UpdateItem"
                )

        updates = self._parse_set_expression(kwargs)
        attributes = {**(found or dict(key)), **updates}
        if found is not None:
            found.update(updates)
        return {"Attributes": attributes}

    @staticmethod
    def _parse_set_expression(kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve 'SET a = :v, #n = :w' into concrete attribute/value pairs."""
        expression = kwargs.get("UpdateExpression", "")
        names = kwargs.get("ExpressionAttributeNames") or {}
        values = kwargs.get("ExpressionAttributeValues") or {}
        updates: Dict[str, Any] = {}
        if not expression.strip().upper().startswith("SET"):
            return updates
        for assignment in expression.strip()[3:].split(","):
            attr, _, value_key = assignment.partition("=")
            attr = names.get(attr.strip(), attr.strip())
            updates[attr] = values.get(value_key.strip())
        return updates


class RecordingClient:
    """Generic AWS client fake: records calls, returns configured responses."""

    def __init__(self, responses: Optional[Dict[str, Any]] = None):
        self.responses = responses or {}
        self.calls: List[Tuple[str, Dict[str, Any]]] = []

    def __getattr__(self, name: str):
        def method(**kwargs: Any) -> Any:
            self.calls.append((name, kwargs))
            response = self.responses.get(name)
            if isinstance(response, Exception):
                raise response
            return response if response is not None else {}

        return method

    def calls_to(self, name: str) -> List[Dict[str, Any]]:
        return [kwargs for method, kwargs in self.calls if method == name]


def _install_aws_stubs(tables: Dict[str, FakeTable], clients: Dict[str, Any]) -> None:
    boto3_mod = types.ModuleType("boto3")
    dynamodb_mod = types.ModuleType("boto3.dynamodb")
    conditions_mod = types.ModuleType("boto3.dynamodb.conditions")
    botocore_mod = types.ModuleType("botocore")
    exceptions_mod = types.ModuleType("botocore.exceptions")

    class _Resource:
        def Table(self, name: str) -> FakeTable:
            return tables.setdefault(name, FakeTable())

    boto3_mod.resource = lambda service: _Resource()
    boto3_mod.client = lambda service: clients.setdefault(service, RecordingClient())
    boto3_mod.dynamodb = dynamodb_mod
    conditions_mod.Key = FakeKey
    dynamodb_mod.conditions = conditions_mod
    exceptions_mod.ClientError = FakeClientError
    botocore_mod.exceptions = exceptions_mod

    sys.modules["boto3"] = boto3_mod
    sys.modules["boto3.dynamodb"] = dynamodb_mod
    sys.modules["boto3.dynamodb.conditions"] = conditions_mod
    sys.modules["botocore"] = botocore_mod
    sys.modules["botocore.exceptions"] = exceptions_mod


def load_handler(
    filename: str,
    env: Dict[str, str],
    tables: Optional[Dict[str, FakeTable]] = None,
    clients: Optional[Dict[str, Any]] = None,
):
    """Import a handler module (e.g. "forecasts-handler.py") against fakes.

    Returns (module, tables, clients); tables/clients are live registries the
    test can inspect after invoking the handler.
    """
    tables = tables if tables is not None else {}
    clients = clients if clients is not None else {}

    for key, value in env.items():
        os.environ[key] = value

    _install_aws_stubs(tables, clients)
    sys.modules.pop("common", None)  # re-import against the current stubs
    if str(LAMBDA_DIR) not in sys.path:
        sys.path.insert(0, str(LAMBDA_DIR))

    module_name = f"handler_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(module_name, LAMBDA_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module, tables, clients


def api_event(
    method: str,
    path: str,
    body: Optional[str] = None,
    query: Optional[Dict[str, str]] = None,
    claims: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    event: Dict[str, Any] = {
        "httpMethod": method,
        "path": path,
        "queryStringParameters": query,
        "body": body,
    }
    if claims is not None:
        event["requestContext"] = {"authorizer": {"claims": claims}}
    return event
