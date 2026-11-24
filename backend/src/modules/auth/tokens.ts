import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../common/AppError';
import { env } from '../../config/env';

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1시간
export const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60; // 14일

export type Role = 'USER' | 'OWNER' | 'ADMIN';
export interface AccessClaims {
  userId: number;
  role: Role;
}

// JWT_SECRET 은 추천 확인 토큰에도 쓰이므로, 로그인용 키는 용도 문자열로 분리해 만듭니다.
// 테스트에서는 실행할 때마다 임의 키를 씁니다.
const rootSecret = env.jwtSecret || (env.nodeEnv === 'test' ? randomBytes(32).toString('hex') : '');
const signingKey = rootSecret
  ? createHmac('sha256', rootSecret).update('coffee-station/auth/access-token/v1').digest()
  : null;

const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');
const HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const sign = (key: Buffer, data: string) => createHmac('sha256', key).update(data).digest();

// 서비스 access 토큰 (표준 JWT, HS256)
export function signAccessToken(claims: AccessClaims, now = Date.now()): string {
  if (!signingKey) throw new AppError(500, '로그인 설정(JWT_SECRET)이 없습니다.');
  const iat = Math.floor(now / 1000);
  const payload = base64url(JSON.stringify({
    sub: String(claims.userId), role: claims.role, typ: 'access', iat, exp: iat + ACCESS_TOKEN_TTL_SECONDS,
  }));
  const body = `${HEADER}.${payload}`;
  return `${body}.${sign(signingKey, body).toString('base64url')}`;
}

// 서명·형식·만료를 확인합니다. 어떤 이유로든 유효하지 않으면 null 입니다.
export function verifyAccessToken(token: string, now = Date.now()): AccessClaims | null {
  if (!signingKey) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = sign(signingKey, `${parts[0]}.${parts[1]}`);
  const actual = Buffer.from(parts[2], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  let payload: { sub?: unknown; role?: unknown; typ?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const userId = Number(payload.sub);
  if (payload.typ !== 'access' || typeof payload.sub !== 'string' || !Number.isSafeInteger(userId) || userId < 1) return null;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return null;
  if (payload.role !== 'USER' && payload.role !== 'OWNER' && payload.role !== 'ADMIN') return null;
  return { userId, role: payload.role };
}

// refresh 토큰은 의미 없는 무작위 값이고, DB 에는 해시만 저장합니다.
export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function newRefreshToken(now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token), expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000) };
}
