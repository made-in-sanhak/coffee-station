import { Router } from 'express';
import { env } from '../config/env';
import { AppError } from '../common/AppError';
import { ok } from '../common/response';

const router = Router();
router.get('/:cafeId/review-summary', async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.cafeId)) throw new AppError(422, '매장 ID를 확인하세요.');
  if (!env.internalApiToken) throw new AppError(503, '내부 API 설정을 확인하세요.');
  let response: Response;
  try {
    response = await fetch(new URL(`/cafes/${req.params.cafeId}/review-summary`, env.aiServerUrl), {
      headers: { 'X-Internal-Token': env.internalApiToken }, signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AppError(502, '리뷰 요약 서비스에 연결할 수 없습니다.');
  }
  if (!response.ok) throw new AppError(response.status === 404 ? 404 : 502, '리뷰 요약을 조회할 수 없습니다.');
  const data = await response.json().catch(() => null);
  if (!data || !['READY', 'NO_REVIEWS'].includes(data.status) || !data.summary) {
    throw new AppError(502, '리뷰 요약 응답 형식 오류');
  }
  res.json(ok(data));
});
export default router;
