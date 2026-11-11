import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../common/AppError';
import { aiPolicy } from '../../config/aiPolicy';
import { midtermConditions, MidtermConditions } from './midterm';

interface Extracted {
  conditions: MidtermConditions;
  evidence: Record<string, string>;
  unresolved: string[];
}
export type MidtermExtractor = (message: string) => Promise<unknown>;
// Local mock-only proposals: separate from legacy tokens and never accepted in production.
const key = randomBytes(32);
const sign = (body: string) => createHmac('sha256',key).update(body).digest();
export const mockMidtermExtractor: MidtermExtractor = async message => {
  const base = {menu_code:null,temperature:null,size:null,max_price_krw:null};
  if (message === '4천 원 이하 아이스 아메리카노 추천해줘.') {
    return {conditions:{...base,menu_code:'AMERICANO',temperature:'ICE',max_price_krw:4000},
      evidence:{menu_code:'아메리카노',temperature:'아이스',max_price_krw:'4천 원 이하'},unresolved:[]};
  }
  if (message === '5천 원 미만 따뜻한 카페라떼 추천해줘.') {
    return {conditions:{...base,menu_code:'CAFE_LATTE',temperature:'HOT',max_price_krw:4999},
      evidence:{menu_code:'카페라떼',temperature:'따뜻한',max_price_krw:'5천 원 미만'},unresolved:[]};
  }
  return {conditions:base,evidence:{},unresolved:['모의 추출은 등록된 두 예시만 지원합니다. 칩 입력을 사용하세요.']};
};

export async function prepareMidterm(message: unknown, extractor: MidtermExtractor = mockMidtermExtractor, mode: 'mock' | 'gemini' = 'mock') {
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) { throw new AppError(422,'요청 문장을 확인하세요.'); }
  let p: Extracted;
  try {
    const raw = await extractor(message.trim()) as Extracted;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)
      || Object.keys(raw).some(k=>!['conditions','evidence','unresolved'].includes(k))
      || !raw.evidence || typeof raw.evidence !== 'object' || Array.isArray(raw.evidence)
      || !Array.isArray(raw.unresolved) || raw.unresolved.some(x=>typeof x !== 'string' || !x.trim())) { throw new Error(); }
    const c = midtermConditions(raw.conditions);
    const fields = ['menu_code','temperature','size','max_price_krw'] as const;
    if (fields.some(f=>!Object.hasOwn(raw.conditions,f))
      || Object.entries(raw.evidence).some(([f,q])=>!fields.includes(f as typeof fields[number]) || typeof q !== 'string' || !q.trim() || !message.includes(q))
      || fields.some(f=>c[f] !== null && !raw.evidence[f])) { throw new Error(); }
    p = {conditions:c,evidence:{...raw.evidence},unresolved:[...raw.unresolved]};
  } catch (error) {
    if (error instanceof AppError && [429,503].includes(error.status)) { throw error; }
    throw new AppError(502,'자연어 추출 응답을 검증할 수 없습니다.');
  }
  const body = Buffer.from(JSON.stringify({purpose:'midterm-mock-v1',proposal:p,expires:Date.now()+aiPolicy.proposalTtlSeconds*1000})).toString('base64url');
  return {status:p.unresolved.length?'NEEDS_CLARIFICATION':'AWAITING_CONFIRMATION',
    proposal_id:`${body}.${sign(body).toString('base64url')}`,proposal:p,suggested_constraints:p.conditions,
    extraction_mode:mode,llm_calls:mode === 'gemini' ? 1 : 0,expires_in_seconds:aiPolicy.proposalTtlSeconds};
}

export function confirmMidterm(token: unknown, input: unknown): MidtermConditions {
  try {
    if (typeof token !== 'string' || token.length>20000) { throw new Error(); }
    const [body,sig,extra] = token.split('.');
    const received = Buffer.from(sig,'base64url'), expected = sign(body);
    if (extra || received.length!==expected.length || !timingSafeEqual(received,expected)) { throw new Error(); }
    const data = JSON.parse(Buffer.from(body,'base64url').toString());
    if (data.purpose!=='midterm-mock-v1' || !Number.isSafeInteger(data.expires) || data.expires<=Date.now() || data.proposal.unresolved.length) { throw new Error(); }
  } catch { throw new AppError(409,'만료·미해결 제안입니다. 다시 준비하세요.'); }
  // Explicit complete conditions: omission must not silently remove the proposed budget/menu.
  if (!input || typeof input !== 'object' || ['menu_code','temperature','size','max_price_krw','sort_by','limit'].some(k=>!Object.hasOwn(input,k))) {
    throw new AppError(422,'화면에서 확인한 최종 조건 전체를 전달하세요.');
  }
  return midtermConditions(input);
}
