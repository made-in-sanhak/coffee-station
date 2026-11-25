-- 행신역 중간 시연용 데이터. schema.sql 적용 후 coffee_station DB에서 실행합니다.
-- 미검증 가격 2건은 기본 제외합니다.
SET @hs_allow_unverified_prices = 0;
SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS hs_stores, hs_americano_prices, hs_latte_prices, hs_prices, hs_store_ids, hs_menu_ids, hs_id_guard, hs_extra_prices;
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
('HS001', 9001, '투썸플레이스', '투썸플레이스 행신역점', '경기도 고양시 덕양구 충장로 8', 37.6135312, 126.8344894),
('HS002', 9002, '스타벅스', '스타벅스 행신역점', '경기도 고양시 덕양구 충장로 14', 37.6140489, 126.8344702),
('HS003', 9003, '메가MGC커피', '메가MGC커피 행신역점', '경기도 고양시 덕양구 충장로 22', 37.6148050, 126.8344658),
('HS004', 9004, '컴포즈커피', '컴포즈커피 고양행신점', '경기도 고양시 덕양구 충경로 38', 37.6152147, 126.8337344),
('HS005', 9005, '백억커피', '백억커피 행신점', '경기도 고양시 덕양구 충경로 48', 37.6153360, 126.8348810),
('HS006', 9006, '우지커피', '우지커피 행신역점', '경기도 고양시 덕양구 충경로 52', 37.6152347, 126.8353627),
('HS007', 9007, '빽다방', '빽다방 행신역점', '경기도 고양시 덕양구 충경로 52', 37.6152347, 126.8353627),
('HS008', 9008, '더벤티', '더벤티 행신역점', '경기도 고양시 덕양구 충경로 44', 37.6153010, 126.8344979),

('HS009', 9009, '투썸플레이스', '투썸플레이스 고양행신점', '경기도 고양시 덕양구 충장로 134', 37.6243810, 126.8349700),
('HS010', 9010, '스타벅스', '스타벅스 고양행신점', '경기도 고양시 덕양구 충장로 126', 37.6237710, 126.8343140),
('HS011', 9011, '메가MGC커피', '메가MGC커피 행신무원초점', '경기도 고양시 덕양구 무원로 64', 37.6185420, 126.8325310),
('HS012', 9012, '메가MGC커피', '메가MGC커피 행신햇빛마을점', '경기도 고양시 덕양구 중앙로 554', 37.6237050, 126.8358770),
('HS013', 9013, '메가MGC커피', '메가MGC커피 고양샘터마을점', '경기도 고양시 덕양구 화신로 73', 37.6194620, 126.8386100),
('HS014', 9014, '메가MGC커피', '메가MGC커피 일산서정마을점', '경기도 고양시 덕양구 서정마을1로 4-9', 37.6187920, 126.8454880),
('HS015', 9015, '컴포즈커피', '컴포즈커피 행신햇빛마을점', '경기도 고양시 덕양구 중앙로558번길 13', 37.6243830, 126.8358300),
('HS016', 9016, '컴포즈커피', '컴포즈커피 일산서정마을점', '경기도 고양시 덕양구 서정마을1로 4-13', 37.6186960, 126.8457900),
('HS017', 9017, '우지커피', '우지커피 고양서정마을점', '경기도 고양시 덕양구 중앙로 442', 37.6182210, 126.8460930),
('HS018', 9018, '빽다방', '빽다방 행신햇빛마을점', '경기도 고양시 덕양구 중앙로 554', 37.6237050, 126.8358770),
('HS019', 9019, '빽다방', '빽다방 고양서정마을점', '경기도 고양시 덕양구 서정마을1로 20-10', 37.6185530, 126.8462080),
('HS020', 9020, '더벤티', '더벤티 고양행신점', '경기도 고양시 덕양구 중앙로557번길 11', 37.6229520, 126.8350150),
('HS021', 9021, '더벤티', '더벤티 서정마을점', '경기도 고양시 덕양구 중앙로 440', 37.6180890, 126.8464770);

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

CREATE TEMPORARY TABLE hs_extra_prices LIKE hs_prices;

-- HS001 투썸플레이스 행신역점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS001', '카푸치노', '카푸치노', 'Regular', 'ICE', 5200, 'branch_menu_photo', @hs_extra_source),
('HS001', '카푸치노', '카푸치노', 'Large', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라 라떼', '바닐라 라떼', 'Regular', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라 라떼', '바닐라 라떼', 'Large', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '카페 모카', '카페 모카', 'Regular', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS001', '카페 모카', '카페 모카', 'Large', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '카라멜 마키아또', '카라멜 마키아또', 'Regular', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS001', '카라멜 마키아또', '카라멜 마키아또', 'Large', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS001', '스페니쉬 연유 라떼', '스페니쉬 연유 라떼', 'Regular', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS001', '스페니쉬 연유 라떼', '스페니쉬 연유 라떼', 'Large', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라빈 라떼', '바닐라빈 라떼', 'Regular', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라빈 라떼', '바닐라빈 라떼', 'Large', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS001', '달고나 라떼', '달고나 라떼', 'Regular', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS001', '달고나 라떼', '달고나 라떼', 'Large', 'ICE', 6800, 'branch_menu_photo', @hs_extra_source),
('HS001', '숏 라떼', '숏 라떼', 'Short', 'ICE', 5200, 'branch_menu_photo', @hs_extra_source),
('HS001', '롱 블랙', '롱 블랙', 'Short', 'ICE', 4700, 'branch_menu_photo', @hs_extra_source),
('HS001', '아샷추 (피치)', '아샷추 (피치)', 'Max', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS001', '아샷추 (애플)', '아샷추 (애플)', 'Max', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS001', '아샷추 (민트)', '아샷추 (민트)', 'Max', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),

