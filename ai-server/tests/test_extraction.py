import json
import unittest

from app.agent.extraction import extract_proposal
from app.llm.base import Reply, ScriptedModel, ToolCall


class ExtractionTests(unittest.TestCase):
    def proposal(self, **updates):
        return dict(max_price_krw=None, category=None, sort_by=None,
                    evidence={}, unresolved=[]) | updates

    def extract(self, data, message='4000원 이하 커피'):
        model = ScriptedModel([Reply(text=json.dumps(data))])
        return extract_proposal(model, message)

    def test_valid_proposal_is_not_confirmed_filters(self):
        result = self.extract(self.proposal(max_price_krw=4000, category='COFFEE',
            evidence={'max_price_krw': '4000원 이하', 'category': '커피'}))
        self.assertEqual(result.max_price_krw, 4000)
        self.assertFalse(hasattr(result, 'to_filters'))

    def test_invalid_or_unfounded_output_rejected(self):
        for data in (self.proposal(max_price_krw=-1), self.proposal(max_price_krw='4000'),
                     self.proposal(category='LATTE', evidence={'category': '라떼'}),
                     self.proposal(category='COFFEE'), self.proposal(unknown=True)):
            with self.subTest(data=data), self.assertRaises(ValueError):
                self.extract(data)

    def test_distance_always_requires_location_confirmation(self):
        result = self.extract(self.proposal(sort_by='distance', evidence={'sort_by': '가까운 순'}), '가까운 순')
        self.assertTrue(result.unresolved)

    def test_tools_and_empty_input_rejected(self):
        with self.assertRaises(ValueError):
            extract_proposal(ScriptedModel([Reply(calls=(ToolCall('search_menus', {}),))]), '커피')
        with self.assertRaises(ValueError):
            extract_proposal(ScriptedModel([]), ' ')
