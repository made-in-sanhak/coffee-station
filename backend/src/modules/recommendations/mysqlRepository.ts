import { AppError } from '../../common/AppError';
import { Conditions, conditions } from './contracts';
import { MenuRepository, Recommendation } from './repository';

// Inject a pooled executor; this module never opens connections or reads .env.
export type SelectRows = (sql: string, parameters: Array<string | number>) => Promise<Record<string, unknown>[]>;
export class MySQLMenuRepository implements MenuRepository {
  readonly mode = 'mysql' as const;
  private readonly cafeIds: string[];
  constructor(private readonly select: SelectRows, cafeIds: string[]) {
    if (!cafeIds.length || cafeIds.length > 100 || cafeIds.some(id => !/^[1-9]\d*$/.test(id))) {
      throw new Error('Select 1..100 positive cafe IDs');
    }
    this.cafeIds = [...new Set(cafeIds)];
  }
  async search(input: Conditions): Promise<Recommendation[]> {
    const c = conditions(input);
    if (c.location || c.radius_m !== undefined || c.sort_by === 'distance') { throw new AppError(422, 'SQL 위치 검색은 아직 연결되지 않았습니다.'); }
    const filters = [`p.cafe_id IN (${this.cafeIds.map(() => '?').join(',')})`,
      "p.price_scope = 'STORE'", "p.sale_status = 'ON_SALE'", "p.source <> 'DEMO'",
      'p.verified_at IS NOT NULL', 'p.price IS NOT NULL', 'p.price >= 0'];
    const parameters: Array<string | number> = [...this.cafeIds];
    if (c.max_price_krw !== null) { filters.push('p.price <= ?'); parameters.push(c.max_price_krw); }
    if (c.category !== null) { filters.push('m.category = ?'); parameters.push(c.category); }
    parameters.push(c.limit);
    try {
      const rows = await this.select(`SELECT CAST(p.price_id AS CHAR) AS id,
        CAST(p.cafe_id AS CHAR) AS cafe_id, CAST(p.menu_id AS CHAR) AS menu_id,
        f.name AS cafe_name, m.standard_name AS name, m.category, p.size, p.option_name,
        p.price AS price_krw, p.source, CAST(p.verified_at AS CHAR) AS verified_at
        FROM menu_prices p JOIN menus m ON m.menu_id = p.menu_id
        JOIN cafes f ON f.cafe_id = p.cafe_id
        WHERE ${filters.join(' AND ')} ORDER BY p.price ASC, p.price_id ASC LIMIT ?`, parameters);
      if (rows.length > c.limit) { throw new Error(); }
      return rows.map(r => {
        const string = (key: string) => {
          if (typeof r[key] !== 'string' || !(r[key] as string).trim()) { throw new Error(); }
          return r[key] as string;
        };
        const id = string('id'), cafeId = string('cafe_id'), menuId = string('menu_id');
        if (![id, cafeId, menuId].every(v => /^[1-9]\d*$/.test(v)) || !this.cafeIds.includes(cafeId)
          || !Number.isSafeInteger(r.price_krw) || Number(r.price_krw) < 0
          || c.max_price_krw !== null && Number(r.price_krw) > c.max_price_krw
          || c.category !== null && r.category !== c.category) { throw new Error(); }
        const optional = (key: string) => {
          if (r[key] !== null && typeof r[key] !== 'string') { throw new Error(); }
          return r[key] as string | null;
        };
        return { cafe: { id: cafeId, name: string('cafe_name') }, offer: {
          id, menu_id: menuId, name: string('name'), category: string('category'),
          price_krw: Number(r.price_krw), size: optional('size'), option_name: optional('option_name'),
          evidence: { is_mock: false, source: string('source'), verified_at: string('verified_at'), source_reference: `menu_prices:${id}` },
        }, distance_m: null };
      });
    } catch { throw new AppError(503, '가격 데이터를 조회하거나 검증할 수 없습니다.'); }
  }
}
