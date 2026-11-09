import { apiFetch } from './client';

export type Source = 'local' | 'server';
export interface Conditions { max_price_krw: number | null; category: string | null; sort_by: 'price'; limit: number }
export interface Prepared {
  proposal_id: string; status: 'AWAITING_CONFIRMATION' | 'NEEDS_CLARIFICATION';
  extraction_mode: string; suggested_constraints: Conditions;
  proposal: { unresolved: string[]; evidence: Record<string, string> };
}
export interface Result {
  status: 'RESULT' | 'QUESTION'; message: string;
  recommendations: Array<{ cafe: { name: string }; offer: { id: string; name: string; price_krw: number; evidence: { is_mock: boolean } } }>;
}
export const SAMPLE = '4천 원 이하 커피를 저렴한 순으로 추천해줘.';
export const menuFixture = [
  ['m1', '아메리카노', 3500, 'COFFEE'], ['m2', '카페라떼', 4500, 'LATTE'],
  ['m3', '바닐라라떼', 5000, 'LATTE'], ['m4', '에스프레소', 3000, 'COFFEE'],
  ['m5', '디카페인 커피', 4000, 'COFFEE'], ['m6', '홍차', 3800, 'TEA'],
] as const;

export function parseBudget(text: string): number | null {
  if (!text.trim()) { return null; }
  if (!/^\d+$/.test(text.trim()) || !Number.isSafeInteger(Number(text))) {
    throw new Error('예산은 0 이상의 정수로 입력하세요.');
  }
  return Number(text);
}

export async function prepare(message: string, source: Source, signal: AbortSignal): Promise<Prepared> {
  if (source === 'server') {
    const data = await apiFetch<Prepared>('/api/recommendations/prepare', { method: 'POST', signal, body: JSON.stringify({ message }) });
    if (data.extraction_mode !== 'mock') { throw new Error('모의 추출 서버 설정을 확인하세요.'); }
    return data;
  }
  const supported = message.trim() === SAMPLE;
  return { proposal_id: 'local-preview', extraction_mode: 'mock',
    status: supported ? 'AWAITING_CONFIRMATION' : 'NEEDS_CLARIFICATION',
    suggested_constraints: { max_price_krw: 4000, category: 'COFFEE', sort_by: 'price', limit: 20 },
    proposal: { unresolved: supported ? [] : ['로컬 모드는 예시 문장만 지원합니다. 예시를 불러와 주세요.'],
      evidence: supported ? { max_price_krw: '4천 원 이하', category: '커피', sort_by: '저렴한 순' } : {} } };
}

export async function confirm(proposal: Prepared, constraints: Conditions, source: Source, signal: AbortSignal): Promise<Result> {
  if (proposal.status !== 'AWAITING_CONFIRMATION') { throw new Error('미해결 조건을 먼저 확인하세요.'); }
  if (source === 'server') {
    const result = await apiFetch<Result>('/api/recommendations/confirm', { method: 'POST', signal,
      body: JSON.stringify({ proposal_id: proposal.proposal_id, confirmed: true, constraints }) });
    if (!['RESULT', 'QUESTION'].includes(result.status) || !Array.isArray(result.recommendations)
      || result.recommendations.some(m => !m.offer.evidence.is_mock)) { throw new Error('모의 추천 응답만 표시할 수 있습니다.'); }
    return result;
  }
  const recommendations = menuFixture.filter(m => (constraints.max_price_krw === null || m[2] <= constraints.max_price_krw)
      && (!constraints.category || m[3] === constraints.category)).sort((a, b) => a[2] - b[2])
    .map(m => ({ cafe: { name: '가상 카페' }, offer: { id: m[0], name: m[1], price_krw: m[2], evidence: { is_mock: true } } }));
  return { status: recommendations.length ? 'RESULT' : 'QUESTION',
    message: recommendations.length ? '임시 데이터 기반 추천입니다.' : '조건에 맞는 메뉴가 없습니다. 예산이나 종류를 변경할까요?', recommendations };
}
