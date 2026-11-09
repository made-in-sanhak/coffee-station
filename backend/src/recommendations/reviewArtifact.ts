import { AppError } from '../common/AppError';

// Validate the display contract; original-review evidence is checked by the Python job.
export function validateReviewArtifact(value: unknown, cafeId: number) {
  const object = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const integer = (v: any) => Number.isSafeInteger(v) && v >= 0;
  const text = (v: any) => typeof v === 'string' && v.trim().length > 0;
  const d = value as any;
  const s = d?.summary;
  if (!object(d) || d.data_mode !== 'mock' || !['READY', 'NO_REVIEWS'].includes(d.status)
    || typeof d.cache_hit !== 'boolean' || !integer(d.llm_calls) || !object(s)
    || s.cafe_id !== cafeId || !integer(s.review_count) || !text(s.notice)
    || !text(s.generated_at) || !Number.isFinite(Date.parse(s.generated_at))
    || !Array.isArray(s.opinions) || !Array.isArray(s.source_review_ids)
    || s.source_review_ids.some((id: any) => !integer(id) || id < 1)
    || new Set(s.source_review_ids).size !== s.review_count
    || s.source_review_ids.length !== s.review_count
    || s.opinions.some((o: any) => !object(o) || !s.source_review_ids.includes(o.review_id)
      || !text(o.quote) || !['noise', 'seating', 'other'].includes(o.topic)
      || !['positive', 'negative', 'neutral'].includes(o.sentiment))
    || (d.status === 'NO_REVIEWS' ? s.review_count !== 0 || s.opinions.length !== 0 : s.review_count === 0)) {
    throw new AppError(503, '분석 결과 검증 실패');
  }
  return d;
}
