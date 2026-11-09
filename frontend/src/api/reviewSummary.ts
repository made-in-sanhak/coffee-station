import { apiFetch } from './client';

export interface ReviewSummary {
  data_mode: 'mock';
  status: 'READY' | 'NO_REVIEWS';
  cache_hit: boolean;
  llm_calls: number;
  summary: {
    review_count: number;
    generated_at: string;
    notice: string;
    opinions: Array<{ review_id: number; quote: string; topic: string; sentiment: string }>;
  };
}

export async function getReviewSummary(cafeId: number, source: 'local' | 'server', signal?: AbortSignal): Promise<ReviewSummary> {
  if (source === 'server') {
    const data = await apiFetch<ReviewSummary>(`/api/cafes/${cafeId}/review-summary`, { signal });
    if (data.data_mode !== 'mock' || !Array.isArray(data.summary?.opinions)) {
      throw new Error('모의 리뷰 응답만 표시할 수 있습니다.');
    }
    return data;
  }
  return {
    data_mode: 'mock', status: 'READY', cache_hit: false, llm_calls: 0,
    summary: { review_count: 3, generated_at: '2026-11-09T00:00:00Z',
      notice: '임시 리뷰 발췌입니다. 실제 매장 정보가 아닙니다.',
      opinions: [
        { review_id: 1, quote: '평일에는 조용해요.', topic: 'noise', sentiment: 'positive' },
        { review_id: 2, quote: '주말에는 시끄러워요.', topic: 'noise', sentiment: 'negative' },
        { review_id: 3, quote: '좌석이 넓어요.', topic: 'seating', sentiment: 'positive' },
      ] },
  };
}
