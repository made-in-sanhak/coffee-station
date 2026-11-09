import { aiPolicy } from '../config/aiPolicy';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../common/AppError';
import { env } from '../config/env';
import { Proposal } from './contracts';

// 서버가 여러 대(ALB 이중화)여도 같은 토큰을 검증할 수 있도록 공통 JWT_SECRET 을 사용합니다.
// 서버마다 다른 임시 키가 생기지 않도록, 임시 키는 자동 테스트에서만 허용합니다.
const configuredSecret = env.jwtSecret || (env.nodeEnv === 'test' ? randomBytes(32).toString('hex') : '');

function signingKey() {
  if (!configuredSecret) { throw new AppError(503, '추천 서명 키(JWT_SECRET)가 설정되지 않았습니다.'); }
  return configuredSecret;
}

export function signProposal(proposal: Proposal) {
  const secret = signingKey();
  const body = Buffer.from(JSON.stringify({ proposal, expires: Date.now() + aiPolicy.proposalTtlSeconds * 1000 })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function validateConfirmation(token: unknown) {
  if (typeof token !== 'string' || token.length > 20000) { throw new AppError(409, '확인 제안을 다시 준비하세요.'); }
  const secret = signingKey();
  try {
    const [body, signature, extra] = token.split('.');
    const expected = createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature, 'base64url');
    if (extra || received.length !== expected.length || !timingSafeEqual(expected, received)) { throw new Error(); }
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.expires <= Date.now() || data.proposal.unresolved.length) { throw new Error(); }
  } catch { throw new AppError(409, '만료되었거나 미해결 조건이 있는 제안입니다. 다시 준비하세요.'); }
}
