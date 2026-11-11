import { pool } from '../../config/db';
import { env } from '../../config/env';
import { MidtermConditions, MidtermOffer, MidtermRepository, MockMidtermRepository } from './midterm';

type Select = (sql: string, params: (string | number)[]) => Promise<Record<string, unknown>[]>;
// Seed stores temperature in option_name; preserve size exactly, never guess aliases.
export class SeedMidtermRepository implements MidtermRepository {
  readonly mode = 'database' as const;
  constructor(private readonly select: Select) {}
  async search(c: MidtermConditions): Promise<MidtermOffer[]> {
    const clauses = ["p.source = 'DEMO'", "p.sale_status = 'ON_SALE'", 'p.price >= 0',
      "p.option_name IN ('HOT','ICE')", "m.standard_name IN ('아메리카노','카페라떼')",
      'm.brand_id IS NULL', 'm.is_decaf = 0'];
    const params: (string | number)[] = [];
    if (c.menu_code) {clauses.push('m.standard_name = ?'); params.push(c.menu_code === 'AMERICANO' ? '아메리카노' : '카페라떼');}
    if (c.temperature) {clauses.push('p.option_name = ?'); params.push(c.temperature);}
    if (c.size) {clauses.push('BINARY p.size = BINARY ?'); params.push(c.size);}
    if (c.max_price_krw !== null) {clauses.push('p.price <= ?'); params.push(c.max_price_krw);}
    // Bounded candidates, with stable lexical offer-ID order matching the service.
    params.push(c.limit);
    const rows = await this.select(`SELECT CAST(c.cafe_id AS CHAR) AS cafe_id,
      CAST(m.menu_id AS CHAR) AS menu_id, CAST(p.price_id AS CHAR) AS offer_id,
      c.name AS cafe_name, m.standard_name AS menu_name,
      p.option_name AS temperature, p.size, p.price AS price_krw, p.source
      FROM menu_prices p JOIN cafes c ON c.cafe_id=p.cafe_id
      JOIN menus m ON m.menu_id=p.menu_id WHERE ${clauses.join(' AND ')}
      ORDER BY p.price, CAST(p.price_id AS CHAR) LIMIT ?`, params);
    return rows.map(r => {
      if (r.menu_name !== '아메리카노' && r.menu_name !== '카페라떼') throw new Error('Invalid menu');
      if (['cafe_id','menu_id','offer_id'].some(k => typeof r[k] !== 'string' || !/^[1-9]\d*$/.test(r[k] as string))
        || r.source !== 'DEMO') throw new Error('Invalid seed row');
      return {...r, menu_code:r.menu_name === '아메리카노' ? 'AMERICANO' : 'CAFE_LATTE',
        available:true, is_mock:false, verified_at:null} as MidtermOffer;
    });
  }
}
export function midtermRepository(): MidtermRepository {
  if (env.catalogMode === 'mock') return new MockMidtermRepository();
  return new SeedMidtermRepository(async (sql, params) => {
    const [rows] = await pool.query({sql, timeout:5000}, params);
    return rows as Record<string, unknown>[];
  });
}
