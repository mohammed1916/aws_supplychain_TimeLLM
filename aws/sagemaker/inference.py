"""SageMaker inference handler for the TimeLLM demand-forecasting endpoint.

Implements the four-function contract of the SageMaker PyTorch serving stack
(model_fn / input_fn / predict_fn / output_fn). The model artifact
(model.tar.gz) is produced by the TimeLLM training pipeline and must contain:

    model.pt        TorchScript-compiled TimeLLM checkpoint
    config.json     {"model_version": "...", "context_length": N,
                     "quantiles": [0.1, 0.5, 0.9]}

Request contract (mirrors aws/lambda/forecasts-handler.py):
    {"historical_data": [{"period": "2026-06", "demand": 1234}, ...],
     "forecast_horizon": 6,
     "product_id": "p-1",
     "external_factors": {...}}

Response contract:
    {"predictions": [{"period": "2026-07", "demand": 1290,
                      "lower": 1150, "upper": 1420}, ...],
     "confidence": 0.9,
     "modelVersion": "timellm-v2"}
"""

import json
import os
from typing import Any, Dict, List

import torch

JSON_CONTENT_TYPE = "application/json"


def model_fn(model_dir: str) -> Dict[str, Any]:
    """Load the TorchScript checkpoint and its serving configuration."""
    with open(os.path.join(model_dir, "config.json")) as f:
        config = json.load(f)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = torch.jit.load(os.path.join(model_dir, "model.pt"), map_location=device)
    model.eval()

    return {"model": model, "config": config, "device": device}


def input_fn(request_body: str, content_type: str = JSON_CONTENT_TYPE) -> Dict[str, Any]:
    if content_type != JSON_CONTENT_TYPE:
        raise ValueError(f"Unsupported content type: {content_type}")
    payload = json.loads(request_body)

    history = payload.get("historical_data") or []
    if not history:
        raise ValueError("historical_data must be a non-empty array")
    horizon = int(payload.get("forecast_horizon", 6))
    if not 1 <= horizon <= 24:
        raise ValueError("forecast_horizon must be between 1 and 24")

    return {
        "series": [float(point["demand"]) for point in history],
        "periods": [str(point.get("period", "")) for point in history],
        "horizon": horizon,
    }


def _next_periods(last_period: str, horizon: int) -> List[str]:
    """Continue a YYYY-MM period sequence; fall back to step indices."""
    try:
        year, month = (int(part) for part in last_period.split("-")[:2])
    except (ValueError, AttributeError):
        return [f"t+{i}" for i in range(1, horizon + 1)]
    periods = []
    for _ in range(horizon):
        month += 1
        if month > 12:
            month, year = 1, year + 1
        periods.append(f"{year:04d}-{month:02d}")
    return periods


def predict_fn(data: Dict[str, Any], model_artifacts: Dict[str, Any]) -> Dict[str, Any]:
    model = model_artifacts["model"]
    config = model_artifacts["config"]
    device = model_artifacts["device"]

    context_length = int(config.get("context_length", 96))
    series = data["series"][-context_length:]

    # TimeLLM consumes a (batch, context) float tensor and emits quantile
    # forecasts shaped (batch, horizon, num_quantiles) — [lower, median, upper].
    inputs = torch.tensor([series], dtype=torch.float32, device=device)
    with torch.inference_mode():
        quantile_output = model(inputs, data["horizon"])
    forecast = quantile_output[0].cpu().tolist()  # (horizon, 3)

    periods = _next_periods(data["periods"][-1] if data["periods"] else "", data["horizon"])
    predictions = [
        {
            "period": period,
            "demand": round(median, 2),
            "lower": round(lower, 2),
            "upper": round(upper, 2),
        }
        for period, (lower, median, upper) in zip(periods, forecast)
    ]

    quantiles = config.get("quantiles", [0.1, 0.5, 0.9])
    return {
        "predictions": predictions,
        # The nominal coverage of the emitted interval, e.g. 0.9 - 0.1 = 0.8.
        "confidence": round(float(quantiles[-1]) - float(quantiles[0]), 4),
        "modelVersion": config.get("model_version", "timellm-unknown"),
    }


def output_fn(prediction: Dict[str, Any], accept: str = JSON_CONTENT_TYPE) -> str:
    if accept not in (JSON_CONTENT_TYPE, "*/*"):
        raise ValueError(f"Unsupported accept type: {accept}")
    return json.dumps(prediction)
