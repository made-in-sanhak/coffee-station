import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { object, text } from '../community/validation';
import { loginConfig, kakaoProfile } from './kakao';
import { accessToken, hash, opaque } from './tokens';

export const loginRouter = Router();
export const sessionRouter = Router();
// Bounded local limiter: protects this instance; edge/shared limits remain a deployment concern.
const attempts = new Map<string, { count: number; until: number }>();
loginRouter.use((req, _res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until < now) attempts.delete(key);
  const key = req.ip ?? 'unknown',
    current = attempts.get(key) ?? { count: 0, until: now + 60000 };
  if (current.count >= 20 || (!attempts.has(key) && attempts.size >= 10000))
    throw new AppError(
      429,
      '로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    );
  current.count++;
  attempts.set(key, current);
  next();
});
loginRouter.post('/kakao/start', async (_req, res) => {
  loginConfig();
  const state = opaque(),
    flowToken = opaque();
  await pool.execute(
    'DELETE FROM auth_login_flows WHERE expires_at<CURRENT_TIMESTAMP(3)',
  );
  await pool.execute(
    'INSERT INTO auth_login_flows(flow_hash,state_hash,redirect_uri,expires_at) VALUES(?,?,?,DATE_ADD(CURRENT_TIMESTAMP(3),INTERVAL 5 MINUTE))',
    [hash(flowToken), hash(state), env.kakao.redirectUri],
  );
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: env.kakao.restApiKey,
    redirect_uri: env.kakao.redirectUri,
    state,
  });
  res
    .set('Cache-Control', 'no-store')
    .json(
      ok({
        authorizeUrl: 'https://kauth.kakao.com/oauth/authorize?' + query,
        state,
        flowToken,
        redirectUri: env.kakao.redirectUri,
      }),
    );
});
loginRouter.post('/kakao', async (req, res) => {
  loginConfig();
  const body = object(req.body),
    code = text(body.code, '인가 코드', 2048),
    state = text(body.state, '로그인 보안 값', 64),
    flow = text(body.flowToken, '로그인 요청', 64);
  if (body.redirectUri !== env.kakao.redirectUri)
    throw new AppError(400, 'Redirect URI가 일치하지 않습니다.');
  const [flowResult] = await pool.execute<any>(
    'DELETE FROM auth_login_flows WHERE flow_hash=? AND state_hash=? AND redirect_uri=? AND expires_at>CURRENT_TIMESTAMP(3)',
    [hash(flow), hash(state), env.kakao.redirectUri],
  );
  if (flowResult.affectedRows !== 1)
    throw new AppError(
      401,
      '로그인 요청이 만료되었거나 이미 사용됐습니다. 다시 시작해 주세요.',
    );
  const profile = await kakaoProfile(code),
    sessionId = randomUUID(),
    refresh = sessionId + '.' + opaque();
  const conn = await pool.getConnection();
  let userId: string;
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO auth_users(kakao_id,profile_image_url) VALUES(?,?) ON DUPLICATE KEY UPDATE profile_image_url=VALUES(profile_image_url)',
      [profile.kakaoId, profile.profileImageUrl],
    );
    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT CAST(user_id AS CHAR) id FROM auth_users WHERE kakao_id=? FOR UPDATE',
      [profile.kakaoId],
    );
    userId = rows[0].id;
    if (!Number.isSafeInteger(Number(userId)))
      throw new AppError(503, '회원 식별 범위를 초과했습니다.');
    await conn.execute(
      'INSERT INTO community_accounts(user_id,nickname) VALUES(?,?) ON DUPLICATE KEY UPDATE nickname=VALUES(nickname)',
      [userId, profile.nickname],
    );
    const [accounts] = await conn.execute<RowDataPacket[]>(
      'SELECT active FROM community_accounts WHERE user_id=? FOR UPDATE',
      [userId],
    );
    if (!accounts[0].active)
      throw new AppError(403, '사용할 수 없는 계정입니다.');
    await conn.execute(
      'INSERT INTO auth_sessions(id,user_id,refresh_hash,expires_at) VALUES(?,?,?,DATE_ADD(CURRENT_TIMESTAMP(3),INTERVAL 30 DAY))',
      [sessionId, userId, hash(refresh)],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res
    .set('Cache-Control', 'no-store')
    .json(
      ok({
        accessToken: accessToken(userId!, sessionId),
        refreshToken: refresh,
        user: {
          id: Number(userId!),
          nickname: profile.nickname,
          profileImageUrl: profile.profileImageUrl,
        },
      }),
    );
});
const refreshInput = (body: unknown) => {
  const token = text(object(body).refreshToken, '갱신 토큰', 110);
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\.[a-f0-9]{64}$/.test(token))
    throw new AppError(401, '유효한 갱신 토큰이 필요합니다.');
  return { token, id: token.split('.')[0] };
};
sessionRouter.post('/refresh', async (req, res) => {
  loginConfig();
  const input = refreshInput(req.body),
    conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT s.user_id,a.nickname,u.profile_image_url FROM auth_sessions s JOIN community_accounts a ON a.user_id=s.user_id JOIN auth_users u ON u.user_id=s.user_id WHERE s.id=? AND s.refresh_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP(3) AND a.active=1 FOR UPDATE`,
      [input.id, hash(input.token)],
    );
    if (!rows.length)
      throw new AppError(401, '로그인이 만료되었습니다. 다시 로그인해 주세요.');
    const refresh = input.id + '.' + opaque();
    await conn.execute('UPDATE auth_sessions SET refresh_hash=? WHERE id=?', [
      hash(refresh),
      input.id,
    ]);
    const r = rows[0];
    await conn.commit();
    res
      .set('Cache-Control', 'no-store')
      .json(
        ok({
          accessToken: accessToken(String(r.user_id), input.id),
          refreshToken: refresh,
          user: {
            id: Number(r.user_id),
            nickname: r.nickname,
            profileImageUrl: r.profile_image_url,
          },
        }),
      );
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});
sessionRouter.post('/logout', async (req, res) => {
  const input = refreshInput(req.body);
  await pool.execute(
    'UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP(3)) WHERE id=? AND refresh_hash=?',
    [input.id, hash(input.token)],
  );
  res.set('Cache-Control', 'no-store').json(ok(null));
});
