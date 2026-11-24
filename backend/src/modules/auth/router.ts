import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { env } from '../../config/env';
import { exchangeKakaoCode, fetchKakaoUser } from './kakaoClient';
import {
  assertAccessTokenSigner,
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
} from './tokens';
import { userStore, type ServiceUser } from './userStore';
import { object, text } from '../community/validation';
const router = Router();
export default router;
export const sessionRouter = Router();
const attempts = new Map<string, { count: number; until: number }>();
const limited: import('express').RequestHandler = (req, _res, next) => {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  const key = req.baseUrl + ':' + (req.ip ?? 'unknown'),
    current = attempts.get(key) ?? { count: 0, until: now + 60000 };
  if (current.count >= 20 || (!attempts.has(key) && attempts.size >= 10000))
    throw new AppError(
      429,
      '로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    );
  current.count++;
  attempts.set(key, current);
  next();
};
router.use(limited);
sessionRouter.use(limited);
function loginConfig() {
  assertAccessTokenSigner();
  if (!env.kakao.restApiKey || !env.kakao.redirectUri)
    throw new AppError(503, '카카오 로그인 설정이 필요합니다.');
  try {
    const u = new URL(env.kakao.redirectUri);
    if (
      !['http:', 'https:'].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.hash ||
      u.search
    )
      throw 0;
  } catch {
    throw new AppError(503, '카카오 Redirect URI 설정을 확인해 주세요.');
  }
}
const sessionBody = (
  u: ServiceUser,
  accessToken: string,
  refreshToken: string,
) => ({
  accessToken,
  refreshToken,
  user: { id: u.id, nickname: u.nickname, profileImageUrl: u.profileImageUrl },
});
router.post('/kakao/start', async (_req, res) => {
  loginConfig();
  const state = randomBytes(32).toString('hex'),
    flowToken = randomBytes(32).toString('hex');
  await userStore.createLoginFlow(state, flowToken, env.kakao.redirectUri);
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: env.kakao.restApiKey,
    redirect_uri: env.kakao.redirectUri,
    state,
  });
  res.set('Cache-Control', 'no-store').json(
    ok({
      authorizeUrl: 'https://kauth.kakao.com/oauth/authorize?' + query,
      state,
      flowToken,
      redirectUri: env.kakao.redirectUri,
    }),
  );
});
router.post('/kakao', async (req, res) => {
  const body = object(req.body),
    code = text(body.code, '인가 코드', 2048);
  if (body.redirectUri !== env.kakao.redirectUri)
    throw new AppError(400, 'Redirect URI가 일치하지 않습니다.');
  loginConfig();
  const state = text(body.state, '로그인 보안 값', 64),
    flow = text(body.flowToken, '로그인 요청', 64);
  if (!(await userStore.consumeLoginFlow(state, flow, env.kakao.redirectUri)))
    throw new AppError(
      401,
      '로그인 요청이 만료되었거나 이미 사용됐습니다. 다시 시작해 주세요.',
    );
  const token = await exchangeKakaoCode(code, env.kakao),
    profile = await fetchKakaoUser(token),
    u = await userStore.upsertKakaoUser(profile);
  const sessionId = randomUUID(),
    refresh = newRefreshToken();
  const access = signAccessToken({ userId: u.id, role: u.role, sessionId });
  await userStore.saveRefreshToken(
    u.id,
    refresh.hash,
    refresh.expiresAt,
    sessionId,
  );
  res
    .set('Cache-Control', 'no-store')
    .json(ok(sessionBody(u, access, refresh.token)));
});
function readRefresh(body: unknown) {
  const value = (body ?? {}) as { refreshToken?: unknown };
  if (
    typeof value.refreshToken !== 'string' ||
    !value.refreshToken.trim() ||
    value.refreshToken.length > 200
  )
    throw new AppError(400, 'refreshToken 이 없습니다.');
  return value.refreshToken.trim();
}
sessionRouter.post('/refresh', async (req, res) => {
  const oldHash = hashRefreshToken(readRefresh(req.body));
  assertAccessTokenSigner();
  const next = newRefreshToken();
  let access = '';
  const u = await userStore.rotateRefreshToken(
    oldHash,
    next,
    new Date(),
    value => {
      access = signAccessToken({
        userId: value.id,
        role: value.role,
        sessionId: value.sessionId,
      });
    },
  );
  if (!u)
    throw new AppError(401, '로그인이 만료되었습니다. 다시 로그인해 주세요.');
  res
    .set('Cache-Control', 'no-store')
    .json(ok(sessionBody(u, access, next.token)));
});
sessionRouter.post('/logout', async (req, res) => {
  await userStore.revokeRefreshToken(hashRefreshToken(readRefresh(req.body)));
  res.set('Cache-Control', 'no-store').json(ok(null));
});
