from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock
from app.review_summary import Review, MockReviewSummarizer, SummaryService
from app.review_summary import validate_opinions


class ReviewSummaryTests(unittest.TestCase):
    def test_mixed_opinions_preserve_context(self):
        with TemporaryDirectory() as folder:
            service = SummaryService(Path(folder) / 'summary.sqlite', MockReviewSummarizer())
            data, _ = service.refresh(1, [Review(1, 1, '평일에는 조용해요.'),
                                          Review(2, 1, '주말에는 시끄러워요.')])
            self.assertTrue(data['topics'][0]['mixed_opinions'])
            self.assertEqual(data['topics'][0]['evidence_ids']['positive'], [1])
            self.assertEqual(data['topics'][0]['evidence_ids']['negative'], [2])
            self.assertEqual(data['opinions'][0]['quote'], '평일에는 조용해요.')

    def test_evidence_and_schema_rejections(self):
        good = dict(review_id=1, quote='조용해요', topic='noise', sentiment='positive')
        for items in ([good, good], [dict(good, review_id=True)], [dict(good, quote='시끄러워요')],
                      [dict(good, topic='invented')], [dict(good, claim='항상 조용한 매장')]):
            with self.subTest(items=items), self.assertRaises(ValueError):
                validate_opinions(items, {1: '조용해요'})

    def test_cache_edit_delete_and_hidden(self):
        with TemporaryDirectory() as folder:
            model = MockReviewSummarizer()
            model.summarize = Mock(wraps=model.summarize)
            path = Path(folder) / 'summary.sqlite'
            service = SummaryService(path, model)
            rows = [Review(1, 1, '조용해요'), Review(2, 1, '주말에는 시끄러워요'),
                    Review(3, 1, '숨김', status='HIDDEN'), Review(4, 2, '다른 매장')]
            first, changed = service.refresh(1, rows)
            self.assertTrue(changed)
            self.assertEqual(first['source_review_ids'], [1, 2])
            self.assertFalse(SummaryService(path, model).refresh(1, rows)[1])
            self.assertEqual(model.summarize.call_count, 1)
            rows[0] = replace(rows[0], content='좌석이 넓어요')
            self.assertTrue(service.refresh(1, rows)[1])
            result, _ = service.refresh(1, [replace(r, deleted_at='2026-11-09') for r in rows])
            self.assertEqual(result['review_count'], 0)
            self.assertEqual(result['excerpts'], [])

    def test_invalid_evidence_never_saved(self):
        with TemporaryDirectory() as folder:
            model = MockReviewSummarizer()
            model.summarize = Mock(return_value=[{'review_id': 99, 'quote': 'invented'}])
            service = SummaryService(Path(folder) / 'summary.sqlite', model)
            with self.assertRaises(ValueError):
                service.refresh(1, [Review(1, 1, '실제 의견')])
