-- 행신역 중간 시연용 데이터. schema.sql 적용 후 coffee_station DB에서 실행합니다.
-- 미검증 가격 2건은 기본 제외합니다.
SET @hs_allow_unverified_prices = 0;
SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS hs_stores, hs_americano_prices, hs_latte_prices, hs_prices, hs_store_ids, hs_menu_ids, hs_id_guard;
CREATE TEMPORARY TABLE hs_stores (
  store_code CHAR(5) PRIMARY KEY,
  cafe_id BIGINT NOT NULL UNIQUE,
  brand_name VARCHAR(50) NOT NULL,
  cafe_name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7)
);

-- 좌표는 매장 도로명 주소에 해당하는 건물 기준입니다.
INSERT INTO hs_stores VALUES
('HS001',9001,'투썸플레이스','투썸플레이스 행신역점', '경기도 고양시 덕양구 충장로 8', 37.6135312, 126.8344894),
('HS002',9002,'스타벅스','스타벅스 행신역점', '경기도 고양시 덕양구 충장로 14', 37.6140489, 126.8344702),
('HS003',9003,'메가MGC커피','메가MGC커피 행신역점', '경기도 고양시 덕양구 충장로 22', 37.6148050, 126.8344658),
('HS004',9004,'컴포즈커피','컴포즈커피 고양행신점', '경기도 고양시 덕양구 충경로 38', 37.6152147, 126.8337344),
('HS005',9005,'백억커피','백억커피 행신점', '경기도 고양시 덕양구 충경로 48', 37.6153360, 126.8348810),
('HS006',9006,'우지커피','우지커피 행신역점', '경기도 고양시 덕양구 충경로 52', 37.6152347, 126.8353627),
('HS007',9007,'빽다방','빽다방 행신역점', '경기도 고양시 덕양구 충경로 52', 37.6152347, 126.8353627),
('HS008',9008,'더벤티','더벤티 행신역점', '경기도 고양시 덕양구 충경로 44', 37.6153010, 126.8344979);

CREATE TEMPORARY TABLE hs_prices (
  store_code CHAR(5), menu_name VARCHAR(100), product_name VARCHAR(100),
  size_label VARCHAR(10), temperature VARCHAR(30), price_won INT UNSIGNED,
  price_basis VARCHAR(80), source_url VARCHAR(1024),
  PRIMARY KEY (store_code, menu_name, size_label, temperature)
);

-- 가격 원본은 표준 메뉴별로 분리해서 관리합니다.
CREATE TEMPORARY TABLE hs_americano_prices LIKE hs_prices;
CREATE TEMPORARY TABLE hs_latte_prices LIKE hs_prices;

