import unittest
from app.agent.state import AgentResult
from app.repositories.mock import MockRepository
from scripts.evaluate_mock_agent import AI_ROOT, SCENARIOS, assess


class EvaluationTests(unittest.TestCase):
    def test_correct_ids_without_search_is_not_pass(self):
        case = SCENARIOS[0]
        items = MockRepository(AI_ROOT / 'fixtures/api_smoke_catalog.json').search_menus(case.filters)
        self.assertFalse(assess(case, AgentResult('RESULT', '', items))['passed'])

    def test_missing_candidate_is_not_pass(self):
        case = SCENARIOS[0]
        items = MockRepository(AI_ROOT / 'fixtures/api_smoke_catalog.json').search_menus(case.filters)
        result = AgentResult('RESULT', '', items[:1], [{'tool': 'search_menus', 'status': 'ok'}])
        self.assertFalse(assess(case, result)['passed'])

    def test_error_is_not_a_successful_empty_result(self):
        result = AgentResult('ERROR', '', (), [{'tool': 'search_menus', 'status': 'ok'}])
        self.assertFalse(assess(SCENARIOS[-1], result)['passed'])
