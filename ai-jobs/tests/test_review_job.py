import unittest
from app.review_job import ReviewJobRunner, MockReviewModel
from app.repositories.analyses import MockAnalysisRepository, ReviewInput


class ReviewJobTests(unittest.TestCase):
    def setUp(self):
        self.repo = MockAnalysisRepository()
        self.repo.replace_reviews(1, (ReviewInput(1, '조용해요'), ReviewInput(2, '시끄러워요')))

    def test_success_and_conflicting_opinions(self):
        result = ReviewJobRunner(self.repo, MockReviewModel()).run(1)
        self.assertEqual(result['status'], 'READY')
        self.assertEqual({o['sentiment'] for o in self.repo.current(1)['opinions']}, {'positive', 'negative'})

    def test_bad_evidence_then_refresh_and_repair(self):
        class Model(MockReviewModel):
            calls = 0
            def decide(model, snapshot, observation):
                model.calls += 1
                if model.calls == 1: return dict(action='analyze', opinions=[dict(review_id=1, quote='가짜', topic='noise', sentiment='positive')])
                if observation == 'evidence_rejected': return dict(action='refresh')
                return super().decide(snapshot, observation)
        result = ReviewJobRunner(self.repo, Model()).run(1)
        self.assertEqual(result['status'], 'READY')
        self.assertEqual(result['model_calls'], 3)

    def test_changed_input_never_publishes_old_snapshot(self):
        repo = self.repo
        class Model(MockReviewModel):
            def decide(model, snapshot, observation):
                if observation == 'initial': repo.replace_reviews(1, (ReviewInput(3, '조용한 새 리뷰'),))
                return super().decide(snapshot, observation)
        result = ReviewJobRunner(repo, Model()).run(1)
        self.assertEqual(result['status'], 'READY')
        self.assertEqual(repo.current(1)['source_review_ids'], [3])

    def test_limits_timeout_failure_and_busy(self):
        class Invalid(MockReviewModel):
            def decide(self, *args): return dict(action='arbitrary_sql')
        self.assertEqual(ReviewJobRunner(self.repo, Invalid()).run(1)['status'], 'LIMIT_REACHED')
        times = iter([0, 0, 11])
        self.assertEqual(ReviewJobRunner(self.repo, MockReviewModel(), clock=lambda: next(times)).run(1)['status'], 'TIMEOUT')
        class Broken(MockReviewModel):
            def decide(self, *args): raise RuntimeError('secret')
        runner = ReviewJobRunner(self.repo, Broken())
        self.assertEqual(runner.run(1)['status'], 'FAILED')
        self.assertEqual(runner.run(1)['status'], 'FAILED')  # lock released
        runner._active.add(1)
        self.assertEqual(runner.run(1)['status'], 'BUSY')


if __name__ == '__main__': unittest.main()