INSERT INTO hs_americano_prices VALUES
('HS001', '아메리카노', '아메리카노', 'Regular', 'HOT', 4500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '아메리카노', '아메리카노', 'Regular', 'ICE', 4500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '아메리카노', '아메리카노', 'Large', 'HOT', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '아메리카노', '아메리카노', 'Large', 'ICE', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS002', '아메리카노', '카페 아메리카노', 'Short', 'HOT', 4700, 'unverified', NULL),
('HS002', '아메리카노', '카페 아메리카노', 'Tall', 'HOT', 4700, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Tall', 'ICE', 4700, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Grande', 'HOT', 5300, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Grande', 'ICE', 5300, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Venti', 'HOT', 6100, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Venti', 'ICE', 6100, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS003', '아메리카노', '아메리카노', '기본', 'HOT', 1700, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '아메리카노', '아메리카노', '기본', 'ICE', 2000, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '아메리카노', '메가리카노', '왕메가', 'ICE', 3300, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS004', '아메리카노', '아메리카노', '기본', 'HOT', 1500, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '아메리카노', '아메리카노', '기본', 'ICE', 1800, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '아메리카노', '빅포즈 아메리카노', '빅포즈', 'ICE', 3000, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS005', '아메리카노', '아메리카노', '기본', 'HOT', 1900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '아메리카노', '아메리카노', '기본', 'ICE', 1900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '아메리카노', '백억카노 1L', '1리터', 'ICE', 2900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS006', '아메리카노', '아메리카노', '기본', 'HOT', 1800, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '아메리카노', '아메리카노', '기본', 'ICE', 2000, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '아메리카노', '아메리터 1L', '아메리터 1L', 'ICE', 3300, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS007', '아메리카노', '아메리카노', '기본', 'HOT', 1700, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '아메리카노', '아메리카노', '기본', 'ICE', 2000, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '아메리카노', '빽사이즈 아메리카노', '빽사이즈', 'ICE', 3300, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS008', '아메리카노', '아메리카노', 'Large', 'HOT', 1500, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '아메리카노', '아메리카노', 'Large', 'ICE', 2000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '아메리카노', '아메리카노', 'Jumbo', 'ICE', 3000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu');

INSERT INTO hs_latte_prices VALUES
('HS001', '카페라떼', '카페라떼', 'Regular', 'HOT', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Regular', 'ICE', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Large', 'HOT', 5500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Large', 'ICE', 5500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS002', '카페라떼', '카페 라떼', 'Short', 'HOT', 5200, 'unverified', NULL),
('HS002', '카페라떼', '카페 라떼', 'Tall', 'HOT', 5200, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Tall', 'ICE', 5200, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Grande', 'HOT', 5800, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Grande', 'ICE', 5800, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Venti', 'HOT', 6600, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Venti', 'ICE', 6600, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS003', '카페라떼', '카페라떼', '기본', 'HOT', 2900, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '카페라떼', '카페라떼', '기본', 'ICE', 2900, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '카페라떼', '왕메가카페라떼', '왕메가', 'ICE', 4400, 'branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS004', '카페라떼', '카페라떼', '기본', 'HOT', 2900, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '카페라떼', '카페라떼', '기본', 'ICE', 2900, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '카페라떼', '빅포즈 카페라떼', '빅포즈', 'ICE', 4500, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS005', '카페라떼', '카페라떼', '기본', 'HOT', 3900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '카페라떼', '카페라떼', '기본', 'ICE', 3900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '카페라떼', '1L 카페라떼', '1리터', 'ICE', 4900, 'branch_third_party_listing', 'https://www.diningcode.com/profile.php?rid=bUa3RpQmWIWd'),
('HS006', '카페라떼', '카페라떼', '기본', 'HOT', 3300, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '카페라떼', '카페라떼', '기본', 'ICE', 3300, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS007', '카페라떼', '카페라떼', '기본', 'HOT', 3200, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '카페라떼', '카페라떼', '기본', 'ICE', 3200, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '카페라떼', '빽사이즈 카페라떼', '빽사이즈', 'ICE', 4800, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS008', '카페라떼', '카페라떼', 'Large', 'HOT', 3000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '카페라떼', '카페라떼', 'Large', 'ICE', 3000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '카페라떼', '카페라떼', 'Jumbo', 'ICE', 4500, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu');

INSERT INTO hs_prices SELECT * FROM hs_americano_prices;
INSERT INTO hs_prices SELECT * FROM hs_latte_prices;

-- 동일 ID의 다른 매장 또는 동일 이름의 다른 ID가 있으면 배치 실행을 중단합니다.
-- mysql 클라이언트에서 --force 없이 실행하세요.
CREATE TEMPORARY TABLE hs_id_guard (
  conflict_count INT NOT NULL,
  missing_coordinates INT NOT NULL,
  CONSTRAINT haengsin_coordinates_required CHECK (missing_coordinates = 0),
  CONSTRAINT haengsin_cafe_id_conflict CHECK (conflict_count = 0)
);
INSERT INTO hs_id_guard
SELECT
  COALESCE(SUM(c.cafe_id IS NOT NULL AND (c.cafe_id <> s.cafe_id OR c.name <> s.cafe_name)), 0),
  COALESCE(SUM(s.latitude IS NULL OR s.longitude IS NULL), 0)
FROM hs_stores s LEFT JOIN cafes c ON c.cafe_id = s.cafe_id OR c.name = s.cafe_name;

START TRANSACTION;

-- 매장은 고정 cafe_id로 연결하고 브랜드는 이름으로 재사용합니다.
-- 브랜드·메뉴·가격 ID는 각 테이블의 현재 최대값 뒤에서 배정합니다. 로컬에서 단독 실행하세요.
SET @hs_brand_base = (SELECT COALESCE(MAX(brand_id), 0) FROM brands);
INSERT INTO brands (brand_id, name)
SELECT @hs_brand_base + ROW_NUMBER() OVER (ORDER BY s.brand_name), s.brand_name
FROM hs_stores s
WHERE EXISTS (SELECT 1 FROM hs_id_guard)
  AND NOT EXISTS (SELECT 1 FROM brands b WHERE b.name = s.brand_name);


INSERT INTO cafes (cafe_id, brand_id, name, address, latitude, longitude)
SELECT s.cafe_id,
       (SELECT MIN(b.brand_id) FROM brands b WHERE b.name = s.brand_name),
       s.cafe_name, s.address, s.latitude, s.longitude
FROM hs_stores s
WHERE EXISTS (SELECT 1 FROM hs_id_guard)
  AND NOT EXISTS (SELECT 1 FROM cafes c WHERE c.cafe_id = s.cafe_id);

-- 기존에 시연 좌표로 등록한 매장도 건물 좌표로 갱신합니다.
UPDATE cafes AS c
JOIN hs_stores AS s ON s.cafe_id = c.cafe_id AND s.cafe_name = c.name
SET c.latitude = s.latitude, c.longitude = s.longitude
WHERE EXISTS (SELECT 1 FROM hs_id_guard);

SET @hs_menu_base = (SELECT COALESCE(MAX(menu_id), 0) FROM menus);
INSERT INTO menus (menu_id, standard_name, category, has_milk)
SELECT @hs_menu_base + ROW_NUMBER() OVER (ORDER BY m.menu_name), m.menu_name, m.category, m.has_milk
FROM (
  SELECT '아메리카노' AS menu_name, 'COFFEE' AS category, 0 AS has_milk
  UNION ALL SELECT '카페라떼', 'LATTE', 1
) m
WHERE EXISTS (SELECT 1 FROM hs_id_guard) AND NOT EXISTS (
  SELECT 1 FROM menus x WHERE x.standard_name = m.menu_name AND x.brand_id IS NULL AND x.is_decaf = 0
);

CREATE TEMPORARY TABLE hs_store_ids AS
SELECT s.store_code, c.cafe_id
FROM hs_stores s JOIN cafes c ON c.cafe_id = s.cafe_id;

CREATE TEMPORARY TABLE hs_menu_ids AS
SELECT standard_name AS menu_name, MIN(menu_id) AS menu_id
FROM menus WHERE brand_id IS NULL AND is_decaf = 0
  AND standard_name IN ('아메리카노', '카페라떼')
GROUP BY standard_name;

-- 기존 가격은 보존하고 없는 조합만 추가합니다.
-- ERD의 verified_at은 필수이므로 신규 행에는 시연 DB 입력일을 기록합니다.
-- 실제 가격 검증일로 해석하지 마세요. 출처 구분과 링크는 hs_prices 원본에 있습니다.
SET @hs_price_base = (SELECT COALESCE(MAX(price_id), 0) FROM menu_prices);
INSERT INTO menu_prices (price_id, cafe_id, menu_id, size, option_name, price, source, price_scope, verified_at)
SELECT @hs_price_base + ROW_NUMBER() OVER (ORDER BY p.store_code, p.menu_name, p.size_label, p.temperature),
       s.cafe_id, m.menu_id, p.size_label, p.temperature, p.price_won, 'DEMO',
       CASE WHEN p.price_basis IN ('third_party_brand_price','unverified') THEN 'BRAND' ELSE 'STORE' END,
       CURRENT_DATE()
FROM hs_prices p
JOIN hs_store_ids s ON s.store_code = p.store_code
JOIN hs_menu_ids m ON m.menu_name = p.menu_name
WHERE EXISTS (SELECT 1 FROM hs_id_guard) AND (@hs_allow_unverified_prices = 1 OR p.price_basis <> 'unverified')
  AND NOT EXISTS (
    SELECT 1 FROM menu_prices x
    WHERE x.cafe_id = s.cafe_id AND x.menu_id = m.menu_id
      AND CASE WHEN TRIM(x.size) = '기본' THEN 'regular' ELSE LOWER(TRIM(x.size)) END
        = CASE WHEN TRIM(p.size_label) = '기본' THEN 'regular' ELSE LOWER(TRIM(p.size_label)) END
      AND UPPER(TRIM(x.option_name)) = p.temperature
  );

COMMIT;

-- 적재 후 실제 DB에 저장된 모든 메뉴 옵션을 매장별로 출력합니다.
SELECT c.cafe_id, c.name AS cafe_name, m.standard_name AS menu_name,
       p.size, p.option_name AS temperature, p.price AS price_won,
       p.sale_status, p.source
FROM hs_store_ids ids
JOIN cafes c ON c.cafe_id = ids.cafe_id
JOIN menu_prices p ON p.cafe_id = c.cafe_id
JOIN menus m ON m.menu_id = p.menu_id
WHERE m.standard_name IN ('아메리카노', '카페라떼') AND m.is_decaf = 0
ORDER BY c.cafe_id, m.standard_name, p.size, p.option_name, p.price_id;

DROP TEMPORARY TABLE hs_stores, hs_americano_prices, hs_latte_prices, hs_prices, hs_store_ids, hs_menu_ids, hs_id_guard;