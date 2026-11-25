import type { RequestHandler, Request } from 'express';
import { AppError } from '../common/AppError';
import { verifyAccessToken, type AccessClaims } from '../modules/auth/tokens';
import { userStore, type ServiceUser } from '../modules/auth/userStore';
export async function authenticatedUser(
  req: Request,
  required = true,
): Promise<ServiceUser | null> {
  const header = req.get('authorization');
  if (!header) {
    if (required) throw new AppError(401, '로그인이 필요합니다.');
    return null;
  }
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(header),
    claims = match ? verifyAccessToken(match[1]) : null;
  if (!claims) throw new AppError(401, '유효한 서비스 로그인이 필요합니다.');
  const u = await userStore.authenticate(claims);
  if (!u) throw new AppError(401, '사용할 수 없는 계정 또는 세션입니다.');
  return u;
}
export const requireAuth: RequestHandler = async (req, res, next) => {
  const u = (await authenticatedUser(req))!;
  res.locals.auth = { userId: u.id, role: u.role };
  res.locals.user = u;
  next();
};
export const authOf = (res: { locals: Record<string, unknown> }) =>
  res.locals.auth as AccessClaims;
