from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.review_summary import SummaryService, MockReviewSummarizer
from app.routers.review_summaries import get_summary_service


class ReviewSummaryApiTests(unittest.TestCase):
    def test_cache_empty_unknown_and_auth(self):
        with TemporaryDirectory() as folder, patch.object(settings, 'internal_api_token', 'test'):
            service = SummaryService(Path(folder) / 'test.sqlite', MockReviewSummarizer())
            app.dependency_overrides[get_summary_service] = lambda: service
            try:
                client = TestClient(app)
                url = '/cafes/990001/review-summary'
                self.assertEqual(client.get(url).status_code, 401)
                headers = {'X-Internal-Token': 'test'}
                first = client.get(url, headers=headers)
                self.assertEqual(first.status_code, 200)
                self.assertFalse(first.json()['cache_hit'])
                self.assertEqual(first.json()['summary']['review_count'], 3)
                second = client.get(url, headers=headers).json()
                self.assertTrue(second['cache_hit'])
                self.assertEqual(first.json()['summary'], second['summary'])
                self.assertEqual(second['llm_calls'], 0)
                self.assertEqual(client.get('/cafes/990002/review-summary', headers=headers).json()['status'], 'NO_REVIEWS')
                self.assertEqual(client.get('/cafes/9/review-summary', headers=headers).status_code, 404)
                self.assertEqual(client.get('/cafes/0/review-summary', headers=headers).status_code, 422)
            finally:
                app.dependency_overrides.pop(get_summary_service, None)
