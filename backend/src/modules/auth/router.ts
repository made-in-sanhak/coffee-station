import { Router } from 'express';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { env } from '../../config/env';
import { exchangeKakaoCode, fetchKakaoUser } from './kakaoClient';
import { hashRefreshToken, newRefreshToken, signAccessToken } from './tokens';
import { userStore, type ServiceUser } from './userStore';

// 앱이 기대하는 로그인 응답: { accessToken, refreshToken, user: { id, nickname, profileImageUrl } }
async function issueSession(user: ServiceUser) {
  const refresh = newRefreshToken();
  await userStore.saveRefreshToken(user.id, refresh.hash, refresh.expiresAt);
  return sessionBody(user, signAccessToken({ userId: user.id, role: user.role }), refresh.token);
}
const sessionBody = (user: ServiceUser, accessToken: string, refreshToken: string) => ({
  accessToken,
  refreshToken,
  user: { id: user.id, nickname: user.nickname, profileImageUrl: user.profileImageUrl },
});

const readRefreshToken = (body: unknown) => {
  const value = (body ?? {}) as { refreshToken?: unknown };
  if (typeof value.refreshToken !== 'string' || !value.refreshToken.trim() || value.refreshToken.length > 200) {
    throw new AppError(400, 'refreshToken 이 없습니다.');
  }
  return value.refreshToken.trim();
};

// /auth — 앱이 /api 없이 호출하는 카카오 로그인
const router = Router();

// POST /auth/kakao  { code, redirectUri }
router.post('/kakao', async (req, res) => {
  const { code, redirectUri } = (req.body ?? {}) as { code?: unknown; redirectUri?: unknown };
  if (typeof code !== 'string' || !code.trim()) throw new AppError(400, '인가 코드가 없습니다.');
  // 토큰 교환에는 서버 설정값을 씁니다. 앱이 보낸 주소는 서버 설정과 같을 때만 허용합니다.
  if (typeof redirectUri !== 'string' || redirectUri !== env.kakao.redirectUri) {
    throw new AppError(400, 'Redirect URI가 일치하지 않습니다.');
  }

  const kakaoToken = await exchangeKakaoCode(code.trim(), env.kakao);
  const profile = await fetchKakaoUser(kakaoToken);
  const user = await userStore.upsertKakaoUser(profile);
  res.json(ok(await issueSession(user)));
});

export default router;

// /api/auth — 토큰 재발급·로그아웃
export const sessionRouter = Router();

// POST /api/auth/refresh  { refreshToken } → 새 access·refresh 토큰 (기존 refresh 토큰은 폐기)
sessionRouter.post('/refresh', async (req, res) => {
  const oldHash = hashRefreshToken(readRefreshToken(req.body));
  const next = newRefreshToken();
  const user = await userStore.rotateRefreshToken(oldHash, next);
  if (!user) throw new AppError(401, '로그인이 만료되었습니다. 다시 로그인해 주세요.');
  res.json(ok(sessionBody(user, signAccessToken({ userId: user.id, role: user.role }), next.token)));
});

// POST /api/auth/logout  { refreshToken } → refresh 토큰 폐기. 이미 폐기된 토큰이어도 성공으로 응답합니다.
sessionRouter.post('/logout', async (req, res) => {
  await userStore.revokeRefreshToken(hashRefreshToken(readRefreshToken(req.body)));
  res.json(ok(null));
});
