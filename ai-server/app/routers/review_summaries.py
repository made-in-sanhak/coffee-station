"""Mock-only review summary API. No MySQL or external model access."""
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Path as PathParam
from app.core.security import verify_internal_token
from app.repositories.reviews import MockReviewRepository
from app.review_summary import Review, SummaryService, MockReviewSummarizer

router = APIRouter(tags=['review-summaries'], dependencies=[Depends(verify_internal_token)])
lock = Lock()
repository = MockReviewRepository([
    Review(1, 990001, '평일에는 조용해요.'),
    Review(2, 990001, '주말에는 시끄러워요.'),
    Review(3, 990001, '좌석이 넓어요.'),
    Review(4, 990001, '숨겨진 의견', status='HIDDEN'),
])


def get_summary_service():
    folder = Path(__file__).resolve().parents[2] / '.cache'
    folder.mkdir(exist_ok=True)
    return SummaryService(folder / 'mock_review_summaries.sqlite', MockReviewSummarizer())


@router.get('/cafes/{cafe_id}/review-summary')
def review_summary(cafe_id: int = PathParam(gt=0), service=Depends(get_summary_service)):
    # 990002 is a known synthetic cafe with no reviews.
    if cafe_id not in (990001, 990002):
        raise HTTPException(404, 'Unknown mock cafe')
    with lock:
        summary, refreshed = service.refresh(cafe_id, repository.list_reviews(cafe_id))
    return {'data_mode': 'mock', 'llm_calls': 0, 'cache_hit': not refreshed,
            'status': 'READY' if summary['review_count'] else 'NO_REVIEWS', 'summary': summary}
