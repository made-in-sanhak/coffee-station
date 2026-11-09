"""Local prototype: versioned summary cache, isolated from the business DB."""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import hashlib
import json
import sqlite3
from contextlib import closing
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ReviewOpinion(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    review_id: int
    quote: str = Field(min_length=1, max_length=500)
    topic: Literal['noise', 'seating', 'other']
    sentiment: Literal['positive', 'negative', 'neutral']


def validate_opinions(items, sources):
    if not isinstance(items, list) or len(items) > len(sources):
        raise ValueError('Expected at most one opinion per source review')
    validated, seen = [], set()
    for item in items:
        opinion = ReviewOpinion.model_validate(item)
        if opinion.review_id in seen or opinion.review_id not in sources or (
            not opinion.quote.strip() or opinion.quote not in sources[opinion.review_id]
        ):
            raise ValueError('Unsupported or duplicate review evidence')
        seen.add(opinion.review_id)
        validated.append(opinion.model_dump())
    return validated


@dataclass(frozen=True)
class Review:
    review_id: int
    cafe_id: int
    content: str | None
    status: str = 'VISIBLE'
    deleted_at: str | None = None


class MockReviewSummarizer:
    # Extractive preview, not a Gemini-generated opinion or quality score.
    version = 'mock-opinions-v2'

    def summarize(self, reviews):
        # Exact synthetic fixtures only. This is not sentiment classification.
        labels = {
            '평일에는 조용해요.': ('noise', 'positive'),
            '주말에는 시끄러워요.': ('noise', 'negative'),
            '좌석이 넓어요.': ('seating', 'positive'),
        }
        return [{'review_id': r.review_id, 'quote': r.content[:160],
                 'topic': labels.get(r.content, ('other', 'neutral'))[0],
                 'sentiment': labels.get(r.content, ('other', 'neutral'))[1]} for r in reviews]


class SummaryService:
    def __init__(self, path, summarizer):
        self.path, self.summarizer = str(path), summarizer
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute('CREATE TABLE IF NOT EXISTS summaries '
                       '(cafe_id INTEGER PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL)')

    def refresh(self, cafe_id, reviews):
        """Caller must provide the complete current review snapshot for this cafe.

        Revalidate on every read. Changed/deleted inputs invalidate old output
        before generation so failures cannot expose a stale summary.
        """
        selected = sorted((r for r in reviews if r.cafe_id == cafe_id and r.status == 'VISIBLE'
                           and r.deleted_at is None and r.content and r.content.strip()),
                          key=lambda r: r.review_id)
        if len({r.review_id for r in selected}) != len(selected):
            raise ValueError('Duplicate review IDs')
        fingerprint = hashlib.sha256(json.dumps(
            [self.summarizer.version, [asdict(r) for r in selected]],
            ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        with closing(sqlite3.connect(self.path)) as db, db:
            cached = db.execute('SELECT fingerprint, payload FROM summaries WHERE cafe_id=?', (cafe_id,)).fetchone()
            if cached and cached[0] == fingerprint:
                return json.loads(cached[1]), False
            db.execute('DELETE FROM summaries WHERE cafe_id=?', (cafe_id,))
        sources = {r.review_id: r.content for r in selected}
        opinions = validate_opinions(self.summarizer.summarize(selected) if selected else [], sources)
        topics = []
        for topic in sorted({o['topic'] for o in opinions}):
            groups = {sentiment: [o['review_id'] for o in opinions
                      if o['topic'] == topic and o['sentiment'] == sentiment]
                      for sentiment in ('positive', 'negative', 'neutral')}
            topics.append({'topic': topic, 'evidence_ids': groups,
                           'mixed_opinions': bool(groups['positive'] and groups['negative'])})
        excerpts = [{'review_id': o['review_id'], 'quote': o['quote']} for o in opinions]
        payload = {'cafe_id': cafe_id, 'review_count': len(selected),
                   'source_review_ids': list(sources), 'excerpts': excerpts,
                   'generated_at': datetime.now(timezone.utc).isoformat(),
                   'generator_version': self.summarizer.version,
                   'kind': 'structured_extractive_preview', 'schema_version': 2,
                   'opinions': opinions, 'topics': topics,
                   'represented_review_count': len(opinions),
                   'notice': '모의 분류와 원문 발췌입니다. 검증된 매장 사실이나 추천 점수가 아닙니다.'}
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute('INSERT OR REPLACE INTO summaries VALUES (?, ?, ?)',
                       (cafe_id, fingerprint, json.dumps(payload, ensure_ascii=False)))
        return payload, True
