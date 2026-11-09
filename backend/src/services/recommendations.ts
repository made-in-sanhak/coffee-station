import { aiPolicy } from '../config/aiPolicy';
import { AppError } from '../common/AppError';
import { env } from '../config/env';
import { Conditions, location } from '../recommendations/contracts';
import { extract } from '../recommendations/extraction';
import { signProposal } from '../recommendations/proposals';
import { MenuRepository, MockMenuRepository } from '../recommendations/repository';
export { conditions, sample } from '../recommendations/contracts';
export { validateConfirmation } from '../recommendations/proposals';

export async function prepare(message: unknown, point?: unknown) {
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) { throw new AppError(422, '요청 문장을 확인하세요.'); }
  const position = point === undefined ? undefined : location(point);
  const proposal = await extract(message);
  if (position && proposal.sort_by === 'distance' && proposal.unresolved.at(-1) === '현재 위치·거리순 검색 연결이 필요합니다.') { proposal.unresolved.pop(); }
  return { status: proposal.unresolved.length ? 'NEEDS_CLARIFICATION' : 'AWAITING_CONFIRMATION',
    proposal_id: signProposal(proposal), proposal, extraction_mode: env.extractionMode,
    llm_calls: env.extractionMode === 'mock' ? 0 : 1, expires_in_seconds: aiPolicy.proposalTtlSeconds,
    suggested_constraints: { ...(position ? {location:position} : {}), max_price_krw: proposal.max_price_krw, category: proposal.category, sort_by: proposal.sort_by ?? 'price', limit: 20 },
    notice: '조건을 확인하세요. 기본 정렬은 가격순입니다. 미해결 조건은 문장을 수정하여 다시 준비하세요.' };
}
export async function recommend(c: Conditions, repository: MenuRepository = new MockMenuRepository()) {
  const recommendations = await repository.search(c);
  return { status: recommendations.length ? 'RESULT' : 'QUESTION', message: recommendations.length ? (repository.mode === 'mock' ? '임시 데이터 기반 추천입니다.' : '등록된 가격 데이터 기반 추천입니다.') : '검색 조건을 변경할까요?',
    recommendations, llm_calls: 0, trace: [{ event: 'search', mode: 'express-direct', data_mode: repository.mode, result_count: recommendations.length }] };
}
