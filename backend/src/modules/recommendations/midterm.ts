import { AppError } from '../../common/AppError';

export interface MidtermConditions {
  menu_code: 'AMERICANO' | 'CAFE_LATTE' | null;
  temperature: 'ICE' | 'HOT' | null;
  size: string | null;
  max_price_krw: number | null;
  sort_by: 'price';
  limit: number;
}
export interface MidtermOffer {
  cafe_id: string; menu_id: string; offer_id: string; cafe_name: string; menu_name: string;
  menu_code: 'AMERICANO' | 'CAFE_LATTE'; temperature: 'ICE' | 'HOT'; size: string;
  price_krw: number; available: boolean | null;
  source: string; verified_at: string | null; is_mock: boolean;
}
export interface MidtermRepository {
  readonly mode: 'mock' | 'database';
  // Return bounded eligible candidates; actual SQL mapping is added after schema review.
  search(conditions: MidtermConditions): Promise<MidtermOffer[]>;
}

export function midtermConditions(value: unknown): MidtermConditions {
  const v = value as Record<string, unknown>;
  const fail = () => { throw new AppError(422, '발표용 메뉴·옵션·가격 조건을 확인하세요.'); };
  if (!v || typeof v !== 'object' || Array.isArray(v)
    || Object.keys(v).some(k => !['menu_code','temperature','size','max_price_krw','sort_by','limit'].includes(k))) { return fail(); }
  const menu = v.menu_code ?? null, temp = v.temperature ?? null, size = v.size ?? null, price = v.max_price_krw ?? null;
  if (menu !== null && menu !== 'AMERICANO' && menu !== 'CAFE_LATTE'
    || temp !== null && temp !== 'ICE' && temp !== 'HOT'
    || size !== null && (typeof size !== 'string' || !size.trim() || size.length > 40)
    || price !== null && (!Number.isSafeInteger(price) || Number(price) < 0)
    || v.sort_by !== undefined && v.sort_by !== 'price'
    || v.limit !== undefined && (!Number.isInteger(v.limit) || Number(v.limit) < 1 || Number(v.limit) > 20)) { return fail(); }
  return { menu_code: menu as MidtermConditions['menu_code'], temperature: temp as MidtermConditions['temperature'],
    size: size as string | null, max_price_krw: price as number | null, sort_by: 'price', limit: Number(v.limit ?? 10) };
}

function matches(o: MidtermOffer, c: MidtermConditions) {
  return o.available === true && Number.isSafeInteger(o.price_krw) && o.price_krw >= 0
    && (c.menu_code === null || o.menu_code === c.menu_code)
    && (c.temperature === null || o.temperature === c.temperature)
    && (c.size === null || o.size === c.size)
    && (c.max_price_krw === null || o.price_krw <= c.max_price_krw);
}
const demoOffers: MidtermOffer[] = [
  ['demo-a','demo-am','demo-1','AMERICANO','ICE',3000],
  ['demo-a','demo-am','demo-2','AMERICANO','HOT',2800],
  ['demo-b','demo-am','demo-3','AMERICANO','ICE',4000],
  ['demo-a','demo-la','demo-4','CAFE_LATTE','ICE',4500],
  ['demo-b','demo-la','demo-5','CAFE_LATTE','HOT',4900],
  ['demo-b','demo-la','demo-6','CAFE_LATTE','ICE',5000],
].map(([cafe,menu,offer,code,temp,price]) => ({ cafe_id: String(cafe), menu_id: String(menu), offer_id: String(offer),
  cafe_name: '가상 매장', menu_name: code === 'AMERICANO' ? '아메리카노' : '카페라떼',
  menu_code: code as MidtermOffer['menu_code'], temperature: temp as MidtermOffer['temperature'], size: 'M',
  price_krw: Number(price), available: true, source: 'MVP_FIXTURE', verified_at: null, is_mock: true }));

export class MockMidtermRepository implements MidtermRepository {
  readonly mode = 'mock' as const;
  async search(c: MidtermConditions) { return demoOffers.filter(o => matches(o,c)).map(o => ({...o})); }
}

export async function recommendMidterm(input: unknown, repository: MidtermRepository = new MockMidtermRepository()) {
  const c = midtermConditions(input);
  let rows: MidtermOffer[];
  try { rows = await repository.search(c); }
  catch { throw new AppError(503, '추천 데이터를 조회할 수 없습니다.'); }
  if (!Array.isArray(rows) || rows.some(o => !o || typeof o !== 'object'
    || ![o.cafe_id,o.menu_id,o.offer_id,o.cafe_name,o.menu_name,o.size,o.source].every(s => typeof s === 'string' && s.trim())
    || !['AMERICANO','CAFE_LATTE'].includes(o.menu_code) || !['HOT','ICE'].includes(o.temperature)
    || typeof o.is_mock !== 'boolean' || o.is_mock !== (repository.mode === 'mock')
    || o.verified_at !== null && (typeof o.verified_at !== 'string' || !Number.isFinite(Date.parse(o.verified_at)))
    || !Number.isSafeInteger(o.price_krw) || o.price_krw < 0
    || ![true,false,null].includes(o.available))) { throw new AppError(503, '추천 데이터 형식을 확인할 수 없습니다.'); }
  const recommendations = rows.filter(o => matches(o,c))
    .sort((a,b) => a.price_krw-b.price_krw || a.offer_id.localeCompare(b.offer_id)).slice(0,c.limit)
    .map(o => ({ ...o, tags: [o.menu_name,o.temperature,o.size],
      reason: `${o.menu_name} ${o.temperature} ${o.size}, ${o.price_krw}원` + (c.max_price_krw !== null ? `으로 예산 ${c.max_price_krw}원 이하입니다.` : '입니다.') }));
  return { status: recommendations.length ? 'RESULT' : 'QUESTION', data_mode: repository.mode,
    notice: repository.mode === 'mock' ? '임시 메뉴·가격입니다. 실제 매장 정보가 아닙니다.' : 'DB 시연 자료입니다. 브랜드 가격이 포함될 수 있으며 실제 판매·가격 확인일을 보장하지 않습니다.',
    constraints: c, recommendations, llm_calls: 0 };
}
