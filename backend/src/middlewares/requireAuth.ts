import type { RequestHandler } from 'express';
import { AppError } from '../common/AppError';
import { verifyAccessToken, type AccessClaims } from '../modules/auth/tokens';

/**
 * 로그인한 사용자만 허용합니다. 통과하면 res.locals.auth 에 { userId, role } 이 들어갑니다.
 *   router.get('/me', requireAuth, async (_req, res) => {
 *     const { userId } = authOf(res);
 *   });
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.get('authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9_\-.]+)$/.exec(header);
  const claims = match ? verifyAccessToken(match[1]) : null;
  if (!claims) throw new AppError(401, '로그인이 필요합니다. 다시 로그인해 주세요.');
  res.locals.auth = claims;
  next();
};

export const authOf = (res: { locals: Record<string, unknown> }) => res.locals.auth as AccessClaims;
