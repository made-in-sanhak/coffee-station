import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../common/AppError';

export interface Actor { id: string; nickname: string }
// Shared service-token contract. Never accepts Kakao tokens or preview/mock identities.
export function verifyAccessToken(token: string, secret: string, now = Math.floor(Date.now()/1000)): string {
  const invalid = () => new AppError(401, '유효한 서비스 로그인이 필요합니다.');
  if (token.length > 4096 || secret.length < 32 || /^(change-me|test-secret)/.test(secret)) throw invalid();
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw invalid();
  const expected = createHmac('sha256', secret).update(parts[0]+'.'+parts[1]).digest();
  const signature = Buffer.from(parts[2], 'base64url');
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw invalid();
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || header.crit !== undefined ||
        body.iss !== 'coffee-station' || body.aud !== 'coffee-station-app' || body.token_use !== 'access' ||
        !Number.isSafeInteger(body.exp) || body.exp <= now ||
        !Number.isSafeInteger(body.iat) || body.iat > now + 30 || body.iat >= body.exp ||
        (body.nbf !== undefined && (!Number.isSafeInteger(body.nbf) || body.nbf > now)) ||
        typeof body.sub !== 'string' || !/^[1-9]\d{0,15}$/.test(body.sub) || !Number.isSafeInteger(Number(body.sub))) throw invalid();
    return body.sub;
  } catch { throw invalid(); }
}
export async function actor(req: Request, required = false): Promise<Actor | null> {
  const auth = req.headers.authorization;
  if (!auth) { if (required) throw new AppError(401, '로그인이 필요합니다.'); return null; }
  if (!auth.startsWith('Bearer ')) throw new AppError(401, '인증 형식이 올바르지 않습니다.');
  if (env.jwtSecret.length < 32 || env.jwtSecret.startsWith('change-me')) throw new AppError(503, '서비스 인증 설정이 필요합니다.');
  const userId = verifyAccessToken(auth.slice(7), env.jwtSecret);
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT CAST(user_id AS CHAR) AS id, nickname FROM community_accounts WHERE user_id=? AND active=1', [userId]);
  if (!rows.length) throw new AppError(401, '사용할 수 없는 계정입니다.');
  return { id: rows[0].id, nickname: rows[0].nickname };
}
