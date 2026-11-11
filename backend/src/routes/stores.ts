import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { AppError } from '../common/AppError';
import { ok } from '../common/response';
import { pool } from '../config/db';

const router = Router();

function readNumber(value: unknown, name: string): number {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(400, `${name} 값을 입력해 주세요.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new AppError(400, `${name} 값은 숫자여야 합니다.`);
  }

  return number;
}

router.get('/nearby', async (req, res) => {
  const lat = readNumber(req.query.lat, 'lat');
  const lng = readNumber(req.query.lng, 'lng');
  const radius = readNumber(req.query.radius, 'radius');
  const menu = req.query.menu;

  if (lat < -90 || lat > 90 || lng <= -180 || lng > 180) {
    throw new AppError(400, '위도와 경도를 확인해 주세요.');
  }

  if (radius <= 0 || radius > 5000) {
    throw new AppError(400, '검색 반경은 0m 초과, 5000m 이하여야 합니다.');
  }

  if (menu === 'DECAF') {
    res.json(ok([]));
    return;
  }

  if (menu !== 'AMERICANO' && menu !== 'LATTE') {
    throw new AppError(400, 'menu는 AMERICANO, LATTE, DECAF 중 하나여야 합니다.');
  }

  const menuName = menu === 'AMERICANO' ? '아메리카노' : '카페라떼';

  const [rows] = await pool.execute<RowDataPacket[]>(
    `
    WITH nearby_cafes AS (
      SELECT c.*,
        ST_Distance_Sphere(
          POINT(c.longitude, c.latitude),
          POINT(?, ?)
        ) AS distance_m
      FROM cafes AS c
    ),
    ranked_prices AS (
      SELECT
        c.cafe_id AS id, c.name, c.address, c.latitude, c.longitude,
        c.distance_m, c.rating_avg AS rating, c.review_count AS reviewCount,
        CONCAT_WS(' ', m.standard_name, p.size, NULLIF(p.option_name, '')) AS menuName,
        p.price,
        CASE
          WHEN p.owner_verified = 1 THEN '점주 확인'
          WHEN p.source = 'OWNER' THEN '점주 제공'
          WHEN p.source = 'RECEIPT' THEN '영수증'
          ELSE '수집 가격'
        END AS priceSource,
        DATE_FORMAT(p.verified_at, '%Y-%m-%d') AS priceCheckedAt,
        ROW_NUMBER() OVER (
          PARTITION BY c.cafe_id
          ORDER BY p.price ASC, p.verified_at DESC, p.price_id ASC
        ) AS price_rank
      FROM nearby_cafes AS c
      JOIN menu_prices AS p ON p.cafe_id = c.cafe_id
      JOIN menus AS m ON m.menu_id = p.menu_id
      WHERE c.distance_m <= ?
        AND m.standard_name = ?
        AND m.is_decaf = 0
        AND p.sale_status = 'ON_SALE'
    )
    SELECT id, name, address, latitude, longitude,
      ROUND(distance_m) AS distance, rating, reviewCount,
      menuName, price, priceSource, priceCheckedAt
    FROM ranked_prices
    WHERE price_rank = 1
    ORDER BY distance_m, id
    `,
    [lng, lat, radius, menuName],
  );

  res.json(ok(rows.map((row) => ({
    ...row,
    id: Number(row.id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distance: Number(row.distance),
    rating: Number(row.rating),
  }))));
});

export default router;