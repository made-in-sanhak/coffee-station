import { Router } from 'express';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { authOf, requireAuth } from '../../middlewares/requireAuth';
import { userStore } from '../auth/userStore';

const router = Router();

// GET /api/users/me — 로그인한 내 정보
router.get('/me', requireAuth, async (_req, res) => {
  const user = await userStore.findUser(authOf(res).userId);
  if (!user) throw new AppError(401, '회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
  res.json(ok(user));
});

export default router;
