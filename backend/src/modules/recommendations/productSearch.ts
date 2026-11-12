import { AppError } from '../../common/AppError';
import { pool } from '../../config/db';
import { env } from '../../config/env';
import { distanceMeters } from './repository';
import { productConditions, type ProductConditions } from './productContract';

type Row = Record<string, unknown>;
export type SelectProducts = (sql: string, params: Array<string | number>) => Promise<Row[]>;
const select: SelectProducts = async (sql, params) => {
  const [rows] = await pool.query({sql, timeout: 5000}, params);
  return rows as Row[];
};
const id = (value: unknown) => typeof value === 'string' && /^[1-9]\d*$/.test(value);

export async function searchProducts(input: unknown, query: SelectProducts = select) {
  const c: ProductConditions = productConditions(input);
  if (env.catalogMode !== 'mysql-seed') throw new AppError(503, 'DB 추천 조회를 활성화해 주세요.');
  const filters = ["p.source = 'DEMO'", "p.sale_status = 'ON_SALE'", 'p.price >= 0'];
  const params: Array<string | number> = [];
  if (c.maxPrice !== null) { filters.push('p.price <= ?'); params.push(c.maxPrice); }
  if (c.purpose === 'DRIVE_THRU') filters.push('f.has_drive_thru = 1');
  if (c.tastes.includes('DECAF')) filters.push('m.is_decaf = 1');
  if (c.tastes.includes('MILK')) filters.push('m.has_milk = 1');
  let rows: Row[];
  try {
    rows = await query(`SELECT * FROM (SELECT CAST(f.cafe_id AS CHAR) AS cafe_id, f.name AS cafe_name,
      f.address, f.latitude, f.longitude, f.rating_avg, f.review_count,
      f.has_drive_thru, CAST(p.price_id AS CHAR) AS price_id,
      m.standard_name AS menu_name, m.category, p.size, p.option_name,
      p.price, p.source, p.price_scope,
      ROW_NUMBER() OVER (PARTITION BY f.cafe_id ORDER BY p.price, p.price_id) AS option_rank
      FROM menu_prices p JOIN cafes f ON f.cafe_id = p.cafe_id
      JOIN menus m ON m.menu_id = p.menu_id
      WHERE ${filters.join(' AND ')}) ranked
      WHERE option_rank = 1 ORDER BY price, price_id LIMIT 501`, params);
  } catch { throw new AppError(503, '추천 데이터를 조회할 수 없습니다.'); }
  if (!Array.isArray(rows) || rows.length > 500) throw new AppError(503, '추천 후보가 너무 많습니다. 조회 범위를 줄여 주세요.');
  const candidates = new Map<string, {cafe: Row; menu: Row; price: number; distance: number | undefined; priceId: string}>();
  for (const row of rows) {
    const lat = Number(row.latitude), lng = Number(row.longitude), price = Number(row.price);
    if (!id(row.cafe_id) || !id(row.price_id) || typeof row.cafe_name !== 'string'
      || typeof row.address !== 'string' || typeof row.menu_name !== 'string'
      || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180
      || !Number.isSafeInteger(price) || price < 0 || row.source !== 'DEMO'
      || !['STORE', 'BRAND'].includes(String(row.price_scope))) {
      throw new AppError(503, '추천 데이터 형식을 확인할 수 없습니다.');
    }
    if (c.maxPrice !== null && price > c.maxPrice) throw new AppError(503, '추천 가격 조건이 일치하지 않습니다.');
    const cafeId = row.cafe_id as string;
    const distance = c.lat === undefined ? undefined : Math.round(distanceMeters(
      {latitude: c.lat, longitude: c.lng!}, {latitude: lat, longitude: lng}));
    if (!candidates.has(cafeId)) candidates.set(cafeId, {cafe: row, menu: row, price, distance, priceId: row.price_id as string});
  }
  const items = [...candidates.values()].sort((a, b) => a.price - b.price
    || (a.distance ?? Infinity) - (b.distance ?? Infinity)
    || a.priceId.localeCompare(b.priceId)).slice(0, 3).map(({cafe, menu, price, distance}) => ({
    cafe: {id: cafe.cafe_id as string, name: cafe.cafe_name as string,
      address: cafe.address as string, latitude: Number(cafe.latitude), longitude: Number(cafe.longitude),
      ...(distance === undefined ? {} : {distance}),
      rating: Number(cafe.rating_avg), reviewCount: Number(cafe.review_count),
      tags: [cafe.has_drive_thru ? '드라이브스루' : null, '시연 가격'].filter(Boolean)},
    score: 0,
    matchedMenu: {id: menu.price_id as string, cafeId: cafe.cafe_id as string,
      name: menu.menu_name as string, category: menu.category as string,
      size: String(menu.size), temperature: String(menu.option_name), price,
      priceScope: menu.price_scope, source: 'DEMO', isDemo: true, checkedAt: null, caffeineMg: null},
    reasons: [`${menu.menu_name} ${menu.option_name} ${menu.size} ${price}원은 선택한 예산 조건에 맞는 DB 시연 가격입니다.`],
  }));
  return {items, mode: 'rules' as const, notice: 'DB 시연 가격이며 실제 판매 가격·확인일을 보장하지 않습니다.'};
}
