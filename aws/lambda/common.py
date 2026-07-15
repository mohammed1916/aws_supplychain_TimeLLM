"""Shared utilities for TimeWise Lambda services.

Package this module into every function zip:
    zip <service>.zip <service>-handler.py common.py
"""

import base64
import json
import logging
import os
import re
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")


class ApiError(Exception):
    """Error carrying an HTTP status code; raised by handlers, caught by the router."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class ValidationError(ApiError):
    def __init__(self, message: str):
        super().__init__(400, message)


class NotFoundError(ApiError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(404, message)


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


def cors_headers() -> Dict[str, str]:
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
    }


def _to_serializable(obj: Any) -> Any:
    if isinstance(obj, list):
        return [_to_serializable(item) for item in obj]
    if isinstance(obj, dict):
        return {key: _to_serializable(value) for key, value in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def json_response(status: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status,
        "headers": cors_headers(),
        "body": json.dumps(_to_serializable(body)),
    }


def error_response(status: int, message: str) -> Dict[str, Any]:
    return json_response(status, {"error": message})


def parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    raw = event.get("body") or "{}"
    try:
        body = json.loads(raw, parse_float=Decimal)
    except json.JSONDecodeError as exc:
        raise ValidationError(f"Request body is not valid JSON: {exc}") from exc
    if not isinstance(body, dict):
        raise ValidationError("Request body must be a JSON object")
    return body


def require_fields(body: Dict[str, Any], *fields: str) -> None:
    missing = [f for f in fields if body.get(f) in (None, "", [])]
    if missing:
        raise ValidationError(f"Missing required field(s): {', '.join(missing)}")


# --- Pagination -------------------------------------------------------------
# DynamoDB LastEvaluatedKey round-trips to the client as an opaque base64 token.


def encode_page_token(last_evaluated_key: Optional[Dict[str, Any]]) -> Optional[str]:
    if not last_evaluated_key:
        return None
    return base64.urlsafe_b64encode(
        json.dumps(_to_serializable(last_evaluated_key)).encode()
    ).decode()


def decode_page_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        return json.loads(base64.urlsafe_b64decode(token.encode()).decode())
    except (ValueError, json.JSONDecodeError) as exc:
        raise ValidationError("Invalid pagination token") from exc


def list_response_body(
    items: List[Dict[str, Any]],
    last_evaluated_key: Optional[Dict[str, Any]] = None,
    **extra: Any,
) -> Dict[str, Any]:
    body: Dict[str, Any] = {"items": items, "count": len(items)}
    next_token = encode_page_token(last_evaluated_key)
    if next_token:
        body["nextToken"] = next_token
    body.update(extra)
    return body


# --- Metrics ----------------------------------------------------------------


def put_metric(
    cloudwatch: Any,
    namespace: str,
    name: str,
    value: float,
    unit: str = "Count",
    dimensions: Optional[Dict[str, str]] = None,
) -> None:
    """Emit a custom metric; metric failures must never fail the request."""
    try:
        metric: Dict[str, Any] = {"MetricName": name, "Value": value, "Unit": unit}
        if dimensions:
            metric["Dimensions"] = [
                {"Name": k, "Value": v} for k, v in dimensions.items()
            ]
        cloudwatch.put_metric_data(Namespace=namespace, MetricData=[metric])
    except Exception:  # noqa: BLE001 - observability is best-effort by design
        logger.warning("Failed to emit metric %s/%s", namespace, name, exc_info=True)


# --- Router -----------------------------------------------------------------


class Router:
    """Minimal method+path router for API Gateway Lambda-proxy events.

    Routes are registered with path templates ("/forecasts/{id}") and matched
    against the request path; template variables are passed to the handler as
    keyword arguments alongside the event.
    """

    def __init__(self) -> None:
        self._routes: List[Tuple[str, re.Pattern, Callable]] = []

    def route(self, method: str, template: str) -> Callable:
        pattern = re.compile(
            "^" + re.sub(r"\{(\w+)\}", r"(?P<\1>[^/]+)", template) + "/?$"
        )

        def decorator(func: Callable) -> Callable:
            self._routes.append((method.upper(), pattern, func))
            return func

        return decorator

    def dispatch(self, event: Dict[str, Any]) -> Dict[str, Any]:
        method = (
            event.get("httpMethod")
            or event.get("requestContext", {}).get("http", {}).get("method", "GET")
        ).upper()
        path = event.get("path") or event.get("rawPath") or "/"

        if method == "OPTIONS":  # CORS preflight is answered here, not by MOCKs
            return {"statusCode": 204, "headers": cors_headers(), "body": ""}

        for route_method, pattern, func in self._routes:
            if route_method != method:
                continue
            match = pattern.match(path)
            if match:
                try:
                    return func(event, **match.groupdict())
                except ApiError as exc:
                    logger.info("Request failed: %s %s -> %s", method, path, exc.message)
                    return error_response(exc.status, exc.message)
                except Exception:  # noqa: BLE001 - last-resort handler boundary
                    logger.exception("Unhandled error: %s %s", method, path)
                    return error_response(500, "Internal server error")

        return error_response(404, f"No route for {method} {path}")
