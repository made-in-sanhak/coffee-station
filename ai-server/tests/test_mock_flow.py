import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.agent.proposals import ProposalStore
from app.llm.mock_extraction import MESSAGES


class MockFlowTests(unittest.TestCase):
    def test_prepare_confirm_without_credentials_or_database(self):
        with patch.object(settings, 'extraction_mode', 'mock'), \
             patch.object(settings, 'recommendation_mode', 'direct'), \
             patch.object(settings, 'agent_repository', 'mock'), \
             patch.object(settings, 'internal_api_token', 'test'), \
             patch('app.routers.recommendations.proposals', ProposalStore()), \
             patch('app.routers.recommendations.read_gemini_settings') as credentials, \
             patch('app.routers.recommendations.GeminiModel') as model:
            client = TestClient(app)
            headers = {'X-Internal-Token': 'test'}
            for message, ready in ((MESSAGES[0], True), (MESSAGES[2], False), ('등록 안 된 문장', False)):
                prepared = client.post('/recommendations/prepare', headers=headers, json={'message': message})
                self.assertEqual(prepared.status_code, 200)
                data = prepared.json()
                self.assertEqual(data['extraction_mode'], 'mock')
                self.assertEqual(data['llm_calls'], 0)
                self.assertEqual(data['status'], 'AWAITING_CONFIRMATION' if ready else 'NEEDS_CLARIFICATION')
                if ready:
                    result = client.post('/recommendations/confirm', headers=headers, json={
                        'proposal_id': data['proposal_id'], 'confirmed': True,
                        'constraints': data['suggested_constraints']})
                    self.assertEqual(result.status_code, 200)
                    self.assertEqual(result.json()['llm_calls'], 0)
                    self.assertTrue(result.json()['recommendations'])
            credentials.assert_not_called()
            model.assert_not_called()
