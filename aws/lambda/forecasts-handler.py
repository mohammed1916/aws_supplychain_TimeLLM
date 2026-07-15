"""Forecasts service.

Routes:
    GET  /forecasts               list forecasts (Query on ProductIndex when
                                  productId is given, paginated Scan otherwise)
    POST /forecasts               generate a forecast via the SageMaker TimeLLM
                                  endpoint and persist it
    PUT  /forecasts/{id}          update forecast status
    POST /sagemaker/inference     direct model inference without persistence

Environment:
    FORECASTS_TABLE      DynamoDB table name (injected by CloudFormation)
    SAGEMAKER_ENDPOINT   TimeLLM endpoint name; optional — POST routes return
                         503 when unset so read paths keep working
    METRICS_NAMESPACE    CloudWatch namespace prefix (default "TimeWise")
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from common import (
    ApiError,
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
sagemaker_runtime = boto3.client("sagemaker-runtime")
cloudwatch = boto3.client("cloudwatch")

FORECASTS_TABLE = dynamodb.Table(require_env("FORECASTS_TABLE"))
SAGEMAKER_ENDPOINT = os.environ.get("SAGEMAKER_ENDPOINT", "")
NAMESPACE = os.environ.get("METRICS_NAMESPACE", "TimeWise")

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200
MAX_FORECAST_HORIZON = 24

router = Router()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _page_size(params: Dict[str, str]) -> int:
    try:
        limit = int(params.get("limit", DEFAULT_PAGE_SIZE))
    except ValueError as exc:
        raise ValidationError("limit must be an integer") from exc
    if not 1 <= limit <= MAX_PAGE_SIZE:
        raise ValidationError(f"limit must be between 1 and {MAX_PAGE_SIZE}")
    return limit


@router.route("GET", "/forecasts")
def get_forecasts(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    product_id = params.get("productId")
    limit = _page_size(params)
    start_key = decode_page_token(params.get("nextToken"))

    if product_id:
        kwargs: Dict[str, Any] = {
            "IndexName": "ProductIndex",
            "KeyConditionExpression": Key("productId").eq(product_id),
            "ScanIndexForward": False,  # newest first via createdAt sort key
            "Limit": limit,
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = FORECASTS_TABLE.query(**kwargs)
    else:
        kwargs = {"Limit": limit}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = FORECASTS_TABLE.scan(**kwargs)

    items = result.get("Items", [])
    put_metric(cloudwatch, f"{NAMESPACE}/API", "ForecastsRetrieved", len(items))
    return json_response(
        200, list_response_body(items, result.get("LastEvaluatedKey"))
    )


def _invoke_timellm(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not SAGEMAKER_ENDPOINT:
        raise ApiError(503, "Forecasting model endpoint is not configured")
    try:
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=SAGEMAKER_ENDPOINT,
            ContentType="application/json",
            Accept="application/json",
            Body=json.dumps(payload),
        )
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in ("ValidationError", "ModelNotReadyException"):
            raise ApiError(503, f"Model endpoint unavailable: {code}") from exc
        raise
    try:
        return json.loads(response["Body"].read().decode(), parse_float=Decimal)
    except (json.JSONDecodeError, KeyError) as exc:
        raise ApiError(502, "Model returned a malformed response") from exc


def _validate_inference_input(body: Dict[str, Any]) -> Dict[str, Any]:
    require_fields(body, "productId", "historicalData")
    historical: List[Any] = body["historicalData"]
    if not isinstance(historical, list) or not historical:
        raise ValidationError("historicalData must be a non-empty array")
    horizon = body.get("forecastHorizon", 6)
    if not isinstance(horizon, (int, Decimal)) or not 1 <= int(horizon) <= MAX_FORECAST_HORIZON:
        raise ValidationError(
            f"forecastHorizon must be an integer between 1 and {MAX_FORECAST_HORIZON}"
        )
    return {
        "historical_data": historical,
        "forecast_horizon": int(horizon),
        "product_id": body["productId"],
        "external_factors": body.get("externalFactors", {}),
    }


@router.route("POST", "/forecasts")
def create_forecast(event: Dict[str, Any]) -> Dict[str, Any]:
    body = parse_body(event)
    payload = _validate_inference_input(body)
    result = _invoke_timellm(payload)

    forecast_item = {
        "forecastId": f"fc-{uuid.uuid4()}",
        "productId": body["productId"],
        "predictions": result.get("predictions", []),
        "confidence": result.get("confidence"),
        "modelVersion": result.get("modelVersion", "unknown"),
        "status": "active",
        "createdAt": _now(),
    }
    if result.get("accuracy") is not None:
        forecast_item["accuracy"] = result["accuracy"]

    FORECASTS_TABLE.put_item(Item=forecast_item)

    put_metric(cloudwatch, f"{NAMESPACE}/ML", "ForecastGenerated", 1)
    if forecast_item.get("accuracy") is not None:
        put_metric(
            cloudwatch,
            f"{NAMESPACE}/ML",
            "ForecastAccuracy",
            float(forecast_item["accuracy"]),
            unit="Percent",
        )

    return json_response(201, {"forecast": forecast_item})


@router.route("PUT", "/forecasts/{forecast_id}")
def update_forecast(event: Dict[str, Any], forecast_id: str) -> Dict[str, Any]:
    body = parse_body(event)
    status = body.get("status")
    if status not in ("active", "superseded", "archived"):
        raise ValidationError("status must be one of: active, superseded, archived")

    try:
        result = FORECASTS_TABLE.update_item(
            Key={"forecastId": forecast_id},
            UpdateExpression="SET #status = :status, updatedAt = :updated",
            ConditionExpression="attribute_exists(forecastId)",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":status": status, ":updated": _now()},
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(f"Forecast {forecast_id} not found") from exc
        raise

    return json_response(200, {"forecast": result["Attributes"]})


@router.route("POST", "/sagemaker/inference")
def direct_inference(event: Dict[str, Any]) -> Dict[str, Any]:
    """Model inference without persistence, for what-if exploration in the UI."""
    body = parse_body(event)
    payload = _validate_inference_input(body)
    result = _invoke_timellm(payload)
    put_metric(cloudwatch, f"{NAMESPACE}/ML", "DirectInference", 1)
    return json_response(200, result)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return router.dispatch(event)
