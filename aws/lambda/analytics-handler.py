"""Analytics service: reports and AI-generated insights.

Routes:
    GET  /reports                    list reports, newest first
    POST /reports/{id}/generate      render a report snapshot to S3 and return
                                     a presigned download URL
    GET  /analytics-insights         list insights (?category= via CategoryTimeIndex)

Environment:
    REPORTS_TABLE, INSIGHTS_TABLE   DynamoDB table names
    REPORTS_BUCKET                  S3 bucket for rendered report artifacts;
                                    optional — generation returns 503 when unset
    PRESIGNED_URL_TTL_SECONDS       download link validity (default 3600)
    METRICS_NAMESPACE               CloudWatch namespace prefix
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from common import (
    ApiError,
    NotFoundError,
    Router,
    _to_serializable,
    decode_page_token,
    json_response,
    list_response_body,
    put_metric,
    require_env,
)

logger = logging.getLogger()

dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")
s3 = boto3.client("s3")

REPORTS_TABLE = dynamodb.Table(require_env("REPORTS_TABLE"))
INSIGHTS_TABLE = dynamodb.Table(require_env("INSIGHTS_TABLE"))
REPORTS_BUCKET = os.environ.get("REPORTS_BUCKET", "")
PRESIGNED_URL_TTL = int(os.environ.get("PRESIGNED_URL_TTL_SECONDS", "3600"))
NAMESPACE = os.environ.get("METRICS_NAMESPACE", "TimeWise")

router = Router()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.route("GET", "/reports")
def get_reports(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    kwargs: Dict[str, Any] = {}
    start_key = decode_page_token(params.get("nextToken"))
    if start_key:
        kwargs["ExclusiveStartKey"] = start_key
    result = REPORTS_TABLE.scan(**kwargs)
    items = sorted(
        result.get("Items", []), key=lambda r: r.get("createdAt", ""), reverse=True
    )
    return json_response(
        200, list_response_body(items, result.get("LastEvaluatedKey"))
    )


@router.route("POST", "/reports/{report_id}/generate")
def generate_report(event: Dict[str, Any], report_id: str) -> Dict[str, Any]:
    if not REPORTS_BUCKET:
        raise ApiError(503, "Report storage bucket is not configured")

    report = REPORTS_TABLE.get_item(Key={"reportId": report_id}).get("Item")
    if not report:
        raise NotFoundError(f"Report {report_id} not found")

    generated_at = _now()
    object_key = f"reports/{report_id}/{generated_at}.json"

    # Render the report artifact. The snapshot embeds the report definition;
    # heavier formats (PDF/XLSX) would be produced by a dedicated renderer
    # behind the same contract: write to S3, hand back a presigned URL.
    artifact = {
        "reportId": report_id,
        "title": report.get("title", ""),
        "reportType": report.get("reportType", "operational"),
        "generatedAt": generated_at,
        "definition": _to_serializable(report),
    }
    s3.put_object(
        Bucket=REPORTS_BUCKET,
        Key=object_key,
        Body=json.dumps(artifact).encode(),
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )
    download_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": REPORTS_BUCKET, "Key": object_key},
        ExpiresIn=PRESIGNED_URL_TTL,
    )

    try:
        result = REPORTS_TABLE.update_item(
            Key={"reportId": report_id},
            UpdateExpression=(
                "SET #status = :status, generatedAt = :at, "
                "objectKey = :key, downloadUrl = :url"
            ),
            ConditionExpression="attribute_exists(reportId)",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "ready",
                ":at": generated_at,
                ":key": object_key,
                ":url": download_url,
            },
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(f"Report {report_id} not found") from exc
        raise

    put_metric(
        cloudwatch,
        f"{NAMESPACE}/Operations",
        "ReportGenerated",
        1,
        dimensions={"ReportType": str(report.get("reportType", "operational"))},
    )
    return json_response(200, {"report": result["Attributes"]})


@router.route("GET", "/analytics-insights")
def get_insights(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    category = params.get("category")
    start_key = decode_page_token(params.get("nextToken"))

    if category:
        kwargs: Dict[str, Any] = {
            "IndexName": "CategoryTimeIndex",
            "KeyConditionExpression": Key("category").eq(category),
            "ScanIndexForward": False,
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = INSIGHTS_TABLE.query(**kwargs)
    else:
        kwargs = {}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = INSIGHTS_TABLE.scan(**kwargs)

    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return router.dispatch(event)
