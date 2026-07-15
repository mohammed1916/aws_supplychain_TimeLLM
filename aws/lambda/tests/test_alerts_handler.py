"""Unit tests for the alerts service: HTTP routes and CloudWatch alarm intake."""

import json
import unittest

from .support import FakeTable, RecordingClient, api_event, load_handler

ENV = {
    "ALERTS_TABLE": "alerts-test",
    "INVENTORY_ALERTS_TABLE": "inventory-alerts-test",
    "SNS_TOPIC_ARN": "arn:aws:sns:us-east-1:123456789012:critical-test",
    "METRICS_NAMESPACE": "TimeWise",
}


def alarm_event(alarm_name, state="ALARM", reason="threshold breached"):
    return {
        "source": "aws.cloudwatch",
        "region": "us-east-1",
        "account": "123456789012",
        "detail": {"alarmName": alarm_name, "state": {"value": state, "reason": reason}},
    }


class AlertsHandlerTests(unittest.TestCase):
    def load(self, alerts=None, inventory=None):
        tables = {
            "alerts-test": FakeTable(alerts or []),
            "inventory-alerts-test": FakeTable(inventory or []),
        }
        module, tables, clients = load_handler("alerts-handler.py", ENV, tables, {})
        return module, tables, clients

    def test_get_alerts_sorts_and_counts_unacknowledged(self):
        module, tables, _ = self.load(
            alerts=[
                {"alertId": "a1", "timestamp": "2026-01-01", "acknowledged": True},
                {"alertId": "a2", "timestamp": "2026-03-01", "acknowledged": False},
                {"alertId": "a3", "timestamp": "2026-02-01", "acknowledged": False},
            ]
        )
        body = json.loads(module.lambda_handler(api_event("GET", "/alerts"), None)["body"])
        self.assertEqual([a["alertId"] for a in body["items"]], ["a2", "a3", "a1"])
        self.assertEqual(body["unacknowledged"], 2)

    def test_get_alerts_by_category_uses_gsi(self):
        module, tables, _ = self.load(
            alerts=[{"alertId": "a1", "category": "inventory", "timestamp": "t"}]
        )
        module.lambda_handler(api_event("GET", "/alerts", query={"category": "inventory"}), None)
        method, kwargs = tables["alerts-test"].calls[0]
        self.assertEqual(method, "query")
        self.assertEqual(kwargs["IndexName"], "CategoryTimeIndex")

    def test_create_alert_requires_title_and_valid_type(self):
        module, _, _ = self.load()
        no_title = module.lambda_handler(
            api_event("POST", "/alerts", body=json.dumps({"message": "x"})), None
        )
        self.assertEqual(no_title["statusCode"], 400)
        bad_type = module.lambda_handler(
            api_event("POST", "/alerts", body=json.dumps({"title": "t", "type": "panic"})), None
        )
        self.assertEqual(bad_type["statusCode"], 400)

    def test_acknowledge_missing_alert_returns_404(self):
        module, _, _ = self.load()
        response = module.lambda_handler(
            api_event("POST", "/alerts/a-missing/acknowledge"), None
        )
        self.assertEqual(response["statusCode"], 404)

    def test_acknowledge_inventory_alert_updates_row(self):
        module, tables, _ = self.load(
            inventory=[{"alertId": "ia-1", "acknowledged": False}]
        )
        response = module.lambda_handler(
            api_event("POST", "/inventory-alerts/ia-1/acknowledge"), None
        )
        self.assertEqual(response["statusCode"], 200)
        self.assertTrue(tables["inventory-alerts-test"].items[0]["acknowledged"])

    def test_category_classification_from_alarm_name(self):
        module, _, _ = self.load()
        cases = {
            "low-stock-warehouse-7": "inventory",
            "demand-forecast-drift": "demand",
            "supplier-sla-breach": "supply",
            "unauthorized-access-attempt": "security",
            "cpu-high": "system",
        }
        for alarm_name, expected in cases.items():
            self.assertEqual(module._determine_category(alarm_name), expected)

    def test_critical_alarm_creates_alert_and_publishes_sns(self):
        module, tables, clients = self.load()
        response = module.lambda_handler(alarm_event("critical-inventory-stockout"), None)
        self.assertEqual(response["statusCode"], 200)

        items = tables["alerts-test"].items
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["type"], "critical")
        self.assertEqual(items[0]["category"], "inventory")
        self.assertTrue(items[0]["actionRequired"])

        publishes = clients["sns"].calls_to("publish")
        self.assertEqual(len(publishes), 1)
        self.assertEqual(publishes[0]["TopicArn"], ENV["SNS_TOPIC_ARN"])

    def test_non_critical_alarm_skips_sns(self):
        module, tables, clients = self.load()
        module.lambda_handler(alarm_event("demand-forecast-drift"), None)
        self.assertEqual(tables["alerts-test"].items[0]["type"], "warning")
        self.assertEqual(clients["sns"].calls_to("publish"), [])

    def test_ok_state_alarm_is_ignored(self):
        module, tables, _ = self.load()
        module.lambda_handler(alarm_event("critical-x", state="OK"), None)
        self.assertEqual(tables["alerts-test"].items, [])


if __name__ == "__main__":
    unittest.main()
