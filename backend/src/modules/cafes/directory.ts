import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ok } from '../common/response';
import { AppError } from '../common/AppError';

const router = Router();

function numberParam(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new AppError(400, `${name} 값을 확인해 주세요.`);
  }
  return Number(value);
}

// IDs remain strings so BIGINT identifiers are not rounded by JavaScript.
const cafeSelect = `SELECT CAST(c.cafe_id AS CHAR) AS id, c.name, c.address,
  c.phone, c.latitude, c.longitude, b.name AS brand, c.kakao_place_id,
  c.rating_avg, c.review_count, c.has_drive_thru, c.info_verified_at
  FROM cafes c LEFT JOIN brands b ON b.brand_id = c.brand_id`;

async function readMenus(ids: string[]) {
  if (!ids.length) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT CAST(p.price_id AS CHAR) AS id, CAST(p.cafe_id AS CHAR) AS cafeId,
      m.standard_name, m.category, m.is_decaf, p.size, p.option_name, p.price,
      m.caffeine_regular_mg, m.caffeine_large_mg, p.source, p.sale_status,
      DATE_FORMAT(p.verified_at, '%Y-%m-%d') AS checkedAt
    FROM menu_prices p JOIN menus m ON m.menu_id = p.menu_id
    WHERE p.cafe_id IN (${ids.map(() => '?').join(',')})
    ORDER BY p.cafe_id, p.price, p.price_id`, ids);
  return rows.map(row => ({
    id: String(row.id), cafeId: String(row.cafeId),
    name: Number(row.is_decaf) && !String(row.standard_name).includes('디카페인')
      ? `디카페인 ${row.standard_name}` : String(row.standard_name),
    category: row.category,
    size: row.size === '기본' ? 'Regular' : row.size,
    // Only explicit temperature options are interpreted; unknown options stay unknown.
    temperature: String(row.option_name).trim().toUpperCase(),
    price: Number(row.price),
    caffeineMg: (String(row.size).toUpperCase() === 'LARGE' ? row.caffeine_large_mg : row.caffeine_regular_mg) == null
      ? null : Number(String(row.size).toUpperCase() === 'LARGE' ? row.caffeine_large_mg : row.caffeine_regular_mg),
    source: row.source === 'DEMO' ? '시연 데이터 (가격 검증일 아님)' : row.source,
    checkedAt: row.source === 'DEMO' ? undefined : row.checkedAt,
    available: row.sale_status === 'ON_SALE',
  }));
}

async function hydrate(rows: RowDataPacket[]) {
  const menus = await readMenus(rows.map(row => String(row.id)));
  return rows.map(row => {
    const cafeMenus = menus.filter(menu => menu.cafeId === String(row.id));
    const prices = cafeMenus.filter(menu => menu.available).map(menu => menu.price);
    return {
      id: String(row.id), name: row.name, address: row.address,
      phone: row.phone ?? undefined, brand: row.brand ?? undefined,
      latitude: Number(row.latitude), longitude: Number(row.longitude),
      placeUrl: row.kakao_place_id ? `https://place.map.kakao.com/${encodeURIComponent(row.kakao_place_id)}` : undefined,
      distance: row.distance == null ? undefined : Math.round(Number(row.distance)),
      rating: Number(row.rating_avg), reviewCount: Number(row.review_count),
      verified: row.info_verified_at != null,
      tags: Number(row.has_drive_thru) ? ['DT'] : [],
      minPrice: prices.length ? Math.min(...prices) : null,
      menus: cafeMenus,
    };
  });
}

router.get('/', async (req, res) => {
  const { latitude, longitude, radius, query } = req.query;
  const positioned = latitude !== undefined || longitude !== undefined;
  if (radius !== undefined && !positioned) throw new AppError(400, '반경 검색에는 위도와 경도가 필요합니다.');
  const params: (string | number)[] = [];
  let sql = cafeSelect;
  if (positioned) {
    const lat = numberParam(latitude, 'latitude', -90, 90);
    const lng = numberParam(longitude, 'longitude', -180, 180);
    if (lng === -180) throw new AppError(400, 'longitude 값을 확인해 주세요.');
    sql = sql.replace('c.phone,', 'ST_Distance_Sphere(POINT(c.longitude, c.latitude), POINT(?, ?)) AS distance, c.phone,');
    params.push(lng, lat);
  }
  if (query !== undefined) {
    if (typeof query !== 'string' || query.length > 100) throw new AppError(400, '검색어를 확인해 주세요.');
    sql += ' WHERE (c.name LIKE ? OR c.address LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);
  }
  if (positioned) {
    sql += ' HAVING distance <= ? ORDER BY distance, c.cafe_id';
    params.push(radius === undefined ? 1000 : numberParam(radius, 'radius', 1, 5000));
  } else sql += ' ORDER BY c.cafe_id';
  sql += ' LIMIT 500';
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  // Menu/size/temperature sorting is performed by the existing map screen.
  res.json(ok(await hydrate(rows)));
});

async function findCafe(id: unknown) {
  if (typeof id !== 'string' || !/^\d{1,19}$/.test(id)) throw new AppError(404, '매장을 찾을 수 없습니다.');
  const [rows] = await pool.execute<RowDataPacket[]>(`${cafeSelect} WHERE c.cafe_id = ?`, [id]);
  if (!rows.length) throw new AppError(404, '매장을 찾을 수 없습니다.');
  return rows;
}

router.get('/:id/menus', async (req, res) => {
  const rows = await findCafe(req.params.id);
  res.json(ok(await readMenus([String(rows[0].id)])));
});

router.get('/:id', async (req, res) => {
  res.json(ok((await hydrate(await findCafe(req.params.id)))[0]));
});

export default router;
