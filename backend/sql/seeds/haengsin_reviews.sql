-- Generated review fixtures for local app previews. Run after haengsin.sql
-- and migrations/001_generated_reviews.sql. Repeated runs preserve existing rows.
SET NAMES utf8mb4;
INSERT INTO generated_reviews
  (id, cafe_id, menu_id, slot, author_nickname, rating, content)
WITH menu_choices AS (
  SELECT DISTINCT p.cafe_id, p.menu_id, m.standard_name
  FROM menu_prices p JOIN menus m ON m.menu_id = p.menu_id
  WHERE p.cafe_id BETWEEN 9001 AND 9021
    AND p.source = 'DEMO' AND p.sale_status = 'ON_SALE'
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY cafe_id
    ORDER BY SHA2(CONCAT(cafe_id, ':', menu_id), 256), menu_id
  ) AS position,
  COUNT(*) OVER (PARTITION BY cafe_id) AS menu_count
  FROM menu_choices
), slots AS (
  SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5
)
SELECT CONCAT('generated-', r.cafe_id, '-', s.slot), r.cafe_id,
       r.menu_id, s.slot,
       ELT(s.slot, '커피한잔', '오후의휴식', '동네산책', '달콤한시간', '오늘의한잔'),
       5,
       CASE MOD(r.cafe_id + s.slot, 7)
         WHEN 0 THEN CONCAT(r.standard_name, ' 맛있어요. 다음에도 주문하고 싶어요.')
         WHEN 1 THEN CONCAT(r.standard_name, ' 맛있게 먹었어요. 제 입맛에 잘 맞네요.')
         WHEN 2 THEN CONCAT('오늘 고른 ', r.standard_name, ', 맛있어서 만족했어요.')
         WHEN 3 THEN CONCAT(r.standard_name, ' 맛이 좋아서 기분 좋게 즐겼어요.')
         WHEN 4 THEN CONCAT(r.standard_name, ' 맛있네요. 잠깐 쉬면서 먹기 좋았어요.')
         WHEN 5 THEN CONCAT('이번에는 ', r.standard_name, ' 먹었는데 맛있었어요.')
         ELSE CONCAT(r.standard_name, ' 맛있게 잘 먹었습니다. 또 생각날 것 같아요.')
       END
FROM ranked r JOIN slots s
  ON r.position = MOD(s.slot - 1, r.menu_count) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM generated_reviews old
  WHERE old.cafe_id = r.cafe_id AND old.slot = s.slot
);

SELECT c.cafe_id, c.name, COUNT(r.id) AS generated_review_count
FROM cafes c LEFT JOIN generated_reviews r ON r.cafe_id = c.cafe_id
WHERE c.cafe_id BETWEEN 9001 AND 9021
GROUP BY c.cafe_id, c.name ORDER BY c.cafe_id;
