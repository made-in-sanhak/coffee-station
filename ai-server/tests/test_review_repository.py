import unittest
from unittest.mock import Mock
from app.repositories.reviews import MySQLReviewRepository
from app.repositories.base import RepositoryError


class ReviewRepositoryTests(unittest.TestCase):
    def test_mapping_and_parameter_binding(self):
        connection = Mock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [dict(review_id=1, cafe_id=2, content='임시 리뷰', status='VISIBLE', deleted_at=None)]
        rows = MySQLReviewRepository(lambda: connection).list_reviews(2)
        self.assertEqual(rows[0].content, '임시 리뷰')
        self.assertEqual(cursor.execute.call_args.args[1], (2,))
        connection.close.assert_called_once()
        cursor.close.assert_called_once()

    def test_no_silent_partial_snapshot(self):
        connection = Mock()
        connection.cursor.return_value.fetchall.return_value = [{}] * 1001
        with self.assertRaises(RepositoryError):
            MySQLReviewRepository(lambda: connection).list_reviews(2)
        connection.close.assert_called_once()