('HS001', '콜드브루', '콜드브루', 'Regular', 'ICE', 5100, 'branch_menu_photo', @hs_extra_source),
('HS001', '콜드브루', '콜드브루', 'Large', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS001', '콜드브루 라떼', '콜드브루 라떼', 'Regular', 'ICE', 5600, 'branch_menu_photo', @hs_extra_source),
('HS001', '콜드브루 라떼', '콜드브루 라떼', 'Large', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라빈 콜드브루 라떼', '바닐라빈 콜드브루 라떼', 'Regular', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라빈 콜드브루 라떼', '바닐라빈 콜드브루 라떼', 'Large', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS001', '디카페인 콜드브루', '디카페인 콜드브루', 'Regular', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS001', '디카페인 콜드브루', '디카페인 콜드브루', 'Large', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS001', '디카페인 콜드브루 라떼', '디카페인 콜드브루 라떼', 'Regular', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS001', '디카페인 콜드브루 라떼', '디카페인 콜드브루 라떼', 'Large', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '말차 크림 라떼', '말차 크림 라떼', 'Regular', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS001', '말차 크림 라떼', '말차 크림 라떼', 'Large', 'ICE', 5600, 'branch_menu_photo', @hs_extra_source),

('HS001', '아이스티 (피치)', '아이스티 (피치)', 'Max', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS001', '아이스티 (애플)', '아이스티 (애플)', 'Max', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS001', '아이스티 (민트)', '아이스티 (민트)', 'Max', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS001', '얼그레이', '얼그레이', 'Large', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS001', '그나와 민트', '그나와 민트', 'Large', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS001', '카모마일', '카모마일', 'Large', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS001', '크림 카라멜', '크림 카라멜', 'Large', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS001', '제주 유기농 녹차', '제주 유기농 녹차', 'Large', 'HOT', 4800, 'branch_menu_photo', @hs_extra_source),
('HS001', '그린티 라떼', '그린티 라떼', 'Regular', 'ICE', 5200, 'branch_menu_photo', @hs_extra_source),
('HS001', '그린티 라떼', '그린티 라떼', 'Large', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '로얄 밀크티', '로얄 밀크티', 'Regular', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS001', '로얄 밀크티', '로얄 밀크티', 'Large', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '유자 레몬티', '유자 레몬티', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '유자 레몬티', '유자 레몬티', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '오렌지 자몽티', '오렌지 자몽티', 'Regular', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS001', '오렌지 자몽티', '오렌지 자몽티', 'Large', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS001', '애플 민트티', '애플 민트티', 'Regular', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '허니 레몬티', '허니 레몬티', 'Regular', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),

('HS001', '딸기 듬뿍 라떼', '딸기 듬뿍 라떼', 'Regular', 'ICE', 6800, 'branch_menu_photo', @hs_extra_source),
('HS001', '딸기 듬뿍 라떼', '딸기 듬뿍 라떼', 'Large', 'ICE', 7400, 'branch_menu_photo', @hs_extra_source),
('HS001', '생딸기 듬뿍 주스', '생딸기 듬뿍 주스', 'Regular', 'ICE', 7200, 'branch_menu_photo', @hs_extra_source),
('HS001', '생딸기 듬뿍 주스', '생딸기 듬뿍 주스', 'Large', 'ICE', 7800, 'branch_menu_photo', @hs_extra_source),
('HS001', '딸기 밀크 쉐이크', '딸기 밀크 쉐이크', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '딸기 밀크 쉐이크', '딸기 밀크 쉐이크', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '딸기 바나나 쉐이크', '딸기 바나나 쉐이크', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '딸기 바나나 쉐이크', '딸기 바나나 쉐이크', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),

('HS001', '현미 미숫가루', '현미 미숫가루', 'Regular', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS001', '현미 미숫가루', '현미 미숫가루', 'Large', 'ICE', 6800, 'branch_menu_photo', @hs_extra_source),
('HS001', '유자 생강차', '유자 생강차', 'Regular', 'HOT', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '유자 생강차', '유자 생강차', 'Large', 'HOT', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '꿀 고구마 라떼', '꿀 고구마 라떼', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '꿀 고구마 라떼', '꿀 고구마 라떼', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '구운 밤 라떼', '구운 밤 라떼', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '구운 밤 라떼', '구운 밤 라떼', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '우리 쌀 식혜', '우리 쌀 식혜', 'Large', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '우리 대추 수정과', '우리 대추 수정과', 'Large', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),

('HS001', '제주 한라봉 주스', '제주 한라봉 주스', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '제주 한라봉 주스', '제주 한라봉 주스', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '복숭아 주스', '복숭아 주스', 'Regular', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS001', '복숭아 주스', '복숭아 주스', 'Large', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS001', '홍시 주스', '홍시 주스', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '홍시 주스', '홍시 주스', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '키위 바나나 주스', '키위 바나나 주스', 'Large', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '요거트 프라페', '요거트 프라페', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '요거트 프라페', '요거트 프라페', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '민트 초코 프라페', '민트 초코 프라페', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '민트 초코 프라페', '민트 초코 프라페', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라 밀크 쉐이크', '바닐라 밀크 쉐이크', 'Regular', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라 밀크 쉐이크', '바닐라 밀크 쉐이크', 'Large', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS001', '오렌지 자몽 주스', '오렌지 자몽 주스', 'Large', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '쿠키 쉐이크', '쿠키 쉐이크', 'Regular', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '쿠키 쉐이크', '쿠키 쉐이크', 'Large', 'ICE', 6900, 'branch_menu_photo', @hs_extra_source),
('HS001', '밀크티 쉐이크', '밀크티 쉐이크', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '밀크티 쉐이크', '밀크티 쉐이크', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '커피 쿠키 프라페', '커피 쿠키 프라페', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '커피 쿠키 프라페', '커피 쿠키 프라페', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '스트로베리 피치 프라페', '스트로베리 피치 프라페', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '스트로베리 피치 프라페', '스트로베리 피치 프라페', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '애플 망고 주스', '애플 망고 주스', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '애플 망고 주스', '애플 망고 주스', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '애플 망고 피치 프라페', '애플 망고 피치 프라페', 'Regular', 'ICE', 6800, 'branch_menu_photo', @hs_extra_source),
('HS001', '애플 망고 피치 프라페', '애플 망고 피치 프라페', 'Large', 'ICE', 7400, 'branch_menu_photo', @hs_extra_source),

('HS001', '허니 레몬 에이드', '허니 레몬 에이드', 'Large', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '자몽 에이드', '자몽 에이드', 'Large', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '오렌지 에이드', '오렌지 에이드', 'Large', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS001', '샤인머스캣 청포도 에이드', '샤인머스캣 청포도 에이드', 'Large', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),

('HS001', '블루베리 요거트 드링크', '블루베리 요거트 드링크', 'Regular', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS001', '블루베리 요거트 드링크', '블루베리 요거트 드링크', 'Large', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS001', '초콜릿 라떼', '초콜릿 라떼', 'Regular', 'ICE', 5600, 'branch_menu_photo', @hs_extra_source),
('HS001', '초콜릿 라떼', '초콜릿 라떼', 'Large', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS001', '윈터 뱅쇼', '윈터 뱅쇼', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '윈터 뱅쇼', '윈터 뱅쇼', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '뱅쇼 로우 슈거', '뱅쇼 로우 슈거', 'Regular', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS001', '뱅쇼 로우 슈거', '뱅쇼 로우 슈거', 'Large', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS001', '스트로베리 초콜릿 라떼', '스트로베리 초콜릿 라떼', 'Regular', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS001', '스트로베리 초콜릿 라떼', '스트로베리 초콜릿 라떼', 'Large', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),

('HS001', '요거트 아이스크림 (컵)', '요거트 아이스크림 (컵)', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS001', '초코 요거트 아이스크림 (컵)', '초코 요거트 아이스크림 (컵)', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS001', '바닐라 아포가토', '바닐라 아포가토', '기본', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source);

-- HS002 스타벅스 행신역점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS002', '스타벅스 자몽 허니 에어로카노', '스타벅스 자몽 허니 에어로카노', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 자몽 허니 에어로카노', '스타벅스 자몽 허니 에어로카노', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 자몽 허니 에어로카노', '스타벅스 자몽 허니 에어로카노', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 돌체 라떼', '아이스 스타벅스 돌체 라떼', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 돌체 라떼', '아이스 스타벅스 돌체 라떼', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 돌체 라떼', '아이스 스타벅스 돌체 라떼', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '카라멜 마키아또', '아이스 카라멜 마키아또', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '카라멜 마키아또', '아이스 카라멜 마키아또', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '카라멜 마키아또', '아이스 카라멜 마키아또', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '화이트 초콜릿 모카', '아이스 화이트 초콜릿 모카', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '화이트 초콜릿 모카', '아이스 화이트 초콜릿 모카', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '화이트 초콜릿 모카', '아이스 화이트 초콜릿 모카', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '밀크카라멜 라떼', '밀크카라멜 라떼', 'Tall', 'HOT', 5800, 'branch_menu_photo', @hs_extra_source),
('HS002', '밀크카라멜 라떼', '밀크카라멜 라떼', 'Grande', 'HOT', 6400, 'branch_menu_photo', @hs_extra_source),
('HS002', '밀크카라멜 라떼', '밀크카라멜 라떼', 'Venti', 'HOT', 7200, 'branch_menu_photo', @hs_extra_source),
('HS002', '스위트 밀크 커피', '스위트 밀크 커피', 'Tall', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS002', '스위트 밀크 커피', '스위트 밀크 커피', 'Grande', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '스위트 밀크 커피', '스위트 밀크 커피', 'Venti', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '카페 모카', '아이스 카페 모카', 'Tall', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS002', '카페 모카', '아이스 카페 모카', 'Grande', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '카페 모카', '아이스 카페 모카', 'Venti', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 라떼', '아이스 바닐라 라떼', 'Tall', 'ICE', 5200, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 라떼', '아이스 바닐라 라떼', 'Grande', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 라떼', '아이스 바닐라 라떼', 'Venti', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS002', '카푸치노', '아이스 카푸치노', 'Tall', 'ICE', 5200, 'branch_menu_photo', @hs_extra_source),
('HS002', '카푸치노', '아이스 카푸치노', 'Grande', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS002', '카푸치노', '아이스 카푸치노', 'Venti', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 에어로카노', '스타벅스 에어로카노', 'Tall', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 에어로카노', '스타벅스 에어로카노', 'Grande', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 에어로카노', '스타벅스 에어로카노', 'Venti', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '블론드 카페 아메리카노', '블론드 카페 아메리카노', 'Tall', 'ICE', 4700, 'branch_menu_photo', @hs_extra_source),
('HS002', '블론드 카페 아메리카노', '블론드 카페 아메리카노', 'Grande', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS002', '블론드 카페 아메리카노', '블론드 카페 아메리카노', 'Venti', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),

('HS002', '프렌치 바닐라 콜드 브루', '프렌치 바닐라 콜드 브루', 'Tall', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '프렌치 바닐라 콜드 브루', '프렌치 바닐라 콜드 브루', 'Grande', 'ICE', 6900, 'branch_menu_photo', @hs_extra_source),
('HS002', '프렌치 바닐라 콜드 브루', '프렌치 바닐라 콜드 브루', 'Venti', 'ICE', 7700, 'branch_menu_photo', @hs_extra_source),
('HS002', '돌체 콜드 브루', '돌체 콜드 브루', 'Tall', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS002', '돌체 콜드 브루', '돌체 콜드 브루', 'Grande', 'ICE', 6800, 'branch_menu_photo', @hs_extra_source),
('HS002', '돌체 콜드 브루', '돌체 콜드 브루', 'Venti', 'ICE', 7600, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 아인슈페너 콜드브루', '바닐라 아인슈페너 콜드브루', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 아인슈페너 콜드브루', '바닐라 아인슈페너 콜드브루', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 아인슈페너 콜드브루', '바닐라 아인슈페너 콜드브루', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 크림 콜드 브루', '바닐라 크림 콜드 브루', 'Tall', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 크림 콜드 브루', '바닐라 크림 콜드 브루', 'Grande', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS002', '바닐라 크림 콜드 브루', '바닐라 크림 콜드 브루', 'Venti', 'ICE', 7400, 'branch_menu_photo', @hs_extra_source),
('HS002', '베르가못 콜드 브루', '베르가못 콜드 브루', 'Tall', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS002', '베르가못 콜드 브루', '베르가못 콜드 브루', 'Grande', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS002', '베르가못 콜드 브루', '베르가못 콜드 브루', 'Venti', 'ICE', 7400, 'branch_menu_photo', @hs_extra_source),
('HS002', '오트 콜드 브루', '오트 콜드 브루', 'Tall', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS002', '오트 콜드 브루', '오트 콜드 브루', 'Grande', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS002', '오트 콜드 브루', '오트 콜드 브루', 'Venti', 'ICE', 7400, 'branch_menu_photo', @hs_extra_source),
('HS002', '콜드 브루', '콜드 브루', 'Tall', 'ICE', 5100, 'branch_menu_photo', @hs_extra_source),
('HS002', '콜드 브루', '콜드 브루', 'Grande', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS002', '콜드 브루', '콜드 브루', 'Venti', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),

('HS002', '아이스 퓨어 말차', '아이스 퓨어 말차', 'Tall', 'ICE', 5100, 'branch_menu_photo', @hs_extra_source),
('HS002', '아이스 퓨어 말차', '아이스 퓨어 말차', 'Grande', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS002', '아이스 퓨어 말차', '아이스 퓨어 말차', 'Venti', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '아이스 퓨어 호지차', '아이스 퓨어 호지차', 'Tall', 'ICE', 5100, 'branch_menu_photo', @hs_extra_source),
('HS002', '아이스 퓨어 호지차', '아이스 퓨어 호지차', 'Grande', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS002', '아이스 퓨어 호지차', '아이스 퓨어 호지차', 'Venti', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 딸기 라떼', '스타벅스 딸기 라떼', 'Tall', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 딸기 라떼', '스타벅스 딸기 라떼', 'Grande', 'ICE', 7300, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 딸기 라떼', '스타벅스 딸기 라떼', 'Venti', 'ICE', 8100, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 멜론 라떼', '스타벅스 멜론 라떼', 'Tall', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 멜론 라떼', '스타벅스 멜론 라떼', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '스타벅스 멜론 라떼', '스타벅스 멜론 라떼', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '라이트 유자 레몬 블렌디드', '라이트 유자 레몬 블렌디드', 'Tall', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '라이트 유자 레몬 블렌디드', '라이트 유자 레몬 블렌디드', 'Grande', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '라이트 유자 레몬 블렌디드', '라이트 유자 레몬 블렌디드', 'Venti', 'ICE', 8300, 'branch_menu_photo', @hs_extra_source),
('HS002', '수박 주스 블렌디드', '수박 주스 블렌디드', 'Tall', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '레드빈 빙수 블렌디드', '레드빈 빙수 블렌디드', 'Grande', 'ICE', 8300, 'branch_menu_photo', @hs_extra_source),
('HS002', '애플망고 빙수 블렌디드', '애플망고 빙수 블렌디드', 'Grande', 'ICE', 8300, 'branch_menu_photo', @hs_extra_source),

('HS002', '더블 에스프레소 칩 프라푸치노', '더블 에스프레소 칩 프라푸치노', 'Tall', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '더블 에스프레소 칩 프라푸치노', '더블 에스프레소 칩 프라푸치노', 'Grande', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '더블 에스프레소 칩 프라푸치노', '더블 에스프레소 칩 프라푸치노', 'Venti', 'ICE', 7900, 'branch_menu_photo', @hs_extra_source),
('HS002', '자바 칩 프라푸치노', '자바 칩 프라푸치노', 'Tall', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '자바 칩 프라푸치노', '자바 칩 프라푸치노', 'Grande', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '자바 칩 프라푸치노', '자바 칩 프라푸치노', 'Venti', 'ICE', 7900, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 말차 크림 프라푸치노', '제주 말차 크림 프라푸치노', 'Tall', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 말차 크림 프라푸치노', '제주 말차 크림 프라푸치노', 'Grande', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 말차 크림 프라푸치노', '제주 말차 크림 프라푸치노', 'Venti', 'ICE', 7900, 'branch_menu_photo', @hs_extra_source),
('HS002', '딸기 딜라이트 요거트 블렌디드', '딸기 딜라이트 요거트 블렌디드', 'Tall', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '딸기 딜라이트 요거트 블렌디드', '딸기 딜라이트 요거트 블렌디드', 'Grande', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '딸기 딜라이트 요거트 블렌디드', '딸기 딜라이트 요거트 블렌디드', 'Venti', 'ICE', 7900, 'branch_menu_photo', @hs_extra_source),
('HS002', '자몽 허니 레몬 블렌디드', '자몽 허니 레몬 블렌디드', 'Tall', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '자몽 허니 레몬 블렌디드', '자몽 허니 레몬 블렌디드', 'Grande', 'ICE', 6900, 'branch_menu_photo', @hs_extra_source),
('HS002', '자몽 허니 레몬 블렌디드', '자몽 허니 레몬 블렌디드', 'Venti', 'ICE', 7700, 'branch_menu_photo', @hs_extra_source),
('HS002', '망고 바나나 블렌디드', '망고 바나나 블렌디드', 'Grande', 'ICE', 6600, 'branch_menu_photo', @hs_extra_source),
('HS002', '망고 패션 프루트 블렌디드', '망고 패션 프루트 블렌디드', 'Tall', 'ICE', 5600, 'branch_menu_photo', @hs_extra_source),
('HS002', '망고 패션 프루트 블렌디드', '망고 패션 프루트 블렌디드', 'Grande', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS002', '망고 패션 프루트 블렌디드', '망고 패션 프루트 블렌디드', 'Venti', 'ICE', 7000, 'branch_menu_photo', @hs_extra_source),

('HS002', '체리&자두 에너지 피지오', '체리&자두 에너지 피지오', 'Tall', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '체리&자두 에너지 피지오', '체리&자두 에너지 피지오', 'Grande', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '체리&자두 에너지 피지오', '체리&자두 에너지 피지오', 'Venti', 'ICE', 7900, 'branch_menu_photo', @hs_extra_source),
('HS002', '쿨 라임 피지오', '쿨 라임 피지오', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '쿨 라임 피지오', '쿨 라임 피지오', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '쿨 라임 피지오', '쿨 라임 피지오', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '라이트 핑크 자몽 피지오', '라이트 핑크 자몽 피지오', 'Tall', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS002', '라이트 핑크 자몽 피지오', '라이트 핑크 자몽 피지오', 'Grande', 'ICE', 7100, 'branch_menu_photo', @hs_extra_source),
('HS002', '라이트 핑크 자몽 피지오', '라이트 핑크 자몽 피지오', 'Venti', 'ICE', 7900, 'branch_menu_photo', @hs_extra_source),
('HS002', '피치 딸기 피지오', '피치 딸기 피지오', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '피치 딸기 피지오', '피치 딸기 피지오', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '피치 딸기 피지오', '피치 딸기 피지오', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '시그니처 핫 초콜릿', '시그니처 핫 초콜릿', 'Tall', 'HOT', 5900, 'branch_menu_photo', @hs_extra_source),
('HS002', '시그니처 핫 초콜릿', '시그니처 핫 초콜릿', 'Grande', 'HOT', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '시그니처 핫 초콜릿', '시그니처 핫 초콜릿', 'Venti', 'HOT', 7300, 'branch_menu_photo', @hs_extra_source),

('HS002', '딸기 아사이 레모네이드', '딸기 아사이 레모네이드', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '딸기 아사이 레모네이드', '딸기 아사이 레모네이드', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '딸기 아사이 레모네이드', '딸기 아사이 레모네이드', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 말차 라떼', '제주 말차 라떼', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 말차 라떼', '제주 말차 라떼', 'Grande', 'ICE', 6900, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 말차 라떼', '제주 말차 라떼', 'Venti', 'ICE', 7700, 'branch_menu_photo', @hs_extra_source),
('HS002', '유자 민트 티', '유자 민트 티', 'Tall', 'ICE', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '유자 민트 티', '유자 민트 티', 'Grande', 'ICE', 6700, 'branch_menu_photo', @hs_extra_source),
('HS002', '유자 민트 티', '유자 민트 티', 'Venti', 'ICE', 7500, 'branch_menu_photo', @hs_extra_source),
('HS002', '자몽 허니 블랙 티', '자몽 허니 블랙 티', 'Tall', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS002', '자몽 허니 블랙 티', '자몽 허니 블랙 티', 'Grande', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS002', '자몽 허니 블랙 티', '자몽 허니 블랙 티', 'Venti', 'ICE', 7300, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 유기농 녹차로 만든 티', '제주 유기농 녹차로 만든 티', 'Tall', 'HOT', 5300, 'branch_menu_photo', @hs_extra_source),
('HS002', '제주 유기농 녹차로 만든 티', '제주 유기농 녹차로 만든 티', 'Venti', 'HOT', 6900, 'branch_menu_photo', @hs_extra_source),
('HS002', '민트 블렌드 티', '민트 블렌드 티', 'Tall', 'HOT', 4500, 'branch_menu_photo', @hs_extra_source),
('HS002', '민트 블렌드 티', '민트 블렌드 티', 'Venti', 'HOT', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '얼 그레이 티', '얼 그레이 티', 'Tall', 'HOT', 4500, 'branch_menu_photo', @hs_extra_source),
('HS002', '얼 그레이 티', '얼 그레이 티', 'Venti', 'HOT', 6100, 'branch_menu_photo', @hs_extra_source),
('HS002', '유스베리 티', '유스베리 티', 'Tall', 'HOT', 4500, 'branch_menu_photo', @hs_extra_source),
('HS002', '유스베리 티', '유스베리 티', 'Venti', 'HOT', 6100, 'branch_menu_photo', @hs_extra_source);

-- HS003 메가MGC커피 행신역점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS003', '헛개리카노', '헛개리카노', '기본', 'HOT', 2400, 'branch_menu_photo', @hs_extra_source),
('HS003', '헛개리카노', '헛개리카노', '기본', 'ICE', 2400, 'branch_menu_photo', @hs_extra_source),
('HS003', '헤이즐넛아메리카노', '헤이즐넛아메리카노', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS003', '헤이즐넛아메리카노', '헤이즐넛아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS003', '바닐라아메리카노', '바닐라아메리카노', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS003', '바닐라아메리카노', '바닐라아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS003', '꿀아메리카노', '꿀아메리카노', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS003', '꿀아메리카노', '꿀아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS003', '콜드브루', '콜드브루', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '콜드브루', '콜드브루', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '디카페인 콜드브루', '디카페인 콜드브루', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '디카페인 콜드브루', '디카페인 콜드브루', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '콜드브루 라떼', '콜드브루 라떼', '기본', 'HOT', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '콜드브루 라떼', '콜드브루 라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '디카페인 콜드브루 라떼', '디카페인 콜드브루 라떼', '기본', 'HOT', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '디카페인 콜드브루 라떼', '디카페인 콜드브루 라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '카푸치노', '카푸치노', '기본', 'HOT', 2900, 'branch_menu_photo', @hs_extra_source),
('HS003', '카푸치노', '카푸치노', '기본', 'ICE', 2900, 'branch_menu_photo', @hs_extra_source),
('HS003', '바닐라라떼', '바닐라라떼', '기본', 'HOT', 3400, 'branch_menu_photo', @hs_extra_source),
('HS003', '바닐라라떼', '바닐라라떼', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS003', '헤이즐넛라떼', '헤이즐넛라떼', '기본', 'HOT', 3400, 'branch_menu_photo', @hs_extra_source),
('HS003', '헤이즐넛라떼', '헤이즐넛라떼', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS003', '연유라떼', '연유라떼', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '연유라떼', '연유라떼', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '카라멜마끼아또', '카라멜마끼아또', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '카라멜마끼아또', '카라멜마끼아또', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '카페모카', '카페모카', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '카페모카', '카페모카', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '곡물라떼', '곡물라떼', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '곡물라떼', '곡물라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '녹차라떼', '녹차라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '녹차라떼', '녹차라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '로얄밀크티', '로얄밀크티', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '로얄밀크티', '로얄밀크티', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '토피넛라떼', '토피넛라떼', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS003', '토피넛라떼', '토피넛라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS003', '고구마라떼', '고구마라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '고구마라떼', '고구마라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '허니자몽블랙티', '허니자몽블랙티', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '허니자몽블랙티', '허니자몽블랙티', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '사과유자차', '사과유자차', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '사과유자차', '사과유자차', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '상큼리치티', '상큼리치티', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '상큼리치티', '상큼리치티', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '유자차', '유자차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '유자차', '유자차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '레몬차', '레몬차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '레몬차', '레몬차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '자몽차', '자몽차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '자몽차', '자몽차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '녹차', '녹차', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '녹차', '녹차', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '얼그레이', '얼그레이', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '얼그레이', '얼그레이', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '캐모마일', '캐모마일', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '캐모마일', '캐모마일', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '페퍼민트', '페퍼민트', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '페퍼민트', '페퍼민트', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS003', '핫초코', '핫초코', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '큐브라떼', '큐브라떼', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS003', '라이트 바닐라 아몬드라떼', '라이트 바닐라 아몬드라떼', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '할메가커피', '할메가커피', '기본', 'ICE', 2300, 'branch_menu_photo', @hs_extra_source),
('HS003', '할메가미숫커피', '할메가미숫커피', '기본', 'ICE', 3100, 'branch_menu_photo', @hs_extra_source),
('HS003', '딸기라떼', '딸기라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '오레오초코', '오레오초코', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '아이스초코', '아이스초코', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '흑당라떼', '흑당라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '흑당버블라떼', '흑당버블라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS003', '흑당밀크티라떼', '흑당밀크티라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '흑당버블밀크티라떼', '흑당버블밀크티라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS003', '플레인 퐁크러쉬', '플레인 퐁크러쉬', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '바나나 퐁크러쉬', '바나나 퐁크러쉬', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '딸기 퐁크러쉬', '딸기 퐁크러쉬', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '초코 퐁크러쉬', '초코 퐁크러쉬', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '쿠키 프라페', '쿠키 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '딸기쿠키 프라페', '딸기쿠키 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '민트 프라페', '민트 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '녹차 프라페', '녹차 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '리얼초코 프라페', '리얼초코 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '커피 프라페', '커피 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '코코넛 커피 스무디', '코코넛 커피 스무디', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),
('HS003', '귤 톡톡 젤리스무디', '귤 톡톡 젤리스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '골드망고스무디', '골드망고스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '플레인 요거트스무디', '플레인 요거트스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '망고 요거트스무디', '망고 요거트스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '블루베리 요거트스무디', '블루베리 요거트스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '딸기 요거트스무디', '딸기 요거트스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '골드키위 주스', '골드키위 주스', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '피치푸룬 주스', '피치푸룬 주스', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '딸기 주스', '딸기 주스', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '딸기바나나 주스', '딸기바나나 주스', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS003', '메가에이드', '메가에이드', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS003', '제로부스트에이드', '제로부스트에이드', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS003', '체리콕', '체리콕', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS003', '자몽 에이드', '자몽 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '청포도 에이드', '청포도 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '레몬 에이드', '레몬 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '블루레몬 에이드', '블루레몬 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS003', '라임모히또', '라임모히또', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS003', '복숭아아이스티', '복숭아아이스티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS003', '제로복숭아아이스티', '제로복숭아아이스티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS003', '왕메가 헛개리카노', '왕메가 헛개리카노', '왕메가', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS003', '왕할메가커피', '왕할메가커피', '왕메가', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS003', '왕메가초코', '왕메가초코', '왕메가', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS003', '왕메가사과유자차', '왕메가사과유자차', '왕메가', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS003', '왕메가아이스티', '왕메가아이스티', '왕메가', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source);

-- HS004 컴포즈커피 고양행신점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS004', '에스프레소', '에스프레소', '기본', 'HOT', 1500, 'branch_menu_photo', @hs_extra_source),
('HS004', '카푸치노', '카푸치노', '기본', 'HOT', 2900, 'branch_menu_photo', @hs_extra_source),
('HS004', '바닐라라떼', '바닐라라떼', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '바닐라라떼', '바닐라라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '바닐라라떼', '바닐라라떼', '빅포즈', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS004', '헤이즐넛라떼', '헤이즐넛라떼', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '헤이즐넛라떼', '헤이즐넛라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '헤이즐넛라떼', '헤이즐넛라떼', '빅포즈', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS004', '카라멜마끼아또', '카라멜마끼아또', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '카라멜마끼아또', '카라멜마끼아또', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '카페모카', '카페모카', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '카페모카', '카페모카', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '아샷추', '아샷추', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '아샷추', '아샷추', '빅포즈', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS004', '돌체라떼', '돌체라떼', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '돌체라떼', '돌체라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '돌체라떼', '돌체라떼', '빅포즈', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS004', '흑당 카페라떼', '흑당 카페라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '달고나라떼', '달고나라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '아인슈페너라떼', '아인슈페너라떼', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS004', '콜드브루', '콜드브루', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '콜드브루', '콜드브루', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '콜드브루 라떼', '콜드브루 라떼', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '콜드브루 라떼', '콜드브루 라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '아인슈페너', '아인슈페너', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 아메리카노', '디카페인 아메리카노', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 아메리카노', '디카페인 아메리카노', '기본', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 아메리카노', '디카페인 아메리카노', '빅포즈', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 콜드브루', '디카페인 콜드브루', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 콜드브루', '디카페인 콜드브루', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 콜드브루 라떼', '디카페인 콜드브루 라떼', '기본', 'HOT', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '디카페인 콜드브루 라떼', '디카페인 콜드브루 라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '곡물라떼', '곡물라떼', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '곡물라떼', '곡물라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS004', '고구마라떼', '고구마라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '고구마라떼', '고구마라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '더블초코라떼', '더블초코라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '더블초코라떼', '더블초코라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '그린티라떼', '그린티라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '그린티라떼', '그린티라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '쿠키초코라떼', '쿠키초코라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '쿠키초코라떼', '쿠키초코라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '흑당밀크', '흑당밀크', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '후르츠라떼 (딸기)', '후르츠라떼 (딸기)', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '후르츠라떼 (망고)', '후르츠라떼 (망고)', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '후르츠라떼 (블루베리)', '후르츠라떼 (블루베리)', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '밀크티', '밀크티', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '밀크티', '밀크티', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '복숭아티', '복숭아티', '기본', 'HOT', 3000, 'branch_menu_photo', @hs_extra_source),
('HS004', '복숭아티', '복숭아티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS004', '복숭아티', '복숭아티', '빅포즈', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS004', '자몽허니블랙티', '자몽허니블랙티', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '자몽허니블랙티', '자몽허니블랙티', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '아망추', '아망추', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '아망추', '아망추', '빅포즈', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS004', '딸기 스무디', '딸기 스무디', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '망고 스무디', '망고 스무디', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '블루베리 스무디', '블루베리 스무디', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '플레인 요거트스무디', '플레인 요거트스무디', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '딸기 요거트스무디', '딸기 요거트스무디', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '망고 요거트스무디', '망고 요거트스무디', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '블루베리 요거트스무디', '블루베리 요거트스무디', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '자몽 에이드', '자몽 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '레몬 에이드', '레몬 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '망고 에이드', '망고 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '유자 에이드', '유자 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '블루레몬 에이드', '블루레몬 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '청포도 에이드', '청포도 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '패션후르츠 에이드', '패션후르츠 에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '페퍼민트', '페퍼민트', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '캐모마일', '캐모마일', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '로즈마리', '로즈마리', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '페퍼민트', '페퍼민트', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '캐모마일', '캐모마일', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '로즈마리', '로즈마리', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '얼그레이', '얼그레이', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '블랙퍼스트', '블랙퍼스트', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '얼그레이', '얼그레이', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '블랙퍼스트', '블랙퍼스트', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS004', '자몽티', '자몽티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '레몬티', '레몬티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '유자티', '유자티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '자몽티', '자몽티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '레몬티', '레몬티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '유자티', '유자티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '복숭아주스', '복숭아주스', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '키위주스', '키위주스', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '오렌지당근 주스', '오렌지당근 주스', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '샤인머스캣케일 주스', '샤인머스캣케일 주스', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '국내산 딸기 주스', '국내산 딸기 주스', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS004', '쿠키초코 프라페', '쿠키초코 프라페', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '그린티 프라페', '그린티 프라페', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '모카 자바칩 프라페', '모카 자바칩 프라페', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS004', '플레인 밀크쉐이크', '플레인 밀크쉐이크', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS004', '캔디소다 밀크쉐이크', '캔디소다 밀크쉐이크', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS004', '쿠키 밀크쉐이크', '쿠키 밀크쉐이크', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS004', '커피 밀크쉐이크', '커피 밀크쉐이크', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS004', '팥절미 밀크쉐이크', '팥절미 밀크쉐이크', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS004', '딸기모찌 밀크쉐이크', '딸기모찌 밀크쉐이크', '기본', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS004', '쫀득카노', '쫀득카노', '기본', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS004', '유자 스무디', '유자 스무디', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS004', '민트초코오레오라떼', '민트초코오레오라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS004', '리얼초코자바칩 프라페', '리얼초코자바칩 프라페', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS004', '민트초코오레오 프라페', '민트초코오레오 프라페', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source);

-- HS005 백억커피 행신점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS005', '꿀 아메리카노', '꿀 아메리카노', '기본', 'HOT', 2400, 'branch_menu_photo', @hs_extra_source),
('HS005', '꿀 아메리카노', '꿀 아메리카노', '기본', 'ICE', 2400, 'branch_menu_photo', @hs_extra_source),
('HS005', '바닐라 아메리카노', '바닐라 아메리카노', '기본', 'HOT', 2400, 'branch_menu_photo', @hs_extra_source),
('HS005', '바닐라 아메리카노', '바닐라 아메리카노', '기본', 'ICE', 2400, 'branch_menu_photo', @hs_extra_source),
('HS005', '헤이즐넛 아메리카노', '헤이즐넛 아메리카노', '기본', 'HOT', 2400, 'branch_menu_photo', @hs_extra_source),
('HS005', '헤이즐넛 아메리카노', '헤이즐넛 아메리카노', '기본', 'ICE', 2400, 'branch_menu_photo', @hs_extra_source),
('HS005', '백억 리치 라떼', '백억 리치 라떼', '기본', 'HOT', 4000, 'branch_menu_photo', @hs_extra_source),
('HS005', '백억 리치 라떼', '백억 리치 라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS005', '백억커피', '백억커피', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '백억커피', '백억커피', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '꿀 카페라떼', '꿀 카페라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '꿀 카페라떼', '꿀 카페라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '카라멜마끼아또', '카라멜마끼아또', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '카라멜마끼아또', '카라멜마끼아또', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '연유라떼', '연유라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '연유라떼', '연유라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '카페모카', '카페모카', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '카페모카', '카페모카', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '바닐라라떼', '바닐라라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '바닐라라떼', '바닐라라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '저당 바닐라 라떼', '저당 바닐라 라떼', '기본', 'HOT', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '저당 바닐라 라떼', '저당 바닐라 라떼', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),

('HS005', '디카페인 아메리카노', '디카페인 아메리카노', '기본', 'HOT', 2900, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 아메리카노', '디카페인 아메리카노', '기본', 'ICE', 2900, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 백억카노', '디카페인 백억카노 1L', '1리터', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 꿀 아메리카노', '디카페인 꿀 아메리카노', '기본', 'HOT', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 꿀 아메리카노', '디카페인 꿀 아메리카노', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 바닐라 아메리카노', '디카페인 바닐라 아메리카노', '기본', 'HOT', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 바닐라 아메리카노', '디카페인 바닐라 아메리카노', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 헤이즐넛 아메리카노', '디카페인 헤이즐넛 아메리카노', '기본', 'HOT', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 헤이즐넛 아메리카노', '디카페인 헤이즐넛 아메리카노', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 카페라떼', '디카페인 카페라떼', '기본', 'HOT', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 카페라떼', '디카페인 카페라떼', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 백억 리치 라떼', '디카페인 백억 리치 라떼', '기본', 'HOT', 5000, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 백억 리치 라떼', '디카페인 백억 리치 라떼', '기본', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 백억커피', '디카페인 백억커피', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 백억커피', '디카페인 백억커피', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 꿀 카페라떼', '디카페인 꿀 카페라떼', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 꿀 카페라떼', '디카페인 꿀 카페라떼', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 카라멜마끼아또', '디카페인 카라멜마끼아또', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 카라멜마끼아또', '디카페인 카라멜마끼아또', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 연유라떼', '디카페인 연유라떼', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 연유라떼', '디카페인 연유라떼', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 카페모카', '디카페인 카페모카', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 카페모카', '디카페인 카페모카', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 바닐라라떼', '디카페인 바닐라라떼', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 바닐라라떼', '디카페인 바닐라라떼', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 저당 바닐라 라떼', '디카페인 저당 바닐라 라떼', '기본', 'HOT', 5900, 'branch_menu_photo', @hs_extra_source),
('HS005', '디카페인 저당 바닐라 라떼', '디카페인 저당 바닐라 라떼', '기본', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),

('HS005', '콜드브루', '콜드브루', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '콜드브루', '콜드브루', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '콜드브루 라떼', '콜드브루 라떼', '기본', 'HOT', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '콜드브루 라떼', '콜드브루 라떼', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '콜드브루 연유라떼', '콜드브루 연유라떼', '기본', 'HOT', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '콜드브루 연유라떼', '콜드브루 연유라떼', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),

('HS005', '미숫가루 라떼', '미숫가루 라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '미숫가루 라떼', '미숫가루 라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '고구마 라떼', '고구마 라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '고구마 라떼', '고구마 라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '토피넛 라떼', '토피넛 라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '토피넛 라떼', '토피넛 라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '초코 라떼', '초코 라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '초코 라떼', '초코 라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '민트 초코 라떼', '민트 초코 라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '민트 초코 라떼', '민트 초코 라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '말차 라떼', '말차 라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '말차 라떼', '말차 라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '보성 홍차 밀크티', '보성 홍차 밀크티', '기본', 'HOT', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '보성 홍차 밀크티', '보성 홍차 밀크티', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),

('HS005', '찐 딸기 우유', '찐 딸기 우유', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '찐 망고 우유', '찐 망고 우유', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '찐 블루베리 우유', '찐 블루베리 우유', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '찐 체리 우유', '찐 체리 우유', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '찐 바나나 딸기 우유', '찐 바나나 딸기 우유', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '흑당 버블티', '흑당 버블티', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '꿀 말차 버블티', '꿀 말차 버블티', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '딸기 홍차 버블티', '딸기 홍차 버블티', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),

('HS005', '플레인 요거트 스무디', '플레인 요거트 스무디', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '딸기 요거트 스무디', '딸기 요거트 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '망고 요거트 스무디', '망고 요거트 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '블루베리 요거트 스무디', '블루베리 요거트 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '백억커피 스무디', '백억커피 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '초코 스무디', '초코 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '민트초코 스무디', '민트초코 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '미숫가루 스무디', '미숫가루 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '말차 스무디', '말차 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '배 스무디', '배 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '딸기 망고 스무디', '딸기 망고 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '자두 스무디', '자두 스무디', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),

('HS005', '레몬 에이드', '레몬 에이드', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '자몽 에이드', '자몽 에이드', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '자두 에이드', '자두 에이드', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '체리 에이드', '체리 에이드', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '청포도 에이드', '청포도 에이드', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '더블 베리 에이드', '더블 베리 에이드', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '레몬콕', '레몬콕', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '체리콕', '체리콕', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '백억 슈퍼 드링크', '백억 슈퍼 드링크', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '딸기 주스', '딸기 주스', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '망고 주스', '망고 주스', '기본', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '수박 주스', '수박 주스 (착즙)', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '파인사과 주스', '파인사과 주스 (착즙)', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),

('HS005', '복숭아 아이스티', '복숭아 아이스티', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS005', '아샷추', '아샷추', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '아망추', '아망추', '기본', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '레몬차', '레몬차', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '레몬차', '레몬차', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '자몽차', '자몽차', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '자몽차', '자몽차', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '오미자차', '오미자차', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '오미자차', '오미자차', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '매실차', '매실차', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '매실차', '매실차', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '얼그레이 티', '얼그레이 티', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '얼그레이 티', '얼그레이 티', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '페퍼민트 티', '페퍼민트 티', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '페퍼민트 티', '페퍼민트 티', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '캐모마일 티', '캐모마일 티', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '캐모마일 티', '캐모마일 티', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '전통 식혜', '전통 식혜', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS005', '유자차', '유자차', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '유자차', '유자차', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '자몽 허니 블랙티', '자몽 허니 블랙티', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '자몽 허니 블랙티', '자몽 허니 블랙티', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),

('HS005', '백억커피', '백억커피 1L', '1리터', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '복숭아 아이스티', '복숭아 아이스티 1L', '1리터', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS005', '아샷추', '아샷추 1L', '1리터', 'ICE', 5400, 'branch_menu_photo', @hs_extra_source),
('HS005', '아망추', '아망추 1L', '1리터', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS005', '초코 라떼', '초코 라떼 1L', '1리터', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS005', '미숫가루 라떼', '미숫가루 라떼 1L', '1리터', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS005', '찐 딸기 우유', '찐 딸기 우유 1L', '1리터', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS005', '캐모마일 티', '캐모마일 티 1L', '1리터', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '페퍼민트 티', '페퍼민트 티 1L', '1리터', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS005', '얼그레이 티', '얼그레이 티 1L', '1리터', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),

('HS005', '카라멜 팝콘', '카라멜 팝콘', 'Small', '', 2000, 'branch_menu_photo', @hs_extra_source),
('HS005', '카라멜 팝콘', '카라멜 팝콘', 'Large', '', 8000, 'branch_menu_photo', @hs_extra_source);

-- HS006 우지커피 행신역점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS006', '에스프레소', '에스프레소', '기본', 'HOT', 1800, 'branch_menu_photo', @hs_extra_source),
('HS006', '커피오렌망', '커피오렌망', '10oz', 'ICE', 3200, 'branch_menu_photo', @hs_extra_source),
('HS006', '아포카토', '아포카토', '기본', 'ICE', 2000, 'branch_menu_photo', @hs_extra_source),
('HS006', '헤이즐넛 아메리카노', '헤이즐넛 아메리카노', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS006', '헤이즐넛 아메리카노', '헤이즐넛 아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS006', '피칸 아메리카노', '피칸 아메리카노', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS006', '피칸 아메리카노', '피칸 아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS006', '꿀 아메리카노', '꿀 아메리카노', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS006', '꿀 아메리카노', '꿀 아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),

('HS006', '콜드브루커피', '콜드브루커피', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS006', '콜드브루라떼', '콜드브루라떼', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '디카페인 콜드브루커피', '디카페인 콜드브루커피', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS006', '디카페인 콜드브루라떼', '디카페인 콜드브루라떼', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '오렌지크리미슈페너', '오렌지크리미슈페너', '10oz', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '율무크림 콜드브루', '율무크림 콜드브루', '기본', 'ICE', 4600, 'branch_menu_photo', @hs_extra_source),
('HS006', '바닐라크림 콜드브루', '바닐라크림 콜드브루', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),
('HS006', '말차콜드브루 라떼', '말차콜드브루 라떼', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),
('HS006', '연유크리미슈페너', '연유크리미슈페너', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),

('HS006', '딥 카페라떼', '딥 카페라떼', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '딥 카페라떼', '딥 카페라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '피넛크림라떼', '피넛크림라떼', '10oz', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS006', '우지믹스커피', '우지믹스커피', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS006', '카푸치노', '카푸치노', '기본', 'HOT', 3000, 'branch_menu_photo', @hs_extra_source),
('HS006', '카푸치노', '카푸치노', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS006', '시나몬슈가 카푸치노', '시나몬슈가 카푸치노', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '시나몬슈가 카푸치노', '시나몬슈가 카푸치노', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '바닐라라떼', '바닐라라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '바닐라라떼', '바닐라라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '연유라떼', '연유라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '연유라떼', '연유라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '꿀라떼', '꿀라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '꿀라떼', '꿀라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '피칸라떼', '피칸라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '피칸라떼', '피칸라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '카라멜마끼아또', '카라멜마끼아또', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '카라멜마끼아또', '카라멜마끼아또', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '헤이즐넛라떼', '헤이즐넛라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '헤이즐넛라떼', '헤이즐넛라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '아이스크림라떼', '아이스크림라떼', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '연유큐브라떼', '연유큐브라떼', '기본', 'ICE', 4100, 'branch_menu_photo', @hs_extra_source),
('HS006', '카페모카', '카페모카', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '카페모카', '카페모카', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '헤이즐넛 카페모카', '헤이즐넛 카페모카', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '헤이즐넛 카페모카', '헤이즐넛 카페모카', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '화이트초코 카페모카', '화이트초코 카페모카', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '화이트초코 카페모카', '화이트초코 카페모카', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '고구마 카페라떼', '고구마 카페라떼', '기본', 'HOT', 4300, 'branch_menu_photo', @hs_extra_source),
('HS006', '고구마 카페라떼', '고구마 카페라떼', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS006', '민트카페모카', '민트카페모카', '기본', 'HOT', 4800, 'branch_menu_photo', @hs_extra_source),
('HS006', '민트카페모카', '민트카페모카', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),

('HS006', '곡물라떼', '곡물라떼', '기본', 'HOT', 3000, 'branch_menu_photo', @hs_extra_source),
('HS006', '곡물라떼', '곡물라떼', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS006', '초코라떼', '초코라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '초코라떼', '초코라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '고구마라떼', '고구마라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '고구마라떼', '고구마라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '민트초코라떼', '민트초코라떼', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '민트초코라떼', '민트초코라떼', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '얼그레이 초코라떼', '얼그레이 초코라떼', '기본', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '얼그레이 초코라떼', '얼그레이 초코라떼', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '리얼딸기라떼', '리얼딸기라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '녹차라떼', '녹차라떼', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '녹차라떼', '녹차라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '밀크티', '밀크티', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '밀크티', '밀크티', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '율무차', '율무차', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '율무차', '율무차', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '토피넛라떼', '토피넛라떼', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS006', '토피넛라떼', '토피넛라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS006', '리얼블루베리라떼', '리얼블루베리라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS006', '리얼초코라떼', '리얼초코라떼', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '리얼초코라떼', '리얼초코라떼', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '마시멜로우 초코라떼', '마시멜로우 초코라떼', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '마시멜로우 초코라떼', '마시멜로우 초코라떼', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),

('HS006', '체리콕', '체리콕', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '레몬에이드', '레몬에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '자몽에이드', '자몽에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '청포도에이드', '청포도에이드', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '라임모히또', '라임모히또', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '스크류딸기 스무디', '스크류딸기 스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '플레인요거트 스무디', '플레인요거트 스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '딸기요거트 스무디', '딸기요거트 스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '망고요거트 스무디', '망고요거트 스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '블루베리요거트 스무디', '블루베리요거트 스무디', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS006', '홍시스무디', '홍시스무디', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS006', '리얼홍시주스', '리얼홍시주스', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),

('HS006', '더블커피칩 프라페', '더블커피칩 프라페', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS006', '카라멜 프라페', '카라멜 프라페', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS006', '자바칩 프라페', '자바칩 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '민트초코 프라페', '민트초코 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '녹차 프라페', '녹차 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '딸기 프라페', '딸기 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '오레오 프라페', '오레오 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '딸기오레오 프라페', '딸기오레오 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '율무크림프라페', '율무크림프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS006', '화이트초코 프라페', '화이트초코 프라페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),

('HS006', '애플 히비스커스', '애플 히비스커스', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '애플 히비스커스', '애플 히비스커스', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '레몬생강차', '레몬생강차', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '레몬생강차', '레몬생강차', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '얼그레이 레몬차', '얼그레이 레몬차', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '얼그레이 레몬차', '얼그레이 레몬차', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS006', '모히또 레몬 홍차', '모히또 레몬 홍차', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '모히또 레몬 홍차', '모히또 레몬 홍차', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '망고오렌망', '망고오렌망', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS006', '복숭아 아이스티', '복숭아 아이스티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS006', '석류 아이스티', '석류 아이스티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS006', '레몬차', '레몬차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '레몬차', '레몬차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '자몽차', '자몽차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '자몽차', '자몽차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '유자차', '유자차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '유자차', '유자차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '청귤차', '청귤차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '청귤차', '청귤차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '생강차', '생강차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '생강차', '생강차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS006', '페퍼민트', '페퍼민트', '기본', 'HOT', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '페퍼민트', '페퍼민트', '기본', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '캐모마일', '캐모마일', '기본', 'HOT', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '캐모마일', '캐모마일', '기본', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '얼그레이', '얼그레이', '기본', 'HOT', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '얼그레이', '얼그레이', '기본', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '히비스커스', '히비스커스', '기본', 'HOT', 2800, 'branch_menu_photo', @hs_extra_source),
('HS006', '히비스커스', '히비스커스', '기본', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source);

-- HS007 빽다방 행신역점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS007', '원조커피', '원조커피', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '원조커피', '원조커피', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '원조커피', '빽사이즈 원조커피', '빽사이즈', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '아이스티샷추가(아샷추)', '아이스티샷추가(아샷추)', '기본', 'ICE', 3400, 'branch_menu_photo', @hs_extra_source),
('HS007', '아이스티샷추가(아샷추)', '빽사이즈 아이스티샷추가(아샷추)', '빽사이즈', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS007', '바닐라라떼', '바닐라라떼', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '바닐라라떼', '바닐라라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '바닐라라떼', '빽사이즈 바닐라라떼', '빽사이즈', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS007', '카라멜마키아또', '카라멜마키아또', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '카라멜마키아또', '카라멜마키아또', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '카페모카', '카페모카', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '카페모카', '카페모카', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '달달연유라떼', '달달연유라떼', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '달달연유라떼', '달달연유라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '콜드브루', '콜드브루', '기본', 'HOT', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '콜드브루', '콜드브루', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '콜드브루라떼', '콜드브루라떼', '기본', 'HOT', 4500, 'branch_menu_photo', @hs_extra_source),
('HS007', '콜드브루라떼', '콜드브루라떼', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),

('HS007', '초코라떼', '초코라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '초코라떼', '초코라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '초코라떼', '빽사이즈 초코라떼', '빽사이즈', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS007', '토피넛라떼', '토피넛라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '토피넛라떼', '토피넛라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '민트초코라떼', '민트초코라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '민트초코라떼', '민트초코라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '바나나라떼', '바나나라떼', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '바나나라떼', '바나나라떼', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기라떼', '딸기라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기라떼', '빽사이즈 딸기라떼', '빽사이즈', 'ICE', 5000, 'branch_menu_photo', @hs_extra_source),
('HS007', '말차라떼', '말차라떼', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '말차라떼', '말차라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '흑당버블라떼', '흑당버블라떼', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),

('HS007', '원조빽스치노', '원조 빽스치노', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS007', '초코빽스치노', '초코 빽스치노', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '민트초코빽스치노', '민트초코 빽스치노', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '쿠키크런치빽스치노', '쿠키크런치 빽스치노', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기바나나빽스치노', '딸기바나나 빽스치노', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '초코바나나빽스치노', '초코바나나 빽스치노', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '말차빽스치노', '말차 빽스치노', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기빽스치노', '딸기 빽스치노', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '피스타치오빽스치노', '피스타치오 빽스치노', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),

('HS007', '밀크쉐이크', '밀크쉐이크', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '바나나밀크쉐이크', '바나나밀크쉐이크', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '플레인요거트스무디', '플레인요거트스무디', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기요거트스무디', '딸기요거트스무디', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '블루베리요거트스무디', '블루베리요거트스무디', '기본', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),

('HS007', '체리콕콕', '체리콕콕', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기 에이드', '딸기 에이드', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '깔라만시 에이드', '깔라만시 에이드', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '유자 에이드', '유자 에이드', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '레몬 에이드', '레몬 에이드', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '청포도 에이드', '청포도 에이드', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '자몽 에이드', '자몽 에이드', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '복숭아 에이드', '복숭아 에이드', '기본', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '완전망고 주스', '완전망고 주스', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '완전딸기주스', '완전딸기주스', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '완전블루베리주스', '완전블루베리주스', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),

('HS007', '식혜', '식혜', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS007', '식혜', '빽사이즈 식혜', '빽사이즈', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '수정과', '수정과', '기본', 'HOT', 2700, 'branch_menu_photo', @hs_extra_source),
('HS007', '수정과', '수정과', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS007', '쌍화차', '쌍화차', '기본', 'HOT', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '쌍화차', '쌍화차', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '미숫가루', '미숫가루', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '미숫가루', '빽사이즈 미숫가루', '빽사이즈', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '청포도플라워', '청포도플라워', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '복숭아아이스티', '복숭아아이스티', '기본', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source),
('HS007', '복숭아아이스티', '빽사이즈 복숭아아이스티', '빽사이즈', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '페퍼민트티', '페퍼민트티', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '페퍼민트티', '페퍼민트티', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '황금캐모마일티', '황금캐모마일티', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '황금캐모마일티', '황금캐모마일티', '기본', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '피치우롱스위티', '피치우롱스위티', '기본', 'HOT', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '피치우롱스위티', '피치우롱스위티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '깔라만시티', '깔라만시티', '기본', 'HOT', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '깔라만시티', '깔라만시티', '기본', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '레몬얼그레이티', '레몬얼그레이티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '레몬얼그레이티', '레몬얼그레이티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '오렌지자몽블랙티', '오렌지자몽블랙티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '오렌지자몽블랙티', '오렌지자몽블랙티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '유자티', '유자티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '유자티', '유자티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '레몬티', '레몬티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '레몬티', '레몬티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '자몽티', '자몽티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '자몽티', '자몽티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '밀크티', '밀크티', '기본', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '밀크티', '밀크티', '기본', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '흑당버블밀크티', '흑당버블밀크티', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),

('HS007', '생강차', '생강차', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS007', '생강차', '생강차', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS007', '율무라떼', '율무라떼', '기본', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS007', '율무라떼', '율무라떼', '기본', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS007', '율무아몬드라떼', '율무아몬드라떼', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '율무아몬드라떼', '율무아몬드라떼', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '사과품은 유자티', '사과품은 유자티', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '사과품은 유자티', '사과품은 유자티', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '포도열린 민트트리티', '포도열린 민트트리티', '기본', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '포도열린 민트트리티', '포도열린 민트트리티', '기본', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기젤라또 파르페', '딸기젤라또 파르페', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기복숭아 루이보스티', '딸기복숭아 루이보스티', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기젤라또 레몬스무디', '딸기젤라또 레몬스무디', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS007', '딸기앤쿠키 쉐이크', '딸기앤쿠키 쉐이크', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS007', '우리사과주스', '우리사과주스', '기본', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS007', '사과당근주스', '사과당근주스', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '메리 더블넛츠 초코라떼', '메리 더블넛츠 초코라떼', '기본', 'HOT', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '메리 더블넛츠 초코라떼', '메리 더블넛츠 초코라떼', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '골든 자바칩 스무디', '골든 자바칩 스무디', '기본', 'ICE', 4800, 'branch_menu_photo', @hs_extra_source),
('HS007', '말차크림라떼', '말차크림라떼', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS007', '말차크림망고스무디', '말차크림망고스무디', '기본', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),

('HS007', '디카페인 아메리카노', '디카페인 아메리카노', '기본', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 아메리카노', '디카페인 아메리카노', '기본', 'ICE', 2700, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 아메리카노', '빽사이즈 디카페인 아메리카노', '빽사이즈', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카페라떼', '디카페인 카페라떼', '기본', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카페라떼', '디카페인 카페라떼', '기본', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카페라떼', '빽사이즈 디카페인 카페라떼', '빽사이즈', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 아이스티샷추가(아샷추)', '디카페인 아이스티샷추가(아샷추)', '기본', 'ICE', 3600, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 아이스티샷추가(아샷추)', '빽사이즈 디카페인 아이스티샷추가(아샷추)', '빽사이즈', 'ICE', 4900, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카페모카', '디카페인 카페모카', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카페모카', '디카페인 카페모카', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카라멜마키아또', '디카페인 카라멜마키아또', '기본', 'HOT', 4200, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 카라멜마키아또', '디카페인 카라멜마키아또', '기본', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 달달연유라떼', '디카페인 달달연유라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 달달연유라떼', '디카페인 달달연유라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 바닐라라떼', '디카페인 바닐라라떼', '기본', 'HOT', 4400, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 바닐라라떼', '디카페인 바닐라라떼', '기본', 'ICE', 4400, 'branch_menu_photo', @hs_extra_source),
('HS007', '디카페인 바닐라라떼', '빽사이즈 디카페인 바닐라라떼', '빽사이즈', 'ICE', 7200, 'branch_menu_photo', @hs_extra_source),

('HS007', '붕어빵 한마리 (팥)', '붕어빵 한마리 (팥)', '기본', '', 1500, 'branch_menu_photo', @hs_extra_source),
('HS007', '붕어빵 한마리 (슈크림)', '붕어빵 한마리 (슈크림)', '기본', '', 1500, 'branch_menu_photo', @hs_extra_source),
('HS007', '요거트 아이스크림', '요거트 아이스크림', '기본', '', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '크리미슈', '크리미슈', '기본', '', 2300, 'branch_menu_photo', @hs_extra_source),
('HS007', '크리미단팥빵', '크리미단팥빵', '기본', '', 2300, 'branch_menu_photo', @hs_extra_source),
('HS007', '고메버터소금빵', '고메버터소금빵', '기본', '', 2800, 'branch_menu_photo', @hs_extra_source),
('HS007', '크룽지', '크룽지', '기본', '', 2800, 'branch_menu_photo', @hs_extra_source),
('HS007', '쫀득 감자빵', '쫀득 감자빵', '기본', '', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '쫀득 고구마빵', '쫀득 고구마빵', '기본', '', 3000, 'branch_menu_photo', @hs_extra_source),
('HS007', '긴페스츄리와플', '긴페스츄리와플', '기본', '', 3500, 'branch_menu_photo', @hs_extra_source),
('HS007', '사라다빵', '사라다빵', '기본', '', 3500, 'branch_menu_photo', @hs_extra_source);

-- HS008 더벤티 행신역점
SET @hs_extra_source = NULL;
INSERT INTO hs_extra_prices VALUES
('HS008', '오트카페라떼', '오트카페라떼', 'Large', 'HOT', 3800, 'branch_menu_photo', @hs_extra_source),
('HS008', '오트카페라떼', '오트카페라떼', 'Large', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS008', '오트카페라떼', '오트카페라떼', 'Jumbo', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS008', '바닐라딥라떼', '바닐라딥라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '바닐라딥라떼', '바닐라딥라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '바닐라딥라떼', '바닐라딥라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '헤이즐넛딥라떼', '헤이즐넛딥라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '헤이즐넛딥라떼', '헤이즐넛딥라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '헤이즐넛딥라떼', '헤이즐넛딥라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '카라멜마끼아또', '카라멜마끼아또', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '카라멜마끼아또', '카라멜마끼아또', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '카라멜마끼아또', '카라멜마끼아또', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '믹스커피', '믹스커피', 'Large', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '믹스커피', '믹스커피', 'Large', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '믹스커피', '믹스커피', 'Jumbo', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '토피넛라떼', '토피넛라떼', 'Large', 'HOT', 3700, 'branch_menu_photo', @hs_extra_source),
('HS008', '토피넛라떼', '토피넛라떼', 'Large', 'ICE', 3700, 'branch_menu_photo', @hs_extra_source),
('HS008', '토피넛라떼', '토피넛라떼', 'Jumbo', 'ICE', 5700, 'branch_menu_photo', @hs_extra_source),
('HS008', '연유라떼', '연유라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '연유라떼', '연유라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '연유라떼', '연유라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '카페모카', '카페모카', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '카페모카', '카페모카', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '카페모카', '카페모카', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '코코넛라떼', '코코넛라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '코코넛라떼', '코코넛라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '코코넛라떼', '코코넛라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '아이스크림라떼', '아이스크림라떼', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '아이스크림라떼', '아이스크림라떼', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),

('HS008', '콜드브루', '콜드브루', 'Large', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS008', '콜드브루', '콜드브루', 'Jumbo', 'ICE', 5300, 'branch_menu_photo', @hs_extra_source),
('HS008', '콜드브루라떼', '콜드브루라떼', 'Large', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),
('HS008', '콜드브루라떼', '콜드브루라떼', 'Jumbo', 'ICE', 5800, 'branch_menu_photo', @hs_extra_source),
('HS008', '바닐라크림 콜드브루', '바닐라크림 콜드브루', 'Large', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS008', '바닐라크림 콜드브루', '바닐라크림 콜드브루', 'Jumbo', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS008', '헤이즐넛크림 콜드브루', '헤이즐넛크림 콜드브루', 'Large', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS008', '헤이즐넛크림 콜드브루', '헤이즐넛크림 콜드브루', 'Jumbo', 'ICE', 6000, 'branch_menu_photo', @hs_extra_source),
('HS008', '아인슈페너', '아인슈페너', 'Medium', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '아인슈페너', '아인슈페너', 'Large', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차 아인슈페너', '말차 아인슈페너', 'Medium', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차 아인슈페너', '말차 아인슈페너', 'Large', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),

('HS008', '이천쌀라떼', '이천쌀라떼', 'Large', 'HOT', 2800, 'branch_menu_photo', @hs_extra_source),
('HS008', '이천쌀라떼', '이천쌀라떼', 'Large', 'ICE', 2800, 'branch_menu_photo', @hs_extra_source),
('HS008', '이천쌀흑임자폼라떼', '이천쌀흑임자폼라떼', 'Large', 'HOT', 3300, 'branch_menu_photo', @hs_extra_source),
('HS008', '이천쌀흑임자폼라떼', '이천쌀흑임자폼라떼', 'Large', 'ICE', 3300, 'branch_menu_photo', @hs_extra_source),
('HS008', '율무오트라떼', '율무오트라떼', 'Large', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '율무오트라떼', '율무오트라떼', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '율무오트라떼', '율무오트라떼', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '율무프라페', '율무프라페', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '율무프라페', '율무프라페', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차라떼', '말차라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차라떼', '말차라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차라떼', '말차라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '판단 코코넛 카페라떼', '판단 코코넛 카페라떼', 'Large', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '판단 코코넛 카페라떼', '판단 코코넛 카페라떼', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '판단 피스타치오 카페라떼', '판단 피스타치오 카페라떼', 'Large', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '판단 피스타치오 카페라떼', '판단 피스타치오 카페라떼', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),

('HS008', '군고구마라떼', '군고구마라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '군고구마라떼', '군고구마라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '군고구마라떼', '군고구마라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '로얄밀크티', '로얄밀크티', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '로얄밀크티', '로얄밀크티', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '로얄밀크티', '로얄밀크티', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코라떼', '초코라떼', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코라떼', '초코라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코라떼', '초코라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '멜팅초코', '멜팅초코', 'Large', 'HOT', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '멜팅초코', '멜팅초코', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '멜팅초코', '멜팅초코', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기라떼', '딸기라떼', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기라떼', '딸기라떼', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기연유라떼', '딸기연유라떼', 'Large', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '미숫가루', '미숫가루', 'Large', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS008', '미숫가루', '미숫가루', 'Jumbo', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '타로버블티', '타로버블티', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '타로버블티', '타로버블티', 'Jumbo', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS008', '흑설탕버블티', '흑설탕버블티', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '흑설탕버블티', '흑설탕버블티', 'Jumbo', 'ICE', 6400, 'branch_menu_photo', @hs_extra_source),
('HS008', '수박라떼', '수박라떼', 'Large', 'ICE', 3800, 'branch_menu_photo', @hs_extra_source),

('HS008', '복숭아아이스티', '복숭아아이스티', 'Large', 'ICE', 3000, 'branch_menu_photo', @hs_extra_source),
('HS008', '복숭아아이스티', '복숭아아이스티', 'Jumbo', 'ICE', 4000, 'branch_menu_photo', @hs_extra_source),
('HS008', '유자 허니티', '유자 허니티', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '유자 허니티', '유자 허니티', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '유자 허니티', '유자 허니티', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽 허니티', '자몽 허니티', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽 허니티', '자몽 허니티', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽 허니티', '자몽 허니티', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '레몬 허니티', '레몬 허니티', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '레몬 허니티', '레몬 허니티', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '레몬 허니티', '레몬 허니티', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽허니블랙티', '자몽허니블랙티', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽허니블랙티', '자몽허니블랙티', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽허니블랙티', '자몽허니블랙티', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '유자애플티', '유자애플티', 'Large', 'HOT', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '유자애플티', '유자애플티', 'Large', 'ICE', 3500, 'branch_menu_photo', @hs_extra_source),
('HS008', '유자애플티', '유자애플티', 'Jumbo', 'ICE', 5500, 'branch_menu_photo', @hs_extra_source),
('HS008', '리치캐모마일', '리치캐모마일', 'Large', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '리치캐모마일', '리치캐모마일', 'Large', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '리치캐모마일', '리치캐모마일', 'Jumbo', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '청귤얼그레이', '청귤얼그레이', 'Large', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '청귤얼그레이', '청귤얼그레이', 'Large', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '청귤얼그레이', '청귤얼그레이', 'Jumbo', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플히비스커스', '애플히비스커스', 'Large', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플히비스커스', '애플히비스커스', 'Large', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플히비스커스', '애플히비스커스', 'Jumbo', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '트리플민트', '트리플민트', 'Large', 'HOT', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '트리플민트', '트리플민트', 'Large', 'ICE', 2500, 'branch_menu_photo', @hs_extra_source),
('HS008', '트리플민트', '트리플민트', 'Jumbo', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),

('HS008', '오렌지과채주스', '오렌지과채주스', 'Large', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '오렌지과채주스', '오렌지과채주스', 'Jumbo', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플과채주스', '애플과채주스', 'Large', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플과채주스', '애플과채주스', 'Jumbo', 'ICE', 6300, 'branch_menu_photo', @hs_extra_source),
('HS008', '수박주스', '수박주스', 'Large', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '체리콕', '체리콕', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '체리콕', '체리콕', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '크림소다', '크림소다', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '크림소다', '크림소다', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '메론소다', '메론소다', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '메론소다', '메론소다', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플망고 에이드', '애플망고 에이드', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '애플망고 에이드', '애플망고 에이드', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽 에이드', '자몽 에이드', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '자몽 에이드', '자몽 에이드', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '레몬 에이드', '레몬 에이드', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '레몬 에이드', '레몬 에이드', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),

('HS008', '드래곤스무디 소다', '드래곤스무디 소다', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '드래곤스무디 망고', '드래곤스무디 망고', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '드래곤스무디 멜론', '드래곤스무디 멜론', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '드래곤스무디 요거트', '드래곤스무디 요거트', '기본', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기요거트스무디', '딸기요거트스무디', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기요거트스무디', '딸기요거트스무디', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '블루베리요거트스무디', '블루베리요거트스무디', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '블루베리요거트스무디', '블루베리요거트스무디', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '망고요거트스무디', '망고요거트스무디', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '망고요거트스무디', '망고요거트스무디', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '플레인요거트스무디', '플레인요거트스무디', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '플레인요거트스무디', '플레인요거트스무디', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코 쉐이크', '초코 쉐이크', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코 쉐이크', '초코 쉐이크', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '밀크 쉐이크', '밀크 쉐이크', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '밀크 쉐이크', '밀크 쉐이크', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '에스프레소 쉐이크', '에스프레소 쉐이크', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '에스프레소 쉐이크', '에스프레소 쉐이크', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),

('HS008', '수박멜론크러쉬', '수박멜론크러쉬', 'Large', 'ICE', 4300, 'branch_menu_photo', @hs_extra_source),
('HS008', '자두피치 크러쉬', '자두피치 크러쉬', 'Large', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS008', '자두피치 크러쉬', '자두피치 크러쉬', 'Jumbo', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS008', '망고패션 크러쉬', '망고패션 크러쉬', 'Large', 'ICE', 4200, 'branch_menu_photo', @hs_extra_source),
('HS008', '망고패션 크러쉬', '망고패션 크러쉬', 'Jumbo', 'ICE', 6200, 'branch_menu_photo', @hs_extra_source),
('HS008', '쿠키앤크림 프라페', '쿠키앤크림 프라페', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '쿠키앤크림 프라페', '쿠키앤크림 프라페', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '자바칩 프라페', '자바칩 프라페', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '자바칩 프라페', '자바칩 프라페', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코 코코프라페', '초코 코코프라페', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '초코 코코프라페', '초코 코코프라페', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '밀크 코코프라페', '밀크 코코프라페', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '밀크 코코프라페', '밀크 코코프라페', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '코코넛커피프라페', '코코넛커피프라페', 'Large', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '코코넛커피프라페', '코코넛커피프라페', 'Jumbo', 'ICE', 6500, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차프라페', '말차프라페', 'Large', 'ICE', 3900, 'branch_menu_photo', @hs_extra_source),
('HS008', '말차프라페', '말차프라페', 'Jumbo', 'ICE', 5900, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기 쿠키 프라페', '딸기 쿠키 프라페', 'Large', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source),
('HS008', '딸기 코코넛 프라페', '딸기 코코넛 프라페', '기본', 'ICE', 4500, 'branch_menu_photo', @hs_extra_source);

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
FROM (SELECT DISTINCT brand_name FROM hs_stores) s
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
WHERE EXISTS (SELECT 1 FROM hs_id_guard)
  AND COALESCE(@hs_preserve_existing_coordinates, 0) = 0;

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

-- 추가 메뉴는 브랜드별 상품으로 관리합니다.
SET @hs_menu_base = (SELECT COALESCE(MAX(menu_id), 0) FROM menus);
INSERT INTO menus (menu_id, brand_id, standard_name, category, is_decaf)
SELECT @hs_menu_base + ROW_NUMBER() OVER (ORDER BY extra.brand_id, extra.menu_name),
       extra.brand_id, extra.menu_name,
       CASE
         WHEN extra.menu_name REGEXP '라[떼테]' THEN 'LATTE'
         WHEN extra.menu_name REGEXP '커피|콜드[ ]?브루|에스프레소|카푸치노|마키아[또토]|플랫[ ]?화이트|카페[ ]?모카' THEN 'COFFEE'
         WHEN extra.menu_name REGEXP '티$|차$|아이스티|밀크티' THEN 'TEA'
         ELSE 'ETC'
       END,
       extra.menu_name LIKE '%디카페인%'
FROM (
  SELECT DISTINCT c.brand_id, p.menu_name
  FROM hs_extra_prices p
  JOIN hs_store_ids s ON s.store_code = p.store_code
  JOIN cafes c ON c.cafe_id = s.cafe_id
  WHERE c.brand_id IS NOT NULL
) extra
WHERE EXISTS (SELECT 1 FROM hs_id_guard)
  AND NOT EXISTS (
    SELECT 1 FROM menus m WHERE m.brand_id = extra.brand_id AND m.standard_name = extra.menu_name
  );

SET @hs_price_base = (SELECT COALESCE(MAX(price_id), 0) FROM menu_prices);
INSERT INTO menu_prices (price_id, cafe_id, menu_id, size, option_name, price, source, price_scope, verified_at)
SELECT @hs_price_base + ROW_NUMBER() OVER (ORDER BY p.store_code, p.menu_name, p.size_label, p.temperature),
       s.cafe_id, m.menu_id, p.size_label, p.temperature, p.price_won, 'DEMO', 'STORE', CURRENT_DATE()
FROM hs_extra_prices p
JOIN hs_store_ids s ON s.store_code = p.store_code
JOIN cafes c ON c.cafe_id = s.cafe_id
JOIN (
  SELECT brand_id, standard_name, MIN(menu_id) AS menu_id
  FROM menus WHERE brand_id IS NOT NULL
  GROUP BY brand_id, standard_name
) m ON m.brand_id = c.brand_id AND m.standard_name = p.menu_name
WHERE EXISTS (SELECT 1 FROM hs_id_guard)
  AND NOT EXISTS (
    SELECT 1 FROM menu_prices x
    WHERE x.cafe_id = s.cafe_id AND x.menu_id = m.menu_id
      AND CASE WHEN TRIM(x.size) = '기본' THEN 'regular' ELSE LOWER(TRIM(x.size)) END
        = CASE WHEN TRIM(p.size_label) = '기본' THEN 'regular' ELSE LOWER(TRIM(p.size_label)) END
      AND UPPER(TRIM(x.option_name)) = p.temperature
  );

-- 새 지점에는 같은 브랜드의 기준 지점에서 시연 메뉴·가격을 복사합니다.
SET @hs_copy_price_base = (
  SELECT COALESCE(MAX(price_id), 0)
  FROM menu_prices
);

INSERT INTO menu_prices (
  price_id, cafe_id, menu_id, size, option_name, price,
  sale_status, source, price_scope, verified_at
)
WITH source_options AS (
  SELECT
    cafe_id, menu_id, size, option_name, price, sale_status,
    ROW_NUMBER() OVER (
      PARTITION BY cafe_id, menu_id, size, option_name
      ORDER BY updated_at DESC, price_id DESC
    ) AS option_rank
  FROM menu_prices
  WHERE source = 'DEMO'
    AND cafe_id IN (9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008)
)
SELECT
  @hs_copy_price_base + ROW_NUMBER() OVER (
    ORDER BY target.cafe_id, p.menu_id, p.size, p.option_name
  ),
  target.cafe_id,
  p.menu_id,
  p.size,
  p.option_name,
  p.price,
  p.sale_status,
  'DEMO',
  'BRAND',
  CURRENT_DATE()
FROM hs_stores AS target
JOIN cafes AS target_cafe
  ON target_cafe.cafe_id = target.cafe_id
JOIN cafes AS base_cafe
  ON base_cafe.brand_id = target_cafe.brand_id
 AND base_cafe.cafe_id IN (9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008)
JOIN source_options AS p
  ON p.cafe_id = base_cafe.cafe_id
 AND p.option_rank = 1
WHERE target.cafe_id NOT IN (9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008)
  AND EXISTS (SELECT 1 FROM hs_id_guard)
  AND NOT EXISTS (
    SELECT 1
    FROM menu_prices AS existing
    WHERE existing.cafe_id = target.cafe_id
      AND existing.menu_id = p.menu_id
      AND existing.size = p.size
      AND existing.option_name = p.option_name
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
ORDER BY c.cafe_id, m.standard_name, p.size, p.option_name, p.price_id;

DROP TEMPORARY TABLE hs_stores, hs_americano_prices, hs_latte_prices, hs_prices, hs_store_ids, hs_menu_ids, hs_id_guard, hs_extra_prices;
