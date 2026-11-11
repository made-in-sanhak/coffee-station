"""Bounded mock review agent. No HTTP server or external provider required."""
from copy import deepcopy
from datetime import datetime, timezone
from threading import Lock
from time import monotonic
from uuid import uuid4
from app.repositories.analyses import AnalysisRepository


class MockReviewModel:
    version = 'mock-review-agent-v1'

    def decide(self, snapshot, observation):
        # Review text is input data, never an executable instruction.
        opinions = []
        for r in snapshot.reviews:
            topic, sentiment = ('noise', 'positive') if '조용' in r.content else (
                ('noise', 'negative') if '시끄' in r.content else ('other', 'neutral'))
            opinions.append(dict(review_id=r.review_id, quote=r.content[:160], topic=topic, sentiment=sentiment))
        return dict(action='analyze', opinions=opinions)


class ReviewJobRunner:
    def __init__(self, repository: AnalysisRepository, model, *, max_calls=3, seconds=10, clock=monotonic):
        if type(max_calls) is not int or max_calls < 1 or seconds <= 0:
            raise ValueError('Positive limits required')
        self.repository, self.model = repository, model
        self.max_calls, self.seconds, self.clock = max_calls, seconds, clock
        self._guard, self._active = Lock(), set()

    def run(self, cafe_id):
        if type(cafe_id) is not int or cafe_id <= 0:
            raise ValueError('Positive cafe ID required')
        with self._guard:
            if cafe_id in self._active:
                return dict(status='BUSY', model_calls=0, trace=[])
            self._active.add(cafe_id)
        start, calls, trace = self.clock(), 0, []
        try:
            snapshot = self.repository.snapshot(cafe_id)
            observation = 'initial'
            for _ in range(self.max_calls):
                if self.clock() - start >= self.seconds:
                    return dict(status='TIMEOUT', model_calls=calls, trace=trace)
                calls += 1
                decision = self.model.decide(snapshot, observation)
                if self.clock() - start >= self.seconds:
                    return dict(status='TIMEOUT', model_calls=calls, trace=trace)
                if not isinstance(decision, dict) or decision.get('action') not in ('refresh', 'analyze'):
                    trace.append(dict(event='invalid_action')); observation = 'invalid_action'; continue
                if decision['action'] == 'refresh' and set(decision) == {'action'}:
                    snapshot = self.repository.snapshot(cafe_id)
                    trace.append(dict(event='refresh', revision=snapshot.revision))
                    observation = 'refreshed'; continue
                if set(decision) != {'action', 'opinions'} or decision['action'] != 'analyze':
                    observation = 'invalid_action'; trace.append(dict(event='invalid_action')); continue
                analysis = dict(analysis_id=str(uuid4()), generator_version=self.model.version,
                    generated_at=datetime.now(timezone.utc).isoformat(), opinions=deepcopy(decision['opinions']))
                try:
                    saved = self.repository.publish(snapshot, analysis)
                except (ValueError, TypeError, KeyError):
                    trace.append(dict(event='evidence_rejected')); observation = 'evidence_rejected'; continue
                if saved:
                    trace.append(dict(event='published', revision=snapshot.revision))
                    return dict(status='READY', model_calls=calls, trace=trace)
                trace.append(dict(event='input_changed'))
                snapshot = self.repository.snapshot(cafe_id)
                observation = 'input_changed'
            return dict(status='LIMIT_REACHED', model_calls=calls, trace=trace)
        except Exception:
            # Do not return provider errors, raw review text or credentials.
            return dict(status='FAILED', model_calls=calls, trace=trace)
        finally:
            with self._guard:
                self._active.remove(cafe_id)
