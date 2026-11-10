import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../common/AppError';
import { aiPolicy } from '../../config/aiPolicy';
import { Proposal, validateProposal } from './contracts';

// Integration seam: userId must come from verified server authentication, never request body.
// Read-only confirmations may repeat until expiry; each search reads current prices.
export function createOwnedProposals(key: string, now: () => number = Date.now) {
  if (Buffer.byteLength(key) < 32) { throw new Error('A separate proposal signing key of at least 32 bytes is required'); }
  const purpose = 'coffee-recommendation-confirmation';
  const user = (id: string) => {
    if (typeof id !== 'string' || !id.trim() || id.length > 200) { throw new AppError(401, '인증된 사용자 정보가 필요합니다.'); }
  };
  const signature = (body: string) => createHmac('sha256', key).update(body).digest();
  return {
    issue(userId: string, message: string, proposal: Proposal) {
      user(userId);
      if (typeof message !== 'string' || !message.trim() || message.length > 4000) { throw new AppError(422, '요청 문장을 확인하세요.'); }
      const checked = validateProposal(proposal, message);
      const issued = now();
      const body = Buffer.from(JSON.stringify({ version: 1, purpose, userId, message,
        proposal: checked, issued, expires: issued + aiPolicy.proposalTtlSeconds * 1000 })).toString('base64url');
      const token = `${body}.${signature(body).toString('base64url')}`;
      if (token.length > 20000) { throw new AppError(422, '확인 제안이 너무 큽니다.'); }
      return token;
    },
    verify(token: unknown, userId: string): Proposal {
      user(userId);
      try {
        if (typeof token !== 'string' || token.length > 20000) { throw new Error(); }
        const parts = token.split('.');
        if (parts.length !== 2 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) { throw new Error(); }
        const [body, encoded] = parts;
        const received = Buffer.from(encoded, 'base64url'), expected = signature(body);
        if (received.toString('base64url') !== encoded || received.length !== expected.length || !timingSafeEqual(received, expected)) { throw new Error(); }
        const d = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        const time = now();
        if (!d || d.version !== 1 || d.purpose !== purpose || d.userId !== userId
          || !Number.isSafeInteger(d.issued) || !Number.isSafeInteger(d.expires)
          || d.issued > time || d.expires <= time || d.expires - d.issued !== aiPolicy.proposalTtlSeconds * 1000
          || typeof d.message !== 'string' || !d.message.trim() || d.message.length > 4000) { throw new Error(); }
        const proposal = validateProposal(d.proposal, d.message);
        if (proposal.unresolved.length) { throw new Error(); }
        return proposal;
      } catch { throw new AppError(409, '확인 제안의 사용자·유효성을 확인하고 다시 준비하세요.'); }
    },
  };
}
