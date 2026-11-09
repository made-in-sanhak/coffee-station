import unittest
import json
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.llm.base import Reply, ScriptedModel, ToolCall
from app.repositories.mock import MockRepository
from app.repositories.base import RepositoryError, Location
from app.repositories.catalog import CatalogSnapshot


class RecommendationApiTests(unittest.TestCase):
    def scripted_request(self, repo, replies, constraints):
        model = ScriptedModel(replies)
        with patch('app.routers.recommendations.create_repository', return_value=repo), \
             patch('app.routers.recommendations.read_gemini_settings', return_value=('test', 'test')), \
             patch('app.routers.recommendations.GeminiModel') as factory:
            factory.return_value.generate.side_effect = model.generate
            response = self.client.post('/recommendations', headers=self.headers,
                json={**self.body, 'constraints': constraints})
            factory.return_value.close.assert_called_once()
            return response

    def test_price_boundary_and_no_results(self):
        repo = MockRepository(Path(__file__).resolve().parents[1] / 'fixtures/api_smoke_catalog.json')
        for price, ids in ((4000, ['m4', 'm1', 'm5']), (3999, ['m4', 'm1']), (2999, [])):
            with self.subTest(price=price):
                response = self.scripted_request(repo, [
                    Reply(calls=(ToolCall('search_menus', {}),)),
                    Reply(text=json.dumps({'type': 'RESULT', 'offer_ids': ids})),
                ], {'max_price_krw': price, 'category': 'COFFEE'})
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertEqual(data['trace'][1]['result_count'], len(ids))
                self.assertEqual([m['offer']['id'] for m in data['recommendations']], ids)

    def test_relaxation_rejected_and_permission_question(self):
        response = self.scripted_request(MockRepository(), [
            Reply(calls=(ToolCall('search_menus', {'max_price_krw': 5000}),)),
            Reply(calls=(ToolCall('search_menus', {}),)),
            Reply(text=json.dumps({'type': 'QUESTION', 'question': '예산을 늘려도 될까요?'})),
        ], {'max_price_krw': 1})
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'QUESTION')
        self.assertEqual(data['recommendations'], [])
        self.assertEqual(data['trace'][1]['code'], 'INVALID_TOOL_CALL')
        self.assertEqual(data['trace'][3]['result_count'], 0)

    def test_distance_order_overrides_model_order(self):
        source = MockRepository()
        cafe = next(iter(source._cafes.values()))
        offer = source._offers[0]
        cafes = [replace(cafe, id='near', location=Location(37, 127)),
                 replace(cafe, id='far', location=Location(37.01, 127))]
        offers = [replace(offer, id=c.id, cafe_id=c.id, available=True) for c in cafes]
        response = self.scripted_request(CatalogSnapshot(cafes, offers), [
            Reply(calls=(ToolCall('search_menus', {}),)),
            Reply(text='{"type":"RESULT","offer_ids":["far","near"]}'),
        ], {'origin': {'lat': 37, 'lng': 127}, 'sort_by': 'distance'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([m['offer']['id'] for m in response.json()['recommendations']], ['near', 'far'])

    def test_model_error_and_limit_are_not_success(self):
        for replies, status in (([], 502), ([Reply(text='invalid')] * 6, 504)):
            with self.subTest(status=status):
                response = self.scripted_request(MockRepository(), replies, {})
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.json()['recommendations'], [])

    def setUp(self):
        mode = patch.object(settings, 'recommendation_mode', 'agent')
        mode.start()
        self.addCleanup(mode.stop)
        self.client = TestClient(app)
        self.auth = patch.object(settings, 'internal_api_token', 'test-only')
        self.auth.start()
        self.addCleanup(self.auth.stop)
        self.headers = {'X-Internal-Token': 'test-only'}
        self.body = {'message': '4000원 이하 커피',
                     'constraints': {'max_price_krw': 4000, 'category': 'COFFEE'}}

    def test_authentication_before_execution(self):
        with patch('app.routers.recommendations.create_repository') as repo:
            self.assertEqual(self.client.post('/recommendations', json=self.body).status_code, 401)
            repo.assert_not_called()

    def test_invalid_request_never_calls_database(self):
        for constraints in ({'max_price_krw': -1}, {'sort_by': 'distance'}, {'unknown': 1}):
            with patch('app.routers.recommendations.create_repository') as repo:
                response = self.client.post('/recommendations', headers=self.headers,
                    json={**self.body, 'constraints': constraints})
                self.assertEqual(response.status_code, 422)
                repo.assert_not_called()

    def test_full_route_with_scripted_model(self):
        model = ScriptedModel([Reply(calls=(ToolCall('search_menus', {}),)),
                               Reply(text='{"type":"RESULT","offer_ids":[]}')])
        with patch('app.routers.recommendations.create_repository', return_value=MockRepository()), \
             patch('app.routers.recommendations.read_gemini_settings', return_value=('test', 'test')), \
             patch('app.routers.recommendations.GeminiModel') as factory:
            factory.return_value.generate.side_effect = model.generate
            response = self.client.post('/recommendations', headers=self.headers, json=self.body)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['status'], 'RESULT')
            self.assertEqual(response.json()['llm_calls'], 2)
            factory.return_value.close.assert_called_once()

    def test_database_error_is_safe(self):
        with patch('app.routers.recommendations.create_repository', side_effect=RepositoryError('secret')):
            response = self.client.post('/recommendations', headers=self.headers, json=self.body)
            self.assertEqual(response.status_code, 503)
            self.assertNotIn('secret', response.text)
