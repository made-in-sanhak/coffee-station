from pathlib import Path
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.repositories.mock import MockRepository


class DirectTests(unittest.TestCase):
    def test_http_without_model_or_api_key(self):
        repo = MockRepository(Path(__file__).resolve().parents[1] / 'fixtures/api_smoke_catalog.json')
        with patch.object(settings, 'recommendation_mode', 'direct'), \
             patch.object(settings, 'internal_api_token', 'test'), \
             patch('app.routers.recommendations.create_repository', return_value=repo), \
             patch('app.routers.recommendations.read_gemini_settings') as credentials, \
             patch('app.routers.recommendations.GeminiModel') as model:
            for budget, ids in ((4000, ['m4', 'm1', 'm5']), (3999, ['m4', 'm1']), (2999, [])):
                response = TestClient(app).post('/recommendations', headers={'X-Internal-Token': 'test'},
                    json={'message': '확정 조건', 'constraints': {'max_price_krw': budget, 'category': 'COFFEE'}})
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertEqual(data['llm_calls'], 0)
                self.assertEqual(data['status'], 'RESULT' if ids else 'QUESTION')
                self.assertEqual([m['offer']['id'] for m in data['recommendations']], ids)
            credentials.assert_not_called()
            model.assert_not_called()
