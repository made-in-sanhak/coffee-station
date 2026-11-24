import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { AppError } from '../../common/AppError';
import { env } from '../../config/env';
export const ACCESS_TOKEN_TTL_SECONDS = 3600;
export const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 3600;
export type Role = 'USER' | 'OWNER' | 'ADMIN';
export interface AccessClaims {
  userId: number;
  role: Role;
  sessionId?: string;
}
const TEST_SECRET = randomBytes(32).toString('hex');
function signingKey(): Buffer | null {
  const secret = env.jwtSecret || (env.nodeEnv === 'test' ? TEST_SECRET : '');
  return secret.length >= 32 && !/^(change-me|test-secret)/.test(secret)
    ? createHmac('sha256', secret)
        .update('coffee-station/auth/access-token/v1')
        .digest()
    : null;
}
export function assertAccessTokenSigner() {
  if (!signingKey())
    throw new AppError(500, '로그인 설정(JWT_SECRET)이 없습니다.');
}
export const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export function newRefreshToken(now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
  };
}
export function signAccessToken(claims: AccessClaims, now = Date.now()) {
  const key = signingKey();
  if (!key) throw new AppError(500, '로그인 설정(JWT_SECRET)이 없습니다.');
  const iat = Math.floor(now / 1000);
  const body = [
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: String(claims.userId),
      role: claims.role,
      sid: claims.sessionId ?? randomUUID(),
      iss: 'coffee-station',
      aud: 'coffee-station-app',
      typ: 'access',
      iat,
      exp: iat + ACCESS_TOKEN_TTL_SECONDS,
    },
  ]
    .map(v => Buffer.from(JSON.stringify(v)).toString('base64url'))
    .join('.');
  return (
    body + '.' + createHmac('sha256', key).update(body).digest('base64url')
  );
}
export function verifyAccessToken(
  token: string,
  now = Date.now(),
): AccessClaims | null {
  const key = signingKey();
  if (!key || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(p => !p || !/^[A-Za-z0-9_-]+$/.test(p)))
    return null;
  const expected = createHmac('sha256', key)
    .update(parts[0] + '.' + parts[1])
    .digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const h = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    if (
      h.alg !== 'HS256' ||
      h.typ !== 'JWT' ||
      h.crit !== undefined ||
      p.typ !== 'access' ||
      p.iss !== 'coffee-station' ||
      p.aud !== 'coffee-station-app' ||
      typeof p.sub !== 'string' ||
      !/^[1-9]\d{0,15}$/.test(p.sub) ||
      !Number.isSafeInteger(Number(p.sub)) ||
      !['USER', 'OWNER', 'ADMIN'].includes(p.role) ||
      typeof p.sid !== 'string' ||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(p.sid) ||
      !Number.isSafeInteger(p.exp) ||
      p.exp <= seconds ||
      !Number.isSafeInteger(p.iat) ||
      p.iat > seconds + 30 ||
      p.iat >= p.exp ||
      p.exp - p.iat > ACCESS_TOKEN_TTL_SECONDS ||
      (p.nbf !== undefined && (!Number.isSafeInteger(p.nbf) || p.nbf > seconds))
    )
      return null;
    return { userId: Number(p.sub), role: p.role, sessionId: p.sid };
  } catch {
    return null;
  }
}
