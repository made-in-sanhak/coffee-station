import unittest
from unittest.mock import patch

try:
    from google.genai import types
except ImportError:
    types = None

from app.agent.tools import DECLARATIONS
from app.llm.base import ToolCall
from app.llm.gemini import GeminiModel


@unittest.skipIf(types is None, "Install requirements-notebook.txt for SDK adapter tests")
class GeminiAdapterTests(unittest.TestCase):
    def test_roundtrip_preserves_native_content_signature_and_call_id(self):
        model = GeminiModel(api_key="offline-test-placeholder", model="offline-test")
        native = types.Content(role="model", parts=[types.Part(
            function_call=types.FunctionCall(name="search_menus", args={}, id="call-1"),
            thought_signature=b"test-signature")])
        response = types.GenerateContentResponse(candidates=[types.Candidate(content=native)])
        try:
            with patch.object(model.client.models, "generate_content", return_value=response) as generate:
                first = model.generate("system", [{"role": "user", "text": "test"}], DECLARATIONS, 10)
                self.assertEqual(first.calls, (ToolCall("search_menus", {}, "call-1"),))
                model.generate("system", [
                    {"role": "user", "text": "test"}, {"role": "model", "reply": first},
                    {"role": "tool", "results": [{"call": first.calls[0],
                        "response": {"status": "ok", "items": []}}]},
                ], DECLARATIONS, 5)
                sent = generate.call_args.kwargs
                self.assertIs(sent["contents"][1], first.native)
                self.assertEqual(sent["contents"][2].role, "user")
                self.assertEqual(sent["contents"][1].parts[0].thought_signature, b"test-signature")
                self.assertEqual(sent["contents"][2].parts[0].function_response.id, "call-1")
                self.assertTrue(sent["config"].automatic_function_calling.disable)
                self.assertEqual(sent["config"].http_options.retry_options.attempts, 1)
                self.assertEqual(sent["config"].http_options.timeout, 5000)
        finally:
            model.close()

    def test_blocked_or_empty_response_is_error(self):
        model = GeminiModel(api_key="offline-test-placeholder", model="offline-test")
        try:
            with patch.object(model.client.models, "generate_content", return_value=types.GenerateContentResponse()):
                with self.assertRaises(ValueError):
                    model.generate("system", [], DECLARATIONS, 1)
        finally:
            model.close()
