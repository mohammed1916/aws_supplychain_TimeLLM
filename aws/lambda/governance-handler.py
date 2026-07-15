"""Governance service: RBAC access controls, AI governance metrics, bias detections.

Routes:
    GET /access-controls              list user access records (?role= via RoleIndex)
    PUT /access-controls/{userId}     replace a user's permission set
    GET /governance-metrics           list governance metric checks, newest first
    GET /bias-detections              list bias detections (?modelComponent= via ModelIndex)

Environment:
    ACCESS_CONTROLS_TABLE, GOVERNANCE_METRICS_TABLE, BIAS_DETECTIONS_TABLE
    METRICS_NAMESPACE   CloudWatch namespace prefix

Every permission change is written to the audit log (CloudWatch Logs via
structured logging) with actor, subject, and before/after permission sets.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from common import (
    NotFoundError,
    Router,
    ValidationError,
    decode_page_token,
    json_response,
    list_response_body,
    parse_body,
    put_metric,
    require_env,
)

logger = logging.getLogger()

dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")

ACCESS_CONTROLS_TABLE = dynamodb.Table(require_env("ACCESS_CONTROLS_TABLE"))
GOVERNANCE_METRICS_TABLE = dynamodb.Table(require_env("GOVERNANCE_METRICS_TABLE"))
BIAS_DETECTIONS_TABLE = dynamodb.Table(require_env("BIAS_DETECTIONS_TABLE"))
NAMESPACE = os.environ.get("METRICS_NAMESPACE", "TimeWise")

# Permission vocabulary is closed: unknown permission strings are rejected so a
# typo can never silently grant nothing (or, worse, be matched loosely later).
KNOWN_PERMISSIONS = frozenset(
    {
        "view_forecasts",
        "manage_inventory",
        "generate_reports",
        "model_training",
        "data_access",
        "algorithm_tuning",
        "executive_dashboard",
        "strategic_reports",
        "budget_approval",
        "manage_users",
        "acknowledge_alerts",
        "run_optimizations",
    }
)

router = Router()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.route("GET", "/access-controls")
def get_access_controls(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    role = params.get("role")

    if role:
        result = ACCESS_CONTROLS_TABLE.query(
            IndexName="RoleIndex",
            KeyConditionExpression=Key("role").eq(role),
        )
    else:
        result = ACCESS_CONTROLS_TABLE.scan()

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("PUT", "/access-controls/{user_id}")
def update_user_access(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    body = parse_body(event)
    permissions = body.get("permissions")

    if not isinstance(permissions, list) or not all(
        isinstance(p, str) for p in permissions
    ):
        raise ValidationError("permissions must be an array of strings")
    unknown: List[str] = sorted(set(permissions) - KNOWN_PERMISSIONS)
    if unknown:
        raise ValidationError(f"Unknown permission(s): {', '.join(unknown)}")

    previous = ACCESS_CONTROLS_TABLE.get_item(Key={"userId": user_id}).get("Item")
    if not previous:
        raise NotFoundError(f"User {user_id} not found")

    try:
        result = ACCESS_CONTROLS_TABLE.update_item(
            Key={"userId": user_id},
            UpdateExpression="SET #perms = :perms, updatedAt = :at",
            ConditionExpression="attribute_exists(userId)",
            ExpressionAttributeNames={"#perms": "permissions"},
            ExpressionAttributeValues={":perms": permissions, ":at": _now()},
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(f"User {user_id} not found") from exc
        raise

    # Structured audit record; retained with the function's CloudWatch log group.
    actor = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("principalId", "anonymous")
    )
    logger.info(
        json.dumps(
            {
                "audit": "access_control_change",
                "actor": actor,
                "subject": user_id,
                "before": sorted(previous.get("permissions", [])),
                "after": sorted(permissions),
                "at": _now(),
            }
        )
    )
    put_metric(cloudwatch, f"{NAMESPACE}/Governance", "AccessControlChanged", 1)

    return json_response(200, {"accessControl": result["Attributes"]})


@router.route("GET", "/governance-metrics")
def get_governance_metrics(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    metric_id = params.get("metricId")
    start_key = decode_page_token(params.get("nextToken"))

    if metric_id:
        kwargs: Dict[str, Any] = {
            "KeyConditionExpression": Key("metricId").eq(metric_id),
            "ScanIndexForward": False,
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = GOVERNANCE_METRICS_TABLE.query(**kwargs)
    else:
        kwargs = {}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = GOVERNANCE_METRICS_TABLE.scan(**kwargs)

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("GET", "/bias-detections")
def get_bias_detections(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    model_component = params.get("modelComponent")
    start_key = decode_page_token(params.get("nextToken"))

    if model_component:
        kwargs: Dict[str, Any] = {
            "IndexName": "ModelIndex",
            "KeyConditionExpression": Key("modelComponent").eq(model_component),
            "ScanIndexForward": False,
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = BIAS_DETECTIONS_TABLE.query(**kwargs)
    else:
        kwargs = {}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = BIAS_DETECTIONS_TABLE.scan(**kwargs)

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return router.dispatch(event)
