import unittest
from app.repositories.analyses import MockAnalysisRepository, ReviewInput


def result():
    return dict(analysis_id='test-1', generator_version='mock-v1', generated_at='2026-11-09T00:00:00+00:00',
                opinions=[dict(review_id=1, quote='조용', topic='noise', sentiment='positive')])


class AnalysisTests(unittest.TestCase):
    def test_publish_read_and_mutation_isolation(self):
        repo = MockAnalysisRepository()
        repo.replace_reviews(1, (ReviewInput(1, '조용해요'), ReviewInput(2, '숨김', visible=False)))
        snapshot = repo.snapshot(1)
        self.assertEqual([r.review_id for r in snapshot.reviews], [1])
        data = result()
        self.assertTrue(repo.publish(snapshot, data))
        data['opinions'].clear()
        read = repo.current(1)
        self.assertEqual(len(read['opinions']), 1)
        read['opinions'].clear()
        self.assertEqual(len(repo.current(1)['opinions']), 1)

    def test_edit_delete_hide_invalidates_and_rejects_old_worker(self):
        for changed in [ReviewInput(1, '변경'), ReviewInput(1, '조용해요', deleted=True), ReviewInput(1, '조용해요', visible=False)]:
            repo = MockAnalysisRepository()
            repo.replace_reviews(1, (ReviewInput(1, '조용해요'),))
            before = repo.snapshot(1)
            repo.publish(before, result())
            repo.replace_reviews(1, (changed,))
            self.assertIsNone(repo.current(1))
            self.assertFalse(repo.publish(before, result()))

    def test_evidence_and_empty_reviews(self):
        repo = MockAnalysisRepository()
        repo.replace_reviews(1, (ReviewInput(1, '조용해요'),))
        data = result(); data['opinions'][0]['quote'] = '없는 원문'
        with self.assertRaises(ValueError): repo.publish(repo.snapshot(1), data)
        repo.replace_reviews(1, ())
        data = result(); data['opinions'] = []
        self.assertTrue(repo.publish(repo.snapshot(1), data))
        self.assertEqual(repo.current(1)['status'], 'NO_REVIEWS')


if __name__ == '__main__': unittest.main()
