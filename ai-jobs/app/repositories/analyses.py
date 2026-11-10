"""Versioned analysis contract; mock implementation never connects to a database."""
from copy import deepcopy
from dataclasses import dataclass
from hashlib import sha256
import json
from threading import RLock
from typing import Protocol


@dataclass(frozen=True)
class ReviewInput:
    review_id: int
    content: str
    visible: bool = True
    deleted: bool = False


@dataclass(frozen=True)
class AnalysisInput:
    cafe_id: int
    revision: int
    input_hash: str
    reviews: tuple[ReviewInput, ...]


class AnalysisRepository(Protocol):
    def snapshot(self, cafe_id: int) -> AnalysisInput: ...
    def publish(self, snapshot: AnalysisInput, analysis: dict) -> bool: ...
    def current(self, cafe_id: int) -> dict | None: ...


class MockAnalysisRepository:
    """All review writes must increment revision; lock models a DB transaction."""
    def __init__(self):
        self._lock = RLock()
        self._inputs = {}
        self._analyses = {}

    def replace_reviews(self, cafe_id: int, reviews: tuple[ReviewInput, ...]):
        if type(cafe_id) is not int or cafe_id <= 0:
            raise ValueError('Positive cafe ID required')
        reviews = tuple(reviews)
        if any(type(r.review_id) is not int or r.review_id <= 0 or not isinstance(r.content, str)
               or type(r.visible) is not bool or type(r.deleted) is not bool for r in reviews):
            raise ValueError('Invalid review')
        if len({r.review_id for r in reviews}) != len(reviews):
            raise ValueError('Duplicate review ID')
        with self._lock:
            revision = self._inputs.get(cafe_id, (0, ()))[0] + 1
            self._inputs[cafe_id] = revision, reviews
            # Fail closed immediately, including if the next analysis fails.
            self._analyses.pop(cafe_id, None)

    def snapshot(self, cafe_id):
        with self._lock:
            revision, rows = self._inputs.get(cafe_id, (0, ()))
            selected = tuple(sorted((r for r in rows if r.visible and not r.deleted and r.content.strip()),
                                    key=lambda r: r.review_id))
            encoded = json.dumps([(r.review_id, r.content) for r in selected], ensure_ascii=False,
                                 separators=(',', ':')).encode()
            return AnalysisInput(cafe_id, revision, sha256(encoded).hexdigest(), selected)

    def publish(self, snapshot, analysis):
        with self._lock:
            if snapshot != self.snapshot(snapshot.cafe_id):
                return False
            if set(analysis) != {'analysis_id', 'generator_version', 'generated_at', 'opinions'}:
                raise ValueError('Invalid analysis fields')
            if any(not isinstance(analysis[k], str) or not analysis[k].strip()
                   for k in ('analysis_id', 'generator_version', 'generated_at')):
                raise ValueError('Missing metadata')
            from datetime import datetime
            if datetime.fromisoformat(analysis['generated_at']).tzinfo is None:
                raise ValueError('Timezone required')
            if not isinstance(analysis['opinions'], list):
                raise ValueError('Opinions must be a list')
            sources = {r.review_id: r.content for r in snapshot.reviews}
            for opinion in analysis['opinions']:
                if not isinstance(opinion, dict) or set(opinion) != {'review_id', 'quote', 'topic', 'sentiment'}:
                    raise ValueError('Invalid opinion fields')
                if type(opinion['review_id']) is not int or opinion['review_id'] not in sources:
                    raise ValueError('Unknown review')
                if not isinstance(opinion['quote'], str) or not opinion['quote'].strip() or opinion['quote'] not in sources[opinion['review_id']]:
                    raise ValueError('Invalid quote')
                if opinion['topic'] not in ('noise', 'seating', 'other') or opinion['sentiment'] not in ('positive', 'negative', 'neutral'):
                    raise ValueError('Invalid classification')
            self._analyses[snapshot.cafe_id] = deepcopy({**analysis, 'cafe_id': snapshot.cafe_id,
                'revision': snapshot.revision, 'input_hash': snapshot.input_hash, 'schema_version': 1,
                'status': 'READY' if snapshot.reviews else 'NO_REVIEWS',
                'source_review_ids': list(sources)})
            return True

    def current(self, cafe_id):
        with self._lock:
            return deepcopy(self._analyses.get(cafe_id))
