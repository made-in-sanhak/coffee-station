import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.agent.extraction import Proposal
from app.agent.proposals import ProposalStore


class ConfirmationTests(unittest.TestCase):
    def test_expiration_and_single_use(self):
        store = ProposalStore(ttl=10)
        with patch('app.agent.proposals.monotonic', return_value=0):
            key = store.add(Proposal(max_price_krw=None, category=None, sort_by=None, evidence={}, unresolved=[]))
        with patch('app.agent.proposals.monotonic', return_value=11), self.assertRaises(KeyError):
            store.consume(key)

    def test_prepare_no_search_and_confirm_with_edits(self):
        proposal = Proposal(max_price_krw=4000, category='COFFEE', sort_by='price', evidence={}, unresolved=[])
        with patch.object(settings, 'internal_api_token', 'test'), \
             patch('app.routers.recommendations.proposals', ProposalStore()), \
             patch('app.routers.recommendations.read_gemini_settings', return_value=('test', 'test')), \
             patch('app.routers.recommendations.GeminiModel'), \
             patch('app.routers.recommendations.extract_proposal', return_value=proposal), \
             patch('app.routers.recommendations.recommend', return_value={'status': 'RESULT'}) as recommend:
            client = TestClient(app)
            headers = {'X-Internal-Token': 'test'}
            prepared = client.post('/recommendations/prepare', headers=headers, json={'message': '커피'})
            self.assertEqual(prepared.status_code, 200)
            recommend.assert_not_called()
            body = {'proposal_id': prepared.json()['proposal_id'], 'confirmed': False,
                    'constraints': {'max_price_krw': 3500, 'category': 'COFFEE'}}
            self.assertEqual(client.post('/recommendations/confirm', headers=headers, json=body).status_code, 409)
            recommend.assert_not_called()
            body['confirmed'] = True
            self.assertEqual(client.post('/recommendations/confirm', headers=headers, json=body).status_code, 200)
            self.assertEqual(recommend.call_args.args[0].constraints.max_price_krw, 3500)
            self.assertEqual(client.post('/recommendations/confirm', headers=headers, json=body).status_code, 409)
            self.assertEqual(recommend.call_count, 1)

    def test_unresolved_cannot_be_consumed(self):
        store = ProposalStore()
        key = store.add(Proposal(max_price_krw=None, category=None, sort_by=None, evidence={}, unresolved=['단맛 확인']))
        with self.assertRaises(ValueError):
            store.consume(key)
