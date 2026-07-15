"""Unit tests for the shared Lambda library (router, pagination, validation)."""

import json
import sys
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import common  # noqa: E402


class RouterTests(unittest.TestCase):
    def setUp(self):
        self.router = common.Router()

        @self.router.route("GET", "/things")
        def list_things(event):
            return common.json_response(200, {"items": []})

        @self.router.route("POST", "/things/{thing_id}/activate")
        def activate(event, thing_id):
            return common.json_response(200, {"activated": thing_id})

        @self.router.route("GET", "/boom")
        def boom(event):
            raise common.ValidationError("bad input")

        @self.router.route("GET", "/crash")
        def crash(event):
            raise RuntimeError("unexpected")

    def dispatch(self, method, path):
        return self.router.dispatch({"httpMethod": method, "path": path})

    def test_matches_static_route(self):
        self.assertEqual(self.dispatch("GET", "/things")["statusCode"], 200)

    def test_extracts_path_parameters(self):
        response = self.dispatch("POST", "/things/abc-123/activate")
        self.assertEqual(json.loads(response["body"]), {"activated": "abc-123"})

    def test_trailing_slash_matches(self):
        self.assertEqual(self.dispatch("GET", "/things/")["statusCode"], 200)

    def test_unknown_route_returns_404(self):
        self.assertEqual(self.dispatch("GET", "/nope")["statusCode"], 404)

    def test_wrong_method_returns_404(self):
        self.assertEqual(self.dispatch("PUT", "/things")["statusCode"], 404)

    def test_options_preflight_returns_204_with_cors(self):
        response = self.dispatch("OPTIONS", "/things")
        self.assertEqual(response["statusCode"], 204)
        self.assertIn("Access-Control-Allow-Origin", response["headers"])

    def test_api_error_maps_to_status(self):
        response = self.dispatch("GET", "/boom")
        self.assertEqual(response["statusCode"], 400)
        self.assertEqual(json.loads(response["body"])["error"], "bad input")

    def test_unhandled_error_is_sanitized_500(self):
        response = self.dispatch("GET", "/crash")
        self.assertEqual(response["statusCode"], 500)
        self.assertNotIn("unexpected", response["body"])


class SerializationTests(unittest.TestCase):
    def test_decimals_become_numbers(self):
        body = json.loads(
            common.json_response(200, {"int": Decimal("3"), "float": Decimal("3.5")})["body"]
        )
        self.assertEqual(body, {"int": 3, "float": 3.5})

    def test_parse_body_rejects_invalid_json(self):
        with self.assertRaises(common.ValidationError):
            common.parse_body({"body": "{not json"})

    def test_parse_body_rejects_non_object(self):
        with self.assertRaises(common.ValidationError):
            common.parse_body({"body": "[1, 2]"})

    def test_require_fields_lists_missing(self):
        with self.assertRaises(common.ValidationError) as ctx:
            common.require_fields({"a": 1, "b": ""}, "a", "b", "c")
        self.assertIn("b, c", str(ctx.exception))


class PaginationTests(unittest.TestCase):
    def test_token_round_trip(self):
        key = {"forecastId": "fc-1", "createdAt": "2026-01-01T00:00:00Z"}
        token = common.encode_page_token(key)
        self.assertEqual(common.decode_page_token(token), key)

    def test_empty_key_encodes_to_none(self):
        self.assertIsNone(common.encode_page_token(None))
        self.assertIsNone(common.decode_page_token(None))

    def test_invalid_token_raises_validation_error(self):
        with self.assertRaises(common.ValidationError):
            common.decode_page_token("!!not-base64!!")

    def test_list_response_includes_next_token_and_extras(self):
        body = common.list_response_body(
            [{"a": 1}], {"pk": "x"}, unacknowledged=3
        )
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["unacknowledged"], 3)
        self.assertIn("nextToken", body)


if __name__ == "__main__":
    unittest.main()
