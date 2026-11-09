import { AppError } from '../common/AppError';

export interface Location { latitude: number; longitude: number }
export function location(value: unknown): Location {
  const p = value as Location;
  if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some(k => !['latitude','longitude'].includes(k))
    || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180) {
    throw new AppError(422, '유효한 위도·경도를 입력하세요.');
  }
  return { latitude: p.latitude, longitude: p.longitude };
}
export interface Conditions { max_price_krw: number | null; category: string | null; sort_by: 'price' | 'distance'; limit: number; location?: Location; radius_m?: number }
export type Proposal = { max_price_krw: number | null; category: string | null; sort_by: string | null;
  evidence: Record<string, string>; unresolved: string[] };
const categories = ['COFFEE', 'LATTE', 'TEA', 'ETC'];
export const sample = '4천 원 이하 커피를 저렴한 순으로 추천해줘.';
export function conditions(value: unknown): Conditions {
  const c = value as Record<string, unknown>;
  if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(k => !['max_price_krw', 'category', 'sort_by', 'limit', 'location', 'radius_m'].includes(k))) {
    throw new AppError(422, '지원하는 확정 조건을 확인하세요.');
  }
  const price = c.max_price_krw ?? null, category = c.category ?? null;
  if (price !== null && (!Number.isSafeInteger(price) || Number(price) < 0)
    || category !== null && (typeof category !== 'string' || !categories.includes(category))
    || c.sort_by !== undefined && !['price','distance'].includes(c.sort_by as string)
    || c.limit !== undefined && (!Number.isInteger(c.limit) || Number(c.limit) < 1 || Number(c.limit) > 100)) {
    throw new AppError(422, '현재 가격·종류·가격순 정렬만 지원합니다. 거리순은 위치 연결 후 지원합니다.');
  }
  const point = c.location === undefined ? undefined : location(c.location);
  if ((c.sort_by === 'distance' || c.radius_m !== undefined) && !point) { throw new AppError(422, '위치가 필요합니다.'); }
  if (c.radius_m !== undefined && (typeof c.radius_m !== 'number' || !Number.isFinite(c.radius_m) || c.radius_m <= 0)) { throw new AppError(422, '반경은 양수 미터 값이어야 합니다.'); }
  return { ...(point ? {location:point} : {}), ...(c.radius_m !== undefined ? {radius_m:c.radius_m as number} : {}), max_price_krw: price as number | null, category: category as string | null, sort_by: (c.sort_by ?? 'price') as Conditions['sort_by'], limit: Number(c.limit ?? 20) };
}
export function validateProposal(value: unknown, message: string): Proposal {
  const p = value as Proposal;
  if (!p || typeof p !== 'object' || Object.keys(p).some(k => !['max_price_krw', 'category', 'sort_by', 'evidence', 'unresolved'].includes(k))
    || !Array.isArray(p.unresolved) || p.unresolved.some(x => typeof x !== 'string' || !x.trim())
    || !p.evidence || typeof p.evidence !== 'object' || Array.isArray(p.evidence)
    || ![null, 'price', 'distance'].includes(p.sort_by)) { throw new AppError(502, '추출 응답 검증 실패'); }
  try { conditions({ max_price_krw: p.max_price_krw, category: p.category }); }
  catch { throw new AppError(502, '추출 응답 값 검증 실패'); }
  for (const key of ['max_price_krw', 'category', 'sort_by'] as const) {
    if (p[key] === undefined) { throw new AppError(502, '추출 필드 누락'); }
    if (p[key] !== null && (typeof p.evidence[key] !== 'string' || !p.evidence[key].trim() || !message.includes(p.evidence[key]))) {
      throw new AppError(502, '추출 원문 근거 검증 실패');
    }
  }
  if (Object.keys(p.evidence).some(k => !['max_price_krw', 'category', 'sort_by'].includes(k))) { throw new AppError(502, '잘못된 근거 필드'); }
  return { ...p, evidence: { ...p.evidence }, unresolved: p.sort_by === 'distance'
    ? [...p.unresolved, '현재 위치·거리순 검색 연결이 필요합니다.'] : [...p.unresolved] };
}
