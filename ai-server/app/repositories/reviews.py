"""Review snapshots. Real connections are explicit and never created at import."""
from typing import Protocol
from app.review_summary import Review
from app.repositories.base import RepositoryError


class ReviewRepository(Protocol):
    def list_reviews(self, cafe_id: int) -> tuple[Review, ...]: ...


class MockReviewRepository:
    def __init__(self, reviews):
        self.reviews = tuple(reviews)

    def list_reviews(self, cafe_id):
        return tuple(r for r in self.reviews if r.cafe_id == cafe_id)


class MySQLReviewRepository:
    def __init__(self, connect):
        self.connect = connect

    def list_reviews(self, cafe_id):
        if type(cafe_id) is not int or cafe_id <= 0:
            raise ValueError('Positive cafe ID required')
        connection = cursor = None
        try:
            connection = self.connect()
            cursor = connection.cursor()
            cursor.execute('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY')
            cursor.execute('SELECT review_id, cafe_id, content, status, deleted_at FROM reviews '
                           'WHERE cafe_id=%s ORDER BY review_id LIMIT 1001', (cafe_id,))
            rows = cursor.fetchall()
            if len(rows) > 1000:
                raise ValueError('More than 1000 reviews; implement pagination before use')
            return tuple(Review(r['review_id'], r['cafe_id'], r['content'], r['status'],
                                r['deleted_at'].isoformat() if r['deleted_at'] else None) for r in rows)
        except Exception as error:
            raise RepositoryError('Unable to read review snapshot') from error
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
