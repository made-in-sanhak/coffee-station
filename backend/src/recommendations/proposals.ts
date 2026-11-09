import { aiPolicy } from '../config/aiPolicy';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../common/AppError';
import { env } from '../config/env';
import { Proposal } from './contracts';

const secret = env.jwtSecret || randomBytes(32).toString('hex');

export function signProposal(proposal: Proposal) {
  const body = Buffer.from(JSON.stringify({ proposal, expires: Date.now() + aiPolicy.proposalTtlSeconds * 1000 })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function validateConfirmation(token: unknown) {
  if (typeof token !== 'string' || token.length > 20000) { throw new AppError(409, '확인 제안을 다시 준비하세요.'); }
  try {
    const [body, signature, extra] = token.split('.');
    const expected = createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature, 'base64url');
    if (extra || received.length !== expected.length || !timingSafeEqual(expected, received)) { throw new Error(); }
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.expires <= Date.now() || data.proposal.unresolved.length) { throw new Error(); }
  } catch { throw new AppError(409, '만료되었거나 미해결 조건이 있는 제안입니다. 다시 준비하세요.'); }
}
