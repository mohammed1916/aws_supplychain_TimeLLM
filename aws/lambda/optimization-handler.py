"""Optimization service: what-if scenarios and inventory recommendations.

Routes:
    GET  /optimization-scenarios                list scenarios
    POST /optimization-scenarios/{id}/run      start a scenario run
    GET  /inventory-optimizations              list inventory recommendations
    POST /inventory-optimizations/{id}/apply   mark a recommendation as applied

Environment:
    SCENARIOS_TABLE, INVENTORY_OPTIMIZATIONS_TABLE   DynamoDB table names
    STATE_MACHINE_ARN   optional Step Functions state machine that executes
                        scenario runs; when unset, runs are recorded as
                        "queued" for an external worker to pick up
    METRICS_NAMESPACE   CloudWatch namespace prefix
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from common import (
    NotFoundError,
    Router,
    decode_page_token,
    json_response,
    list_response_body,
    put_metric,
    require_env,
)

logger = logging.getLogger()

dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")
stepfunctions = boto3.client("stepfunctions")

SCENARIOS_TABLE = dynamodb.Table(require_env("SCENARIOS_TABLE"))
INVENTORY_OPTIMIZATIONS_TABLE = dynamodb.Table(
    require_env("INVENTORY_OPTIMIZATIONS_TABLE")
)
STATE_MACHINE_ARN = os.environ.get("STATE_MACHINE_ARN", "")
NAMESPACE = os.environ.get("METRICS_NAMESPACE", "TimeWise")

router = Router()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.route("GET", "/optimization-scenarios")
def get_scenarios(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    kwargs: Dict[str, Any] = {}
    start_key = decode_page_token(params.get("nextToken"))
    if start_key:
        kwargs["ExclusiveStartKey"] = start_key
    result = SCENARIOS_TABLE.scan(**kwargs)
    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("POST", "/optimization-scenarios/{scenario_id}/run")
def run_scenario(event: Dict[str, Any], scenario_id: str) -> Dict[str, Any]:
    run_id = f"run-{uuid.uuid4()}"

    # Scenario runs are long-lived, so the API only records intent and hands
    # execution to Step Functions; synchronous solving would exceed both the
    # API Gateway 29 s limit and sensible Lambda timeouts.
    if STATE_MACHINE_ARN:
        stepfunctions.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            name=run_id,
            input=json.dumps({"scenarioId": scenario_id, "runId": run_id}),
        )
        status = "running"
    else:
        logger.warning(
            "STATE_MACHINE_ARN not configured; scenario %s queued without executor",
            scenario_id,
        )
        status = "queued"

    try:
        result = SCENARIOS_TABLE.update_item(
            Key={"scenarioId": scenario_id},
            UpdateExpression=(
                "SET #status = :status, lastRunId = :run, lastRunAt = :at, "
                "updatedAt = :at"
            ),
            ConditionExpression="attribute_exists(scenarioId)",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": status,
                ":run": run_id,
                ":at": _now(),
            },
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(f"Scenario {scenario_id} not found") from exc
        raise

    put_metric(
        cloudwatch,
        f"{NAMESPACE}/Operations",
        "OptimizationRunStarted",
        1,
        dimensions={"Status": status},
    )
    return json_response(202, {"scenario": result["Attributes"]})


@router.route("GET", "/inventory-optimizations")
def get_inventory_optimizations(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get("queryStringParameters") or {}
    kwargs: Dict[str, Any] = {}
    start_key = decode_page_token(params.get("nextToken"))
    if start_key:
        kwargs["ExclusiveStartKey"] = start_key
    result = INVENTORY_OPTIMIZATIONS_TABLE.scan(**kwargs)
    return json_response(
        200, list_response_body(result.get("Items", []), result.get("LastEvaluatedKey"))
    )


@router.route("POST", "/inventory-optimizations/{optimization_id}/apply")
def apply_optimization(event: Dict[str, Any], optimization_id: str) -> Dict[str, Any]:
    try:
        result = INVENTORY_OPTIMIZATIONS_TABLE.update_item(
            Key={"optimizationId": optimization_id},
            UpdateExpression="SET #status = :status, appliedAt = :at",
            # Idempotency guard: only a 'proposed' recommendation can be applied.
            ConditionExpression="attribute_exists(optimizationId) AND #status = :proposed",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "applied",
                ":proposed": "proposed",
                ":at": _now(),
            },
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise NotFoundError(
                f"Optimization {optimization_id} not found or already applied"
            ) from exc
        raise

    put_metric(cloudwatch, f"{NAMESPACE}/Operations", "OptimizationApplied", 1)
    return json_response(200, {"optimization": result["Attributes"]})


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return router.dispatch(event)
