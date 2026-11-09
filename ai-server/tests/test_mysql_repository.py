from dataclasses import replace
from datetime import date
import json
import unittest
from unittest.mock import Mock

from app.repositories.base import RepositoryError, SearchFilters
from app.repositories.mock import MockRepository
from app.repositories.mysql import MySQLRepository
from app.agent.tools import execute_tool
from app.llm.base import ToolCall
from app.llm.base import Reply, ScriptedModel
from app.agent.loop import run_turn


class MySQLRepositoryTests(unittest.TestCase):
    def setUp(self):
        self.mock = MockRepository()
        self.connection = Mock()
        self.cursor = self.connection.cursor.return_value
        self.cafes = [replace(c, evidence=replace(c.evidence, source='TEST_SQL', is_mock=False))
                      for c in self.mock._cafes.values()]
        self.offers = [replace(o, evidence=replace(o.evidence, source='TEST_SQL', is_mock=False))
                       for o in self.mock._offers]

    def test_partial_catalog_matches_mock_filters(self):
        repo = MySQLRepository(lambda: self.connection, lambda cursor: (self.cafes, self.offers))
        filters = SearchFilters(max_price_krw=4000, sweetness='NOT_SWEET', sort_by='price')
        self.assertEqual([m.offer.id for m in repo.search_menus(filters)],
                         [m.offer.id for m in self.mock.search_menus(filters)])
        self.cursor.execute.assert_called_once_with('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY')
        self.cursor.close.assert_called_once()
        self.connection.close.assert_called_once()

    def test_empty_database_is_valid(self):
        repo = MySQLRepository(lambda: self.connection, lambda cursor: ([], []))
        self.assertEqual(repo.search_menus(SearchFilters()), ())

    def test_real_catalog_result_is_not_labeled_mock(self):
        repo = MySQLRepository(lambda: self.connection, lambda cursor: (self.cafes, self.offers))
        offer = repo.search_menus(SearchFilters())[0].offer
        model = ScriptedModel([
            Reply(calls=(ToolCall('search_menus', {}),)),
            Reply(text=json.dumps({'type': 'RESULT', 'offer_ids': [offer.id]})),
        ])
        result = run_turn(model, repo, '추천', constraints=SearchFilters())
        self.assertEqual(result.status, 'RESULT')
        self.assertEqual(result.message, '조회 데이터 기반 추천입니다.')

    def test_sql_dates_are_json_serializable_for_all_tools(self):
        verified = date(2026, 11, 8)
        cafes = [replace(c, evidence=replace(c.evidence, verified_at=verified)) for c in self.cafes]
        offers = [replace(o, evidence=replace(o.evidence, verified_at=verified)) for o in self.offers]
        repo = MySQLRepository(lambda: self.connection, lambda cursor: (cafes, offers))
        for name, arguments in (
            ('search_menus', {}), ('search_cafes', {}),
            ('get_cafe_details', {'cafe_id': cafes[0].id}),
        ):
            with self.subTest(tool=name):
                payload, _ = execute_tool(repo, ToolCall(name, arguments), SearchFilters())
                self.assertIn('2026-11-08', json.dumps(payload))
        self.assertEqual(repo.get_cafe_details(cafes[0].id).evidence.verified_at, verified)

    def test_failure_closes_connection_without_mock_fallback(self):
        def fail(cursor):
            raise RuntimeError('private connection detail')
        with self.assertRaises(RepositoryError) as caught:
            MySQLRepository(lambda: self.connection, fail)
        self.assertNotIn('private', str(caught.exception))
        self.connection.close.assert_called_once()

    def test_orphan_offers_are_rejected(self):
        with self.assertRaises(RepositoryError):
            MySQLRepository(lambda: self.connection, lambda cursor: ([], self.offers))
