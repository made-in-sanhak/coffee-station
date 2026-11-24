import { createHmac, createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env';
export const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const opaque = () => randomBytes(32).toString('hex');
export function accessToken(userId: string, sessionId: string) {
  const now = Math.floor(Date.now() / 1000);
  const data = [
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: userId,
      sid: sessionId,
      iss: 'coffee-station',
      aud: 'coffee-station-app',
      token_use: 'access',
      iat: now,
      exp: now + 3600,
    },
  ]
    .map(v => Buffer.from(JSON.stringify(v)).toString('base64url'))
    .join('.');
  return (
    data +
    '.' +
    createHmac('sha256', env.jwtSecret).update(data).digest('base64url')
  );
}
