import { aiPolicy } from '../../config/aiPolicy';
import { Router } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { conditions, prepare, recommend, validateConfirmation } from './service';
import midtermRouter from './midtermRouter';
import { searchProducts } from './productSearch';
import {prepareProductChat, confirmProductChat} from './productChat';
import {explainProducts} from './productReasons';

const router = Router();
const rates = new Map<string, { count: number; until: number }>();
router.use((req, _res, next) => {
  // Fail closed until team auth, shared quota and user binding are integrated.
  if (env.nodeEnv === 'production') { throw new AppError(503, '사용자 인증·공유 호출 제한 연결 전 운영 추천은 비활성화됩니다.'); }
  const now = Date.now();
  for (const [key, item] of rates) { if (item.until <= now) { rates.delete(key); } }
  const key = req.ip ?? 'local';
  const item = rates.get(key) ?? { count: 0, until: now + aiPolicy.localRateWindowMs };
  if (item.count >= aiPolicy.localRateRequests || rates.size >= aiPolicy.localRateKeys && !rates.has(key)) { throw new AppError(429, '잠시 후 다시 시도하세요.'); }
  item.count++; rates.set(key, item); next();
});
router.use('/mvp', midtermRouter);
router.post('/search', async (req, res) => { res.json(ok(await explainProducts(await searchProducts(req.body?.conditions)))); });
router.post('/chat/prepare', async (req,res) => { res.json(ok(await prepareProductChat(req.body?.message,undefined,req.body?.location))); });
router.post('/chat/confirm', async (req,res) => {
  if (req.body?.confirmed !== true) throw new AppError(409,'조건 확인이 필요합니다.');
  res.json(ok(await explainProducts(await searchProducts(confirmProductChat(req.body?.proposalId)))));
});
router.post('/prepare', async (req, res) => { res.json(ok(await prepare(req.body?.message, req.body?.location))); });
router.post('/confirm', async (req, res) => {
  if (req.body?.confirmed !== true) { throw new AppError(409, '명시적 확인이 필요합니다.'); }
  const c = conditions(req.body.constraints);
  validateConfirmation(req.body.proposal_id);
  res.json(ok(await recommend(c)));
});
router.post('/', async (req, res) => { res.json(ok(await recommend(conditions(req.body?.constraints)))); });
export default router;
