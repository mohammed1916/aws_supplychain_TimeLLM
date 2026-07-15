"""Unit tests for the forecasts service against in-memory AWS fakes."""

import io
import json
import unittest

from .support import FakeTable, RecordingClient, api_event, load_handler

ENV = {
    "FORECASTS_TABLE": "forecasts-test",
    "SAGEMAKER_ENDPOINT": "timellm-test",
    "METRICS_NAMESPACE": "TimeWise",
}


def sagemaker_response(payload):
    return {"Body": io.BytesIO(json.dumps(payload).encode())}


class ForecastsHandlerTests(unittest.TestCase):
    def load(self, env=None, items=None, sagemaker=None):
        tables = {"forecasts-test": FakeTable(items or [])}
        clients = {}
        if sagemaker is not None:
            clients["sagemaker-runtime"] = sagemaker
        module, tables, clients = load_handler(
            "forecasts-handler.py", env or ENV, tables, clients
        )
        return module, tables["forecasts-test"], clients

    def test_get_with_product_id_queries_product_index(self):
        module, table, _ = self.load(
            items=[
                {"forecastId": "fc-1", "productId": "p-1"},
                {"forecastId": "fc-2", "productId": "p-2"},
            ]
        )
        response = module.lambda_handler(
            api_event("GET", "/forecasts", query={"productId": "p-1"}), None
        )
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["items"][0]["forecastId"], "fc-1")
        method, kwargs = table.calls[0]
        self.assertEqual(method, "query")
        self.assertEqual(kwargs["IndexName"], "ProductIndex")

    def test_get_rejects_out_of_range_limit(self):
        module, _, _ = self.load()
        response = module.lambda_handler(
            api_event("GET", "/forecasts", query={"limit": "9999"}), None
        )
        self.assertEqual(response["statusCode"], 400)

    def test_post_requires_fields(self):
        module, _, _ = self.load()
        response = module.lambda_handler(
            api_event("POST", "/forecasts", body=json.dumps({"productId": "p-1"})), None
        )
        self.assertEqual(response["statusCode"], 400)
        self.assertIn("historicalData", json.loads(response["body"])["error"])

    def test_post_without_endpoint_returns_503(self):
        env = dict(ENV, SAGEMAKER_ENDPOINT="")
        module, _, _ = self.load(env=env)
        response = module.lambda_handler(
            api_event(
                "POST",
                "/forecasts",
                body=json.dumps({"productId": "p-1", "historicalData": [{"demand": 1}]}),
            ),
            None,
        )
        self.assertEqual(response["statusCode"], 503)

    def test_post_persists_model_output(self):
        sagemaker = RecordingClient(
            {
                "invoke_endpoint": sagemaker_response(
                    {
                        "predictions": [{"period": "2026-08", "demand": 120}],
                        "confidence": 0.91,
                        "modelVersion": "timellm-v2",
                    }
                )
            }
        )
        module, table, _ = self.load(sagemaker=sagemaker)
        response = module.lambda_handler(
            api_event(
                "POST",
                "/forecasts",
                body=json.dumps(
                    {
                        "productId": "p-1",
                        "historicalData": [{"period": "2026-07", "demand": 100}],
                        "forecastHorizon": 3,
                    }
                ),
            ),
            None,
        )
        self.assertEqual(response["statusCode"], 201)
        forecast = json.loads(response["body"])["forecast"]
        self.assertEqual(forecast["modelVersion"], "timellm-v2")
        self.assertEqual(forecast["status"], "active")
        self.assertTrue(forecast["forecastId"].startswith("fc-"))
        # Persisted to the table, and the model got the translated payload.
        self.assertEqual(len(table.items), 1)
        sent = json.loads(sagemaker.calls_to("invoke_endpoint")[0]["Body"])
        self.assertEqual(sent["forecast_horizon"], 3)
        self.assertEqual(sent["product_id"], "p-1")

    def test_post_rejects_bad_horizon(self):
        module, _, _ = self.load()
        response = module.lambda_handler(
            api_event(
                "POST",
                "/forecasts",
                body=json.dumps(
                    {
                        "productId": "p-1",
                        "historicalData": [{"demand": 1}],
                        "forecastHorizon": 99,
                    }
                ),
            ),
            None,
        )
        self.assertEqual(response["statusCode"], 400)

    def test_put_unknown_forecast_returns_404(self):
        module, _, _ = self.load()
        response = module.lambda_handler(
            api_event("PUT", "/forecasts/fc-missing", body=json.dumps({"status": "archived"})),
            None,
        )
        self.assertEqual(response["statusCode"], 404)

    def test_put_rejects_unknown_status(self):
        module, _, _ = self.load(items=[{"forecastId": "fc-1"}])
        response = module.lambda_handler(
            api_event("PUT", "/forecasts/fc-1", body=json.dumps({"status": "bogus"})), None
        )
        self.assertEqual(response["statusCode"], 400)

    def test_direct_inference_does_not_persist(self):
        sagemaker = RecordingClient(
            {"invoke_endpoint": sagemaker_response({"predictions": [], "confidence": 0.8})}
        )
        module, table, _ = self.load(sagemaker=sagemaker)
        response = module.lambda_handler(
            api_event(
                "POST",
                "/sagemaker/inference",
                body=json.dumps({"productId": "p-1", "historicalData": [{"demand": 1}]}),
            ),
            None,
        )
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(len(table.items), 0)


if __name__ == "__main__":
    unittest.main()
