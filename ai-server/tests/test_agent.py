import json
import unittest
from unittest.mock import patch

from app.agent.loop import run_turn
from app.agent.state import ConversationState
from app.llm.base import Reply, ScriptedModel, ToolCall
from app.repositories.base import Location, RepositoryError, SearchFilters
from app.repositories.mock import MockRepository


def tools(*calls):
    return Reply(calls=tuple(ToolCall(name, args) for name, args in calls))


def final(*ids):
    return Reply(text=json.dumps({"type": "RESULT", "offer_ids": list(ids)}))


class AgentTests(unittest.TestCase):
    def setUp(self):
        self.repo = MockRepository()
        self.filters = SearchFilters(origin=Location(37.63, 126.83), radius_m=500,
            max_price_krw=5000, sweetness="NOT_SWEET", sort_by="price")

    def run_script(self, replies, **kwargs):
        self.model = ScriptedModel(replies)
        return run_turn(self.model, self.repo, "임시 데이터 추천", constraints=self.filters, **kwargs)

    def test_observe_act_observe_and_canonical_price_order(self):
        result = self.run_script([
            tools(("search_cafes", {}), ("get_cafe_details", {"cafe_id": "mock-cafe-1"})),
            tools(("search_menus", {})), final("offer-2", "offer-6", "offer-1")])
        self.assertEqual(result.status, "RESULT")
        self.assertEqual([m.offer.price_krw for m in result.recommendations], [3000, 3500, 5000])
        self.assertEqual(result.llm_calls, 3)
        self.assertEqual(self.model.requests[1][-1]["role"], "tool")

    def test_relaxation_rejected_then_corrected(self):
        result = self.run_script([tools(("search_menus", {"max_price_krw": 6000})),
            tools(("search_menus", {})), final("offer-2")])
        self.assertEqual(result.status, "RESULT")
        self.assertEqual(result.trace[1]["code"], "INVALID_TOOL_CALL")

    def test_unknown_function_and_argument(self):
        result = self.run_script([tools(("execute_sql", {}), ("search_menus", {"sql": "SELECT 1"})),
            tools(("search_menus", {})), final("offer-1")])
        self.assertEqual(sum(t.get("code") == "INVALID_TOOL_CALL" for t in result.trace), 2)

    def test_hallucinated_id_rejected(self):
        result = self.run_script([tools(("search_menus", {})), final("invented"), final("offer-1")])
        self.assertEqual(result.status, "RESULT")
        self.assertIn({"event": "invalid_final"}, result.trace)

    def test_repeated_search_and_budget(self):
        result = self.run_script([tools(("search_menus", {}))] * 3, max_llm_calls=3)
        self.assertEqual(result.status, "LIMIT")
        self.assertEqual(result.llm_calls, 3)
        self.assertEqual(sum(t.get("code") == "INVALID_TOOL_CALL" for t in result.trace), 2)

    def test_tool_budget_with_multi_call_reply(self):
        result = self.run_script([tools(("search_menus", {}), ("search_cafes", {}))], max_tool_calls=1)
        self.assertEqual(result.status, "LIMIT")
        self.assertEqual(sum(t["event"] == "tool" for t in result.trace), 1)

    def test_empty_result_then_ask_without_changing_constraints(self):
        self.filters = SearchFilters(max_price_krw=1)
        result = self.run_script([tools(("search_menus", {})),
            Reply(text='{"type":"QUESTION","question":"예산을 늘려도 될까요?"}')])
        self.assertEqual(result.status, "QUESTION")
        self.assertEqual(result.recommendations, ())
        self.assertEqual(self.filters.max_price_krw, 1)

    def test_followup_scope_and_isolation(self):
        state = ConversationState()
        self.run_script([tools(("search_menus", {})), final("offer-1", "offer-2")], state=state)
        result = self.run_script([tools(("search_menus", {})), final("offer-6"), final("offer-1")],
            state=state, within_previous=True)
        self.assertEqual([m.offer.id for m in result.recommendations], ["offer-1"])
        self.assertEqual(len(state.turns), 2)
        fresh = self.run_script([tools(("search_menus", {})), final()], within_previous=True)
        self.assertEqual(fresh.recommendations, ())

    def test_errors_not_empty_search_or_secrets(self):
        with patch.object(self.repo, "search_menus", side_effect=RepositoryError("secret")):
            result = self.run_script([tools(("search_menus", {}))])
        self.assertEqual(result.status, "ERROR")
        self.assertNotIn("secret", repr(result))
        result = self.run_script([])
        self.assertEqual(result.status, "ERROR")
        self.assertEqual(result.llm_calls, 1)

    def test_previous_scope_applied_before_small_limit(self):
        state = ConversationState(last_offer_ids=("offer-2",))
        result = self.run_script([tools(("search_menus", {"limit": 1})), final("offer-2")],
                                 state=state, within_previous=True)
        self.assertEqual(result.status, "RESULT")
        self.assertEqual([m.offer.id for m in result.recommendations], ["offer-2"])

    def test_malformed_json_and_no_retrieval_are_rejected(self):
        result = self.run_script([Reply(text="not JSON"), final()], max_llm_calls=2)
        self.assertEqual(result.status, "LIMIT")
        self.assertEqual(sum(t["event"] == "invalid_final" for t in result.trace), 2)

    def test_deadline_checked_after_model_returns(self):
        with patch("app.agent.loop.monotonic", side_effect=[0, 0, 0, 2, 2, 2]):
            result = self.run_script([final()], timeout_s=1)
        self.assertEqual(result.status, "LIMIT")


if __name__ == "__main__":
    unittest.main()
