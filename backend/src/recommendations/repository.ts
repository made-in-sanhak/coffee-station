import { Conditions, Location } from './contracts';

const menus = [['m1', '아메리카노', 3500, 'COFFEE'], ['m2', '카페라떼', 4500, 'LATTE'],
  ['m3', '바닐라라떼', 5000, 'LATTE'], ['m4', '에스프레소', 3000, 'COFFEE'],
  ['m5', '디카페인 커피', 4000, 'COFFEE'], ['m6', '홍차', 3800, 'TEA']] as const;
export type Recommendation = { cafe: { id: string; name: string }; offer: { id: string; name: string; category: string; price_krw: number; menu_id?: string; size?: string | null; option_name?: string | null; evidence: { is_mock: boolean; source?: string; verified_at?: string; source_reference?: string } }; distance_m: number | null };
export interface MenuRepository { readonly mode: 'mock' | 'mysql'; search(c: Conditions): Promise<Recommendation[]> }

export function distanceMeters(a: Location, b: Location) {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(b.latitude-a.latitude)/2)**2 + Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-a.longitude)/2)**2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1,h)));
}
export class MockMenuRepository implements MenuRepository {
  readonly mode = 'mock' as const;
  async search(c: Conditions) {
    const results: Recommendation[] = menus.filter(m => (c.max_price_krw === null || m[2] <= c.max_price_krw) && (!c.category || m[3] === c.category))
    .map(m => ({ cafe: { id: c.location ? `synthetic-${m[0]}` : 'test-cafe', name: c.location ? '합성 좌표 테스트 매장' : '가상 카페' },
      offer: { id: m[0], name: m[1], category: m[3], price_krw: m[2], evidence: { is_mock: true } }, distance_m: c.location ? distanceMeters(c.location, {latitude:37 + (Number(m[0].slice(1))-1) * 0.001,longitude:127}) : null }));
    return results.filter(r => c.radius_m === undefined || r.distance_m !== null && r.distance_m <= c.radius_m)
      .sort((a,b) => (c.sort_by === 'distance' ? a.distance_m! - b.distance_m! : a.offer.price_krw-b.offer.price_krw) || a.offer.price_krw-b.offer.price_krw || a.offer.id.localeCompare(b.offer.id)).slice(0,c.limit);
  }
}
