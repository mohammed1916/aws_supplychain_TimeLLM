"""Data-platform service: KPIs, operational metrics, and data-source registry.

Routes:
    GET /kpis                  latest KPI snapshot per kpiId (?kpiId= for history)
    GET /metrics               metric points, newest first (?metricId= to filter)
    GET /data-sources          registered ingestion sources (?type= via TypeIndex)
    PUT /data-sources/{id}     update a data source's status / sync metadata

Environment:
    KPIS_TABLE, METRICS_TABLE, DATA_SOURCES_TABLE   DynamoDB table names
"""

import logging
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
    require_env,
)

logger = logging.getLogger()

dynamodb = boto3.resource("dynamodb")

KPIS_TABLE = dynamodb.Table(require_env("KPIS_TABLE"))
METRICS_TABLE = dynamodb.Table(require_env("METRICS_TABLE"))
DATA_SOURCES_TABLE = dynamodb.Table(require_env("DATA_SOURCES_TABLE"))

VALID_SOURCE_STATUSES = ("active", "processing", "error", "idle")
MUTABLE_SOURCE_FIELDS = ("status", "lastSync", "recordsProcessed", "dataQuality", "name")

router = Router()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.route("GET", "/kpis")
def get_kpis(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    kpi_id = params.get("kpiId")

    if kpi_id:
        # Full history for one KPI, newest first (timestamp is the sort key).
        result = KPIS_TABLE.query(
            KeyConditionExpression=Key("kpiId").eq(kpi_id),
            ScanIndexForward=False,
        )
        return json_response(
            200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
        )

    # Dashboard view: latest datapoint per KPI series.
    result = KPIS_TABLE.scan()
    latest: Dict[str, Dict[str, Any]] = {}
    for item in result.get("Items", []):
        current = latest.get(item["kpiId"])
        if current is None or item.get("timestamp", "") > current.get("timestamp", ""):
            latest[item["kpiId"]] = item
    items = sorted(latest.values(), key=lambda i: i["kpiId"])
    return json_response(200, list_response_body(items))


@router.route("GET", "/metrics")
def get_metrics(event: Dict[str, Any]) -> Dict[str, Any]:
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
        result = METRICS_TABLE.query(**kwargs)
    else:
        kwargs = {}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = METRICS_TABLE.scan(**kwargs)

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("GET", "/data-sources")
def get_data_sources(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    source_type = params.get("type")

    if source_type:
        result = DATA_SOURCES_TABLE.query(
            IndexName="TypeIndex",
            KeyConditionExpression=Key("sourceType").eq(source_type),
        )
    else:
        result = DATA_SOURCES_TABLE.scan()

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("PUT", "/data-sources/{source_id}")
def update_data_source(event: Dict[str, Any], source_id: str) -> Dict[str, Any]:
    body = parse_body(event)

    updates = {k: body[k] for k in MUTABLE_SOURCE_FIELDS if k in body}
    if not updates:
        raise ValidationError(
            f"No updatable fields provided; allowed: {', '.join(MUTABLE_SOURCE_FIELDS)}"
        )
    if "status" in updates and updates["status"] not in VALID_SOURCE_STATUSES:
        raise ValidationError(
            f"status must be one of: {', '.join(VALID_SOURCE_STATUSES)}"
        )

    updates["updatedAt"] = _now()
    expression = "SET " + ", ".join(f"#f{i} = :v{i}" for i in range(len(updates)))
    names = {f"#f{i}": field for i, field in enumerate(updates)}
    values = {f":v{i}": value for i, value in enumerate(updates.values())}

    try:
        result = DATA_SOURCES_TABLE.update_item(
            Key={"sourceId": source_id},
            UpdateExpression=expression,
            ConditionExpression="attribute_exists(sourceId)",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(f"Data source {source_id} not found") from exc
        raise

    return json_response(200, {"dataSource": result["Attributes"]})


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return router.dispatch(event)
