import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { env } from '../config/env';
import { AppError } from '../common/AppError';
import { ok } from '../common/response';
import { validateReviewArtifact } from '../recommendations/reviewArtifact';
const router = Router();
router.get('/:cafeId/review-summary', async (req, res) => {
  if (env.nodeEnv === 'production') { throw new AppError(503, '모의 리뷰 분석은 운영에서 비활성화됩니다.'); }
  if (req.params.cafeId !== '990001') { throw new AppError(404, '모의 분석 대상 매장이 아닙니다.'); }
  let data;
  try { data = JSON.parse(await readFile(env.reviewSummaryFile, 'utf8')); }
  catch { throw new AppError(503, '먼저 모의 리뷰 분석 작업을 실행하세요.'); }
  res.json(ok(validateReviewArtifact(data, 990001)));
});
export default router;
