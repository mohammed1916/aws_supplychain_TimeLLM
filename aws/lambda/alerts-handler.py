"""Alerts service.

Dual-trigger handler:
  1. API Gateway (Lambda proxy) for the /alerts and /inventory-alerts resources.
  2. EventBridge "CloudWatch Alarm State Change" events, which are converted
     into alert records and, when critical, published to SNS.

Routes:
    GET  /alerts                            list alerts (Query on
                                            CategoryTimeIndex when ?category=)
    POST /alerts                            create an alert
    POST /alerts/{id}/acknowledge           acknowledge an alert
    GET  /inventory-alerts                  list inventory alerts (Query on
                                            ProductSeverityIndex when ?productId=)
    POST /inventory-alerts/{id}/acknowledge acknowledge an inventory alert

Environment:
    ALERTS_TABLE, INVENTORY_ALERTS_TABLE   DynamoDB table names
    SNS_TOPIC_ARN                          critical-alert topic; optional —
                                           publishing is skipped with a warning
                                           when unset
    METRICS_NAMESPACE                      CloudWatch namespace prefix
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

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
    require_fields,
)

logger = logging.getLogger()

dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")
sns = boto3.client("sns")

ALERTS_TABLE = dynamodb.Table(require_env("ALERTS_TABLE"))
INVENTORY_ALERTS_TABLE = dynamodb.Table(require_env("INVENTORY_ALERTS_TABLE"))
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")
NAMESPACE = os.environ.get("METRICS_NAMESPACE", "TimeWise")

VALID_TYPES = ("info", "warning", "critical")
CATEGORY_KEYWORDS = {
    "inventory": ("inventory", "stock"),
    "demand": ("demand", "forecast"),
    "supply": ("supply", "supplier"),
    "security": ("security", "access"),
}

router = Router()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Alerts -----------------------------------------------------------------


@router.route("GET", "/alerts")
def get_alerts(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    start_key = decode_page_token(params.get("nextToken"))
    category = params.get("category")

    if category:
        kwargs: Dict[str, Any] = {
            "IndexName": "CategoryTimeIndex",
            "KeyConditionExpression": Key("category").eq(category),
            "ScanIndexForward": False,  # newest first
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = ALERTS_TABLE.query(**kwargs)
    else:
        kwargs = {}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = ALERTS_TABLE.scan(**kwargs)

    items = sorted(
        result.get("Items", []), key=lambda a: a.get("timestamp", ""), reverse=True
    )
    unacknowledged = sum(1 for a in items if not a.get("acknowledged"))
    return json_response(
        200,
        list_response_body(
            items, result.get("LastEvaluatedKey"), unacknowledged=unacknowledged
        ),
    )


def _store_alert(data: Dict[str, Any]) -> Dict[str, Any]:
    alert_type = data.get("type", "info")
    if alert_type not in VALID_TYPES:
        raise ValidationError(f"type must be one of: {', '.join(VALID_TYPES)}")

    alert_item = {
        "alertId": f"al-{uuid.uuid4()}",
        "type": alert_type,
        "category": data.get("category", "system"),
        "title": data["title"],
        "message": data.get("message", ""),
        "timestamp": _now(),
        "source": data.get("source", "System"),
        "acknowledged": False,
        "actionRequired": bool(data.get("actionRequired", False)),
        "metadata": data.get("metadata", {}),
    }
    ALERTS_TABLE.put_item(Item=alert_item)
    put_metric(
        cloudwatch,
        f"{NAMESPACE}/Alerts",
        "AlertsCreated",
        1,
        dimensions={"AlertType": alert_item["type"], "Category": alert_item["category"]},
    )
    return alert_item


@router.route("POST", "/alerts")
def create_alert(event: Dict[str, Any]) -> Dict[str, Any]:
    body = parse_body(event)
    require_fields(body, "title")
    alert_item = _store_alert(body)
    return json_response(201, {"alert": alert_item})


@router.route("POST", "/alerts/{alert_id}/acknowledge")
def acknowledge_alert(event: Dict[str, Any], alert_id: str) -> Dict[str, Any]:
    return json_response(200, {"alert": _acknowledge(ALERTS_TABLE, "alertId", alert_id)})


# --- Inventory alerts ---------------------------------------------------------


@router.route("GET", "/inventory-alerts")
def get_inventory_alerts(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    start_key = decode_page_token(params.get("nextToken"))
    product_id = params.get("productId")

    if product_id:
        kwargs: Dict[str, Any] = {
            "IndexName": "ProductSeverityIndex",
            "KeyConditionExpression": Key("productId").eq(product_id),
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = INVENTORY_ALERTS_TABLE.query(**kwargs)
    else:
        kwargs = {}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = INVENTORY_ALERTS_TABLE.scan(**kwargs)

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("POST", "/inventory-alerts/{alert_id}/acknowledge")
def acknowledge_inventory_alert(event: Dict[str, Any], alert_id: str) -> Dict[str, Any]:
    return json_response(
        200, {"alert": _acknowledge(INVENTORY_ALERTS_TABLE, "alertId", alert_id)}
    )


def _acknowledge(table: Any, key_name: str, key_value: str) -> Dict[str, Any]:
    try:
        result = table.update_item(
            Key={key_name: key_value},
            UpdateExpression="SET acknowledged = :ack, acknowledgedAt = :time",
            ConditionExpression=f"attribute_exists({key_name})",
            ExpressionAttributeValues={":ack": True, ":time": _now()},
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(f"Alert {key_value} not found") from exc
        raise
    return result["Attributes"]


# --- CloudWatch alarm intake (EventBridge) ------------------------------------


def _determine_category(alarm_name: str) -> str:
    lowered = alarm_name.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return "system"


def _handle_alarm_event(event: Dict[str, Any]) -> Dict[str, Any]:
    detail = event.get("detail", {})
    alarm_name = detail.get("alarmName", "unknown-alarm")
    state = detail.get("state", {})

    if state.get("value") != "ALARM":
        logger.info("Ignoring alarm %s in state %s", alarm_name, state.get("value"))
        return {"statusCode": 200}

    alert_item = _store_alert(
        {
            "type": "critical" if "critical" in alarm_name.lower() else "warning",
            "category": _determine_category(alarm_name),
            "title": f"CloudWatch Alarm: {alarm_name}",
            "message": state.get("reason", "Alarm threshold breached"),
            "source": "AWS CloudWatch",
            "actionRequired": True,
            "metadata": {
                "alarmName": alarm_name,
                "region": event.get("region", ""),
                "accountId": event.get("account", ""),
            },
        }
    )

    if alert_item["type"] == "critical":
        if SNS_TOPIC_ARN:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"TimeWise Critical Alert: {alert_item['title']}"[:100],
                Message=json.dumps(
                    {
                        "title": alert_item["title"],
                        "message": alert_item["message"],
                        "category": alert_item["category"],
                        "timestamp": alert_item["timestamp"],
                    }
                ),
            )
        else:
            logger.warning(
                "SNS_TOPIC_ARN not configured; skipping notification for %s", alarm_name
            )

    return {"statusCode": 200}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if event.get("source") == "aws.cloudwatch":
        return _handle_alarm_event(event)
    return router.dispatch(event)
