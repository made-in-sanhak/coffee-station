import { apiFetch } from '../client';

export type MidtermConditions = {
  menu_code: 'AMERICANO' | 'CAFE_LATTE' | null;
  temperature: 'ICE' | 'HOT' | null;
  size: string | null;
  max_price_krw: number | null;
  sort_by: 'price';
  limit: number;
};
export type MidtermProposal = {
  status: 'NEEDS_CLARIFICATION' | 'AWAITING_CONFIRMATION';
  proposal_id: string;
  suggested_constraints: MidtermConditions;
  proposal: { evidence: Record<string, string>; unresolved: string[] };
  extraction_mode: 'mock' | 'gemini';
};
export type MidtermResult = {
  status: 'RESULT' | 'QUESTION';
  notice: string;
  data_mode: 'mock' | 'database';
  recommendations: {offer_id: string; cafe_id: string; cafe_name: string; menu_name: string;
    temperature: string; size: string; price_krw: number; reason: string}[];
};
const post = <T>(action: string, body: unknown) => {
  if (!__DEV__) return Promise.reject(new Error('개발용 테스트입니다.'));
  return apiFetch<T>(`/api/recommendations/mvp/${action}`, {
    method: 'POST', body: JSON.stringify(body), authentication: 'none',
  });
};
export const midtermApi = {
  search: (constraints: MidtermConditions) => post<MidtermResult>('search', {constraints}),
  prepare: (message: string) => post<MidtermProposal>('prepare', {message}),
  confirm: (proposal_id: string, constraints: MidtermConditions) =>
    post<MidtermResult>('confirm', {proposal_id, constraints, confirmed: true}),
};
