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

CREATE TEMPORARY TABLE hs_extra_prices LIKE hs_prices;

-- 추가 메뉴는 지점별 공개 목록에서 확인한 시연 가격입니다.
-- 옵션이 표시되지 않은 경우 미표기로 저장합니다.
-- HS001 공개 메뉴 · https://app.passorder.co.kr/advance/941b4b51-d5c5-4427-8bc9-ccb1bda3595c
SET @hs_extra_source = 'https://app.passorder.co.kr/advance/941b4b51-d5c5-4427-8bc9-ccb1bda3595c';
INSERT INTO hs_extra_prices VALUES
('HS001', '신촌커피', '신촌커피', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '아인슈페너 2023', '아인슈페너 2023', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '데이&나잇', '데이&나잇', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '카푸치노', '카푸치노', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source),
('HS001', '바닐라 카페라떼', '바닐라 카페라떼', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '카페 모카', '카페 모카', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '카라멜 마키아또', '카라멜 마키아또', '미표기', '미표기', 5900, 'branch_listing_reference', @hs_extra_source),
('HS001', '스페니쉬 연유 카페라떼', '스페니쉬 연유 카페라떼', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS001', '아이스크림 카페라떼', '아이스크림 카페라떼', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '롱블랙', '롱블랙', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS001', '디카페인 오트 화이트 카페라떼', '디카페인 오트 화이트 카페라떼', '미표기', '미표기', 5600, 'branch_listing_reference', @hs_extra_source),
('HS001', '콜드브루', '콜드브루', '미표기', '미표기', 4900, 'branch_listing_reference', @hs_extra_source),
('HS001', '콜드브루 라떼', '콜드브루 라떼', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS001', '올타임콜드브루', '올타임콜드브루', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS001', '잉글리쉬 브렉퍼스트', '잉글리쉬 브렉퍼스트', '미표기', '미표기', 5100, 'branch_listing_reference', @hs_extra_source),
('HS001', '얼그레이', '얼그레이', '미표기', '미표기', 5100, 'branch_listing_reference', @hs_extra_source),
('HS001', '민트', '민트', '미표기', '미표기', 5100, 'branch_listing_reference', @hs_extra_source),
('HS001', '카모마일', '카모마일', '미표기', '미표기', 5100, 'branch_listing_reference', @hs_extra_source),
('HS001', '크림 카라멜(루이보스)', '크림 카라멜(루이보스)', '미표기', '미표기', 5100, 'branch_listing_reference', @hs_extra_source),
('HS001', '제주 유기농 녹차', '제주 유기농 녹차', '미표기', '미표기', 4800, 'branch_listing_reference', @hs_extra_source),
('HS001', '애플 민트티', '애플 민트티', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '허니 레몬티', '허니 레몬티', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '피치 블랙티', '피치 블랙티', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS001', '버블 밀크티', '버블 밀크티', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS001', '버블 그린티 라떼', '버블 그린티 라떼', '미표기', '미표기', 5900, 'branch_listing_reference', @hs_extra_source),
('HS001', '로얄 밀크티', '로얄 밀크티', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '그린티 라떼', '그린티 라떼', '미표기', '미표기', 5200, 'branch_listing_reference', @hs_extra_source),
('HS001', '흑임자 카페라떼', '흑임자 카페라떼', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '달고나 카페라떼', '달고나 카페라떼', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS001', '쑥 라떼', '쑥 라떼', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '고구마 라떼', '고구마 라떼', '미표기', '미표기', 5200, 'branch_listing_reference', @hs_extra_source),
('HS001', '스트로베리 라떼', '스트로베리 라떼', '미표기', '미표기', 6300, 'branch_listing_reference', @hs_extra_source),
('HS001', '생딸기 가득 주스', '생딸기 가득 주스', '미표기', '미표기', 6500, 'branch_listing_reference', @hs_extra_source),
('HS001', '스트로베리 밀키 웨이 프라페', '스트로베리 밀키 웨이 프라페', '미표기', '미표기', 6500, 'branch_listing_reference', @hs_extra_source),
('HS001', '딸기 젤리 밀크티', '딸기 젤리 밀크티', '미표기', '미표기', 6500, 'branch_listing_reference', @hs_extra_source),
('HS001', '딸기 파르페', '딸기 파르페', '미표기', '미표기', 6500, 'branch_listing_reference', @hs_extra_source),
('HS001', '키위 바나나 주스', '키위 바나나 주스', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS001', '오렌지 자몽 주스', '오렌지 자몽 주스', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS001', '복숭아 에이드', '복숭아 에이드', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS001', '레몬 셔벗 에이드', '레몬 셔벗 에이드', '미표기', '미표기', 6500, 'branch_listing_reference', @hs_extra_source),
('HS001', '샤인머스캣 청포도 에이드', '샤인머스캣 청포도 에이드', '미표기', '미표기', 6300, 'branch_listing_reference', @hs_extra_source),
('HS001', '오렌지 에이드', '오렌지 에이드', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '자몽 에이드', '자몽 에이드', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '오렌지 자몽티', '오렌지 자몽티', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '유자 레몬티', '유자 레몬티', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '스트로베리 초콜릿 프라페', '스트로베리 초콜릿 프라페', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '스트로베리 피치 프라페', '스트로베리 피치 프라페', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS001', '민트 초코 프라페', '민트 초코 프라페', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS001', '제주 말차 프라페', '제주 말차 프라페', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS001', '요거트 프라페', '요거트 프라페', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS001', '망고 프라페', '망고 프라페', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '로얄 밀크티 쉐이크', '로얄 밀크티 쉐이크', '미표기', '미표기', 6300, 'branch_listing_reference', @hs_extra_source),
('HS001', '커피 모카칩 프라페', '커피 모카칩 프라페', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '커피 카라멜 프라페', '커피 카라멜 프라페', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS001', '바닐라 밀크쉐이크', '바닐라 밀크쉐이크', '미표기', '미표기', 5600, 'branch_listing_reference', @hs_extra_source),
('HS001', '초코 밀크쉐이크', '초코 밀크쉐이크', '미표기', '미표기', 5600, 'branch_listing_reference', @hs_extra_source),
('HS001', '커피 밀크쉐이크', '커피 밀크쉐이크', '미표기', '미표기', 5600, 'branch_listing_reference', @hs_extra_source),
('HS001', '20곡 오틀리 라떼', '20곡 오틀리 라떼', '미표기', '미표기', 6100, 'branch_listing_reference', @hs_extra_source),
('HS001', '오틀리 모카 프라페', '오틀리 모카 프라페', '미표기', '미표기', 6500, 'branch_listing_reference', @hs_extra_source),
('HS001', '초콜릿 라떼', '초콜릿 라떼', '미표기', '미표기', 4800, 'branch_listing_reference', @hs_extra_source),
('HS001', '블루베리 요거트 드링크', '블루베리 요거트 드링크', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source),
('HS001', '플레인 요거트 드링크', '플레인 요거트 드링크', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source);

-- HS002 공개 메뉴 · https://www.tabling.co.kr/place/677ccba166de5f06987d97df
SET @hs_extra_source = 'https://www.tabling.co.kr/place/677ccba166de5f06987d97df';
INSERT INTO hs_extra_prices VALUES
('HS002', '스타벅스 돌체 라떼', '스타벅스 돌체 라떼', '미표기', '미표기', 5900, 'branch_listing_reference', @hs_extra_source),
('HS002', '카라멜 마키아또', '카라멜 마키아또', '미표기', '미표기', 5900, 'branch_listing_reference', @hs_extra_source),
('HS002', '카푸치노', '카푸치노', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source);

-- HS003 공개 메뉴 · https://app.passorder.co.kr/normal/e9ceeffb-3d4b-4e20-a789-aeb4d96ec6a5/menus
SET @hs_extra_source = 'https://app.passorder.co.kr/normal/e9ceeffb-3d4b-4e20-a789-aeb4d96ec6a5/menus';
INSERT INTO hs_extra_prices VALUES
('HS003', '할메가미숫커피', '할메가미숫커피', '미표기', '미표기', 3100, 'branch_online_order', @hs_extra_source),
('HS003', '카푸치노', '카푸치노', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS003', '라이트 바닐라 아몬드라떼', '라이트 바닐라 아몬드라떼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '왕메가 헛개리카노', '왕메가 헛개리카노', '미표기', '미표기', 3400, 'branch_online_order', @hs_extra_source),
('HS003', '헛개리카노', '헛개리카노', '미표기', '미표기', 2400, 'branch_online_order', @hs_extra_source),
('HS003', '헤이즐넛라떼', '헤이즐넛라떼', '미표기', '미표기', 3400, 'branch_online_order', @hs_extra_source),
('HS003', '바닐라라떼', '바닐라라떼', '미표기', '미표기', 3400, 'branch_online_order', @hs_extra_source),
('HS003', '카라멜마끼아또', '카라멜마끼아또', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', '카페모카', '카페모카', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '티라미수라떼', '티라미수라떼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '큐브라떼', '큐브라떼(Only ICE)', '미표기', 'ICE', 4200, 'branch_online_order', @hs_extra_source),
('HS003', '연유라떼', '연유라떼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '초코젤라또 말차라떼', '초코젤라또 말차라떼', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '멋쟁이 토마토 스무디', '멋쟁이 토마토 스무디', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', '복숭아 퐁당 요거트 스무디', '복숭아 퐁당 요거트 스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '초당옥수수 프라페', '초당옥수수 프라페', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', '포도녹차 젤리 크러쉬', '포도녹차 젤리 크러쉬', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '와앙 핫 치즈스틱 & 딥', '와앙 핫 치즈스틱 & 딥', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '엠지씨네 통쏘시지 김볶밥', '엠지씨네 통쏘시지 김볶밥', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '치즈케이크 딸기요거트 크레페', '치즈케이크 딸기요거트 크레페', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '말차 젤라또 팥빙 파르페', '말차 젤라또 팥빙 파르페', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '파인망고코코 스무디', '파인망고코코 스무디', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '수박소르베 밀키 스무디', '수박소르베 밀키 스무디', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '수박 리치코코 슬러시', '수박 리치코코 슬러시', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS003', '자몽 톡톡 스무디', '자몽 톡톡 스무디', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS003', '제로 레몬말차 아이스티', '제로 레몬말차 아이스티', '미표기', '미표기', 2400, 'branch_online_order', @hs_extra_source),
('HS003', '저당 꿀배 XO야쿠르트', '저당 꿀배 XO야쿠르트', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', '내 맘대로 더블 젤라또', '내 맘대로 더블 젤라또', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '슈크림라떼', '슈크림라떼', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', '버터가 쫀득해떡', '버터가 쫀득해떡', '미표기', '미표기', 1400, 'branch_online_order', @hs_extra_source),
('HS003', '커피초코칩 젤라또 슈크림라떼', '커피초코칩 젤라또 슈크림라떼', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '애플머스캣 요거트 스무디', '애플머스캣 요거트 스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '망고폼 자스민 티플레저', '망고폼 자스민 티플레저', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', 'M망고 G구아바 C캐럿 주스', 'M망고 G구아바 C캐럿 주스', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS003', '에그머니 머핀인줄 브런치빵', '에그머니 머핀인줄 브런치빵', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS003', '엠지씨네 양념 컵치킨', '엠지씨네 양념 컵치킨', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '딸기라떼', '딸기라떼', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS003', '제로 체리콜라', '제로 체리콜라', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS003', '하우스밀크 라떼', '하우스밀크 라떼(Only ICE)', '미표기', 'ICE', 3500, 'branch_online_order', @hs_extra_source),
('HS003', '무카페인 오르조라떼', '무카페인 오르조라떼(Only ICE)', '미표기', 'ICE', 3300, 'branch_online_order', @hs_extra_source),
('HS003', '중식마녀 마라크림 새우토스트', '중식마녀 마라크림 새우토스트', '미표기', '미표기', 4600, 'branch_online_order', @hs_extra_source),
('HS003', '저당 골든애플 블랙티', '저당 골든애플 블랙티(Only Ice)', '미표기', 'ICE', 3500, 'branch_online_order', @hs_extra_source),
('HS003', '밤고구마호박팥크림치즈빵', '밤고구마호박팥크림치즈빵', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS003', '메가베리 아사이볼', '메가베리 아사이볼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '왕메가초코', '왕메가초코', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '왕메가아이스티', '왕메가아이스티', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '제로 복숭아 아이스티', '제로 복숭아 아이스티', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS003', '메가에이드', '메가에이드(Only ICE)', '미표기', 'ICE', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '할메가커피(20oz, Only ICE)', '할메가커피(20oz, Only ICE)', '미표기', '미표기', 2300, 'branch_online_order', @hs_extra_source),
('HS003', '왕할메가커피(32oz, Only ICE)', '왕할메가커피(32oz, Only ICE)', '미표기', '미표기', 3400, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 카푸치노', '디카페인 카푸치노', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 바닐라라떼', '디카페인 바닐라라떼', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 헤이즐넛라떼', '디카페인 헤이즐넛라떼', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 카라멜마끼아또', '디카페인 카라멜마끼아또', '미표기', '미표기', 4700, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 카페모카', '디카페인 카페모카', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 티라미수라떼', '디카페인 티라미수라떼', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 연유라떼', '디카페인 연유라떼', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 헛개리카노', '디카페인 헛개리카노', '미표기', '미표기', 3400, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 왕메가헛개리카노', '디카페인 왕메가헛개리카노', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS003', '디카페인 라이트바닐라아몬드라떼', '디카페인 라이트바닐라아몬드라떼', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS003', '콜드브루 오리지널', '콜드브루 오리지널', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS003', '콜드브루라떼', '콜드브루라떼', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS003', '콜드브루 디카페인', '콜드브루 디카페인', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source);

-- HS004 공개 메뉴 · https://app.passorder.co.kr/normal/bbc2d6a3-fabc-452a-a43b-7cdb15de53dd/menus
SET @hs_extra_source = 'https://app.passorder.co.kr/normal/bbc2d6a3-fabc-452a-a43b-7cdb15de53dd/menus';
INSERT INTO hs_extra_prices VALUES
('HS004', '딸기자스민 밀크 티브리즈', '딸기자스민 밀크 티브리즈', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS004', '요거폼 포도자스민 티브리즈', '요거폼 포도자스민 티브리즈', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '비스코프 라떼', '비스코프 라떼', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '생크림 시나몬 크루아상', '생크림 시나몬 크루아상', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '초코 바게트', '초코 바게트', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '명란 소프트 바게트', '명란 소프트 바게트', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '구미식 사이다 수박화채', '구미식 사이다 수박화채', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS004', '구미식 딸기우유 수박화채', '구미식 딸기우유 수박화채', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS004', '저당 복숭아 스무디', '저당 복숭아 스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '복숭아 캐모마일 티브리즈', '복숭아 캐모마일 티브리즈', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '제주 한라봉 스무디', '제주 한라봉 스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '제주 한라봉 자몽에이드', '제주 한라봉 자몽에이드', '미표기', '미표기', 3200, 'branch_online_order', @hs_extra_source),
('HS004', '스모크 바비큐 치아바타', '스모크 바비큐 치아바타', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '꿀 토마토 주스', '꿀 토마토 주스', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '그레인 바나나 주스', '그레인 바나나 주스', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '논산에서 온 수박 주스', '논산에서 온 수박 주스', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '솔티드 쿨 리치', '솔티드 쿨 리치', '미표기', '미표기', 2500, 'branch_online_order', @hs_extra_source),
('HS004', '빅포즈 솔티드 쿨 리치', '빅포즈 솔티드 쿨 리치', '미표기', '미표기', 4100, 'branch_online_order', @hs_extra_source),
('HS004', '망고 자몽 요거빙', '망고 자몽 요거빙', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '연유 수박 팥빙', '연유 수박 팥빙', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '너티 크림 라떼', '너티 크림 라떼', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '바닐라 크림 라떼', '바닐라 크림 라떼', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '파인애플 커피', '파인애플 커피', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS004', '빅포즈 파인애플 커피', '빅포즈 파인애플 커피', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS004', '베러 댄 아인슈페너', '베러 댄 아인슈페너', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS004', '올데이 오트', '올데이 오트', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS004', '올데이세트(대파크림)', '올데이세트(대파크림)', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '올데이세트(치폴레)', '올데이세트(치폴레)', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '인절미 컵빙수', '인절미 컵빙수', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS004', '팥절미 밀크쉐이크', '팥절미 밀크쉐이크', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS004', '대추차', '대추차', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '쌍화차', '쌍화차', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '매실차', '매실차', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '청귤 생강차', '청귤 생강차', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS004', '이상한 나라의 앨리스 드립백', '이상한 나라의 앨리스 드립백', '미표기', '미표기', 8900, 'branch_online_order', @hs_extra_source),
('HS004', '에스프레소', '에스프레소', '미표기', '미표기', 1500, 'branch_online_order', @hs_extra_source),
('HS004', '카푸치노', '카푸치노', '미표기', '미표기', 2900, 'branch_online_order', @hs_extra_source),
('HS004', '바닐라라떼', '바닐라라떼', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS004', '빅포즈 바닐라라떼', '빅포즈 바닐라라떼', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS004', '헤이즐넛라떼', '헤이즐넛라떼', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS004', '컴포즈 믹스커피', '컴포즈 믹스커피', '미표기', '미표기', 2300, 'branch_online_order', @hs_extra_source),
('HS004', '빅포즈 헤이즐넛라떼', '빅포즈 헤이즐넛라떼', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS004', '카라멜마끼아또', '카라멜마끼아또', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS004', '카페모카', '카페모카', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS004', '아샷추', '아샷추', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS004', '빅포즈 아샷추', '빅포즈 아샷추', '미표기', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS004', '돌체라떼', '돌체라떼', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '빅포즈 돌체라떼', '빅포즈 돌체라떼', '미표기', '미표기', 5400, 'branch_online_order', @hs_extra_source),
('HS004', '흑당 카페라떼', '흑당 카페라떼', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '흑당 버블 카페라떼', '흑당 버블 카페라떼', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS004', '아인슈페너라떼', '아인슈페너라떼', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS004', '달고나라떼', '달고나라떼', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS004', '콜드브루', '콜드브루', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS004', '콜드브루 라떼', '콜드브루 라떼', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '매샷추', '매샷추', '미표기', '미표기', 3400, 'branch_online_order', @hs_extra_source),
('HS004', '쫀득카노', '쫀득카노', '미표기', '미표기', 5800, 'branch_online_order', @hs_extra_source),
('HS004', '커피엔 역시 커피빵', '커피엔 역시 커피빵', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS004', '디카페인 바닐라라떼', '디카페인 바닐라라떼', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS004', '디카페인 헤이즐넛라떼', '디카페인 헤이즐넛라떼', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS004', '디카페인 돌체라떼', '디카페인 돌체라떼', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS004', '디카페인 콜드브루', '디카페인 콜드브루', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source);

-- HS005 공개 메뉴 · https://www.diningcode.com/profile.php?rid=bUa3RpQmWIWd
SET @hs_extra_source = 'https://www.diningcode.com/profile.php?rid=bUa3RpQmWIWd';
INSERT INTO hs_extra_prices VALUES
('HS005', '백억 김치볶음밥', '백억 김치볶음밥', '미표기', '미표기', 7000, 'branch_listing_reference', @hs_extra_source),
('HS005', '초코 스무디', '초코 스무디 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '더블 치즈 프라이', '더블 치즈 프라이', '미표기', '미표기', 7000, 'branch_listing_reference', @hs_extra_source),
('HS005', '체리 에이드', '체리 에이드 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '앙버터 다쿠아즈', '앙버터 다쿠아즈', '미표기', '미표기', 3500, 'branch_listing_reference', @hs_extra_source),
('HS005', '트로피컬 피나콜라다', '트로피컬 피나콜라다', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS005', '토피넛 라떼', '토피넛 라떼', '미표기', '미표기', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '딸기 망고 스무디', '딸기 망고 스무디 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '전통식혜', '전통식혜 (ICED ONLY)', '미표기', 'ICE', 3900, 'branch_listing_reference', @hs_extra_source),
('HS005', '1L 제로 복숭아아이스티', '1L 제로 복숭아아이스티 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '페스츄리 호두과자(5EA)', '페스츄리 호두과자(5EA)', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS005', '디카페인 백억 리치 라떼', '디카페인 백억 리치 라떼', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source),
('HS005', '체리콕', '체리콕 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '디카페인 코코넛 밀크 라떼', '디카페인 코코넛 밀크 라떼', '미표기', '미표기', 5900, 'branch_listing_reference', @hs_extra_source),
('HS005', '순수우유 다쿠아즈', '순수우유 다쿠아즈', '미표기', '미표기', 3500, 'branch_listing_reference', @hs_extra_source),
('HS005', '보성 홍차 밀크티', '보성 홍차 밀크티', '미표기', '미표기', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '배 스무디', '배 스무디 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '루이보스티', '루이보스티', '미표기', '미표기', 3900, 'branch_listing_reference', @hs_extra_source),
('HS005', '1L 복숭아 아이스티', '1L 복숭아 아이스티 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '카라멜 팝콘 L', '카라멜 팝콘 L', '미표기', '미표기', 8000, 'branch_listing_reference', @hs_extra_source),
('HS005', '백억 리치 라떼', '백억 리치 라떼', '미표기', '미표기', 4000, 'branch_listing_reference', @hs_extra_source),
('HS005', '민트초코 스무디', '민트초코 스무디 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '딥 블랙 버블티', '딥 블랙 버블티', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS005', '고구마 라떼', '고구마 라떼', '미표기', '미표기', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '바닐라 밀크쉐이크', '바닐라 밀크쉐이크', '미표기', '미표기', 5900, 'branch_listing_reference', @hs_extra_source),
('HS005', '십억 부자 세트', '십억 부자 세트', '미표기', '미표기', 16400, 'branch_listing_reference', @hs_extra_source),
('HS005', '찐 망고 우유', '찐 망고 우유 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '토도독 소세지', '토도독 소세지', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS005', '백억 대패삼겹볶음밥', '백억 대패삼겹볶음밥', '미표기', '미표기', 7500, 'branch_listing_reference', @hs_extra_source),
('HS005', '디카페인 에어로카노', '디카페인 에어로카노', '미표기', '미표기', 3400, 'branch_listing_reference', @hs_extra_source),
('HS005', '제로 백억 슈퍼 드링크', '제로 백억 슈퍼 드링크', '미표기', '미표기', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '말차 리치 라떼', '말차 리치 라떼', '미표기', '미표기', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '리치 콜드브루 라떼', '리치 콜드브루 라떼', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS005', '콜드브루', '콜드브루', '미표기', '미표기', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '티라미수 미니 홀케이크', '티라미수 미니 홀케이크', '미표기', '미표기', 7000, 'branch_listing_reference', @hs_extra_source),
('HS005', '자몽차', '자몽차', '미표기', '미표기', 3900, 'branch_listing_reference', @hs_extra_source),
('HS005', '보성 키위주스', '보성 키위주스', '미표기', '미표기', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '말차 스무디', '말차 스무디 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '블루 레몬 에이드', '블루 레몬 에이드 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '딥 초코 버블티', '딥 초코 버블티', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS005', '더블 치즈 밀크쉐이크', '더블 치즈 밀크쉐이크', '미표기', '미표기', 6900, 'branch_listing_reference', @hs_extra_source),
('HS005', '찐 블루베리 우유', '찐 블루베리 우유 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '백억 부자 세트', '백억 부자 세트', '미표기', '미표기', 29800, 'branch_listing_reference', @hs_extra_source),
('HS005', '수박 주스(착즙)', '수박 주스(착즙) (ICED ONLY)', '미표기', 'ICE', 5400, 'branch_listing_reference', @hs_extra_source),
('HS005', '오트 콜드브루 라떼', '오트 콜드브루 라떼', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS005', '자몽 에이드', '자몽 에이드 (ICED ONLY)', '미표기', 'ICE', 4400, 'branch_listing_reference', @hs_extra_source),
('HS005', '딸기 주스', '딸기 주스 (ICED ONLY)', '미표기', 'ICE', 4900, 'branch_listing_reference', @hs_extra_source),
('HS005', '바삭 순대 강정', '바삭 순대 강정', '미표기', '미표기', 6000, 'branch_listing_reference', @hs_extra_source),
('HS005', '쿠앤크 밀크쉐이크', '쿠앤크 밀크쉐이크', '미표기', '미표기', 6900, 'branch_listing_reference', @hs_extra_source),
('HS005', '더블치즈 미니 홀케이크', '더블치즈 미니 홀케이크', '미표기', '미표기', 7000, 'branch_listing_reference', @hs_extra_source),
('HS005', '레몬차', '레몬차', '미표기', '미표기', 3900, 'branch_listing_reference', @hs_extra_source),
('HS005', '말차 라떼', '말차 라떼', '미표기', '미표기', 4400, 'branch_listing_reference', @hs_extra_source);

-- HS006 공개 메뉴 · https://app.passorder.co.kr/normal/5ef7f494-52a0-4b04-93cd-221c79e4a2ee/menus
SET @hs_extra_source = 'https://app.passorder.co.kr/normal/5ef7f494-52a0-4b04-93cd-221c79e4a2ee/menus';
INSERT INTO hs_extra_prices VALUES
('HS006', '더블치즈베이글', '더블치즈베이글', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS006', '딥 미니버거 (1ea)', '딥 미니버거 (1ea)', '미표기', '미표기', 3200, 'branch_online_order', @hs_extra_source),
('HS006', '딥 미니버거 (2ea)', '딥 미니버거 (2ea)', '미표기', '미표기', 5900, 'branch_online_order', @hs_extra_source),
('HS006', '딥 플랫화이트', '딥 플랫화이트', '미표기', '미표기', 2500, 'branch_online_order', @hs_extra_source),
('HS006', '디카페인 딥 플랫화이트', '디카페인 딥 플랫화이트', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '수박리카노', '수박리카노', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS006', '디카페인 수박리카노', '디카페인 수박리카노', '미표기', '미표기', 5500, 'branch_online_order', @hs_extra_source),
('HS006', '연유 크리미슈페너', '연유 크리미슈페너', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '오렌지 크리미슈페너', '오렌지 크리미슈페너', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '피넛크림라떼 (에스프레소음료)', '피넛크림라떼 (에스프레소음료)', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS006', '커피 오렌망', '커피 오렌망(ICE)', '미표기', 'ICE', 3200, 'branch_online_order', @hs_extra_source),
('HS006', '꿀카페라떼', '꿀카페라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '헤이즐넛라떼', '헤이즐넛라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '피칸라떼', '피칸라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '연유큐브라떼', '연유큐브라떼 (ICE)', '미표기', 'ICE', 4100, 'branch_online_order', @hs_extra_source),
('HS006', '연유라떼', '연유라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '카라멜마끼아또', '카라멜마끼아또', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '바닐라라떼', '바닐라라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '레모니카노', '레모니카노', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '딥 헤이즐넛더블샷', '딥 헤이즐넛더블샷', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '딥 바닐라더블샷', '딥 바닐라더블샷', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '고구마카페라떼', '고구마카페라떼', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS006', '카푸치노', '카푸치노', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS006', '시나몬슈가카푸치노', '시나몬슈가카푸치노', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '콜드브루커피', '콜드브루커피', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS006', '라이트 바닐라라떼', '라이트 바닐라라떼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '라이트 바닐라크림콜드브루', '라이트 바닐라크림콜드브루', '미표기', '미표기', 4900, 'branch_online_order', @hs_extra_source),
('HS006', '콜드브루라떼', '콜드브루라떼', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS006', '바닐라크림 콜드브루라떼', '바닐라크림 콜드브루라떼 (ICE)', '미표기', 'ICE', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '리얼말차 콜드브루라떼', '리얼말차 콜드브루라떼 (ICE)', '미표기', 'ICE', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '리얼 블루베리라떼', '리얼 블루베리라떼 (ICE)', '미표기', 'ICE', 4000, 'branch_online_order', @hs_extra_source),
('HS006', '초코라떼', '초코라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '초코라떼 (1L)', '초코라떼 (1L)', '미표기', '미표기', 5000, 'branch_online_order', @hs_extra_source),
('HS006', '리얼초코라떼', '리얼초코라떼', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS006', '마시멜로우초코라떼', '마시멜로우초코라떼', '미표기', '미표기', 4200, 'branch_online_order', @hs_extra_source),
('HS006', '율무차', '율무차', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS006', '곡물라떼', '곡물라떼', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS006', '밀크티', '밀크티', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS006', '녹차라떼', '녹차라떼', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS006', '제로 복숭아아이스티', '제로 복숭아아이스티', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS006', '고구마라떼', '고구마라떼', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '토피넛라떼', '토피넛라떼', '미표기', '미표기', 3800, 'branch_online_order', @hs_extra_source),
('HS006', '얼그레이초코라떼', '얼그레이초코라떼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '민트초코라떼', '민트초코라떼', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '할미숫가루', '할미숫가루', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '할미숫가루 (1L)', '할미숫가루 (1L)', '미표기', '미표기', 5500, 'branch_online_order', @hs_extra_source),
('HS006', '웰니스 말차 요거트 스무디', '웰니스 말차 요거트 스무디', '미표기', '미표기', 5300, 'branch_online_order', @hs_extra_source),
('HS006', '웰니스 복숭아 요거 스무디볼', '웰니스 복숭아 요거 스무디볼', '미표기', '미표기', 5300, 'branch_online_order', @hs_extra_source),
('HS006', '웰니스 오트 트로피컬 스무디', '웰니스 오트 트로피컬 스무디', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '웰니스 시트러스 카카오 스무디', '웰니스 시트러스 카카오 스무디', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '딸기요거트스무디', '딸기요거트스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '망고요거트스무디', '망고요거트스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '스크류딸기스무디', '스크류딸기스무디', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '율무크림프라페', '율무크림프라페', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '오레오프라페', '오레오프라페', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '딸기오레오프라페', '딸기오레오프라페', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '자바칩프라페', '자바칩프라페', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '카라멜프라페', '카라멜프라페', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS006', '화이트초코프라페', '화이트초코프라페', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '딥 밀크쉐이크', '딥 밀크쉐이크', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS006', '리얼초코 밀크쉐이크', '리얼초코 밀크쉐이크', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '로열밀크티 밀크쉐이크', '로열밀크티 밀크쉐이크', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '레몬에이드', '레몬에이드', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '자몽에이드', '자몽에이드', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '청포도에이드', '청포도에이드', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '라임모히또', '라임모히또', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '체리콕', '체리콕', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS006', '리얼수박주스', '리얼수박주스', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS006', '리얼수박주스(1L)', '리얼수박주스(1L)', '미표기', '미표기', 7000, 'branch_online_order', @hs_extra_source),
('HS006', '수박 캐모마일 자몽 리프레쉬티', '수박 캐모마일 자몽 리프레쉬티', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '우지 말차 유자티', '우지 말차 유자티', '미표기', '미표기', 3900, 'branch_online_order', @hs_extra_source),
('HS006', '자몽 허니 블랙티', '자몽 허니 블랙티', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS006', '리얼홍시주스', '리얼홍시주스', '미표기', '미표기', 4500, 'branch_online_order', @hs_extra_source),
('HS006', '망고 오렌망', '망고 오렌망(ICE)', '미표기', 'ICE', 3700, 'branch_online_order', @hs_extra_source),
('HS006', '복숭아아이스티', '복숭아아이스티', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS006', '복숭아아이스티(1L)', '복숭아아이스티(1L)', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS006', '석류아이스티', '석류아이스티', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS006', '석류아이스티 (1L)', '석류아이스티 (1L)', '미표기', '미표기', 4000, 'branch_online_order', @hs_extra_source),
('HS006', '애플히비스커스', '애플히비스커스', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '모히또레몬홍차', '모히또레몬홍차', '미표기', '미표기', 3700, 'branch_online_order', @hs_extra_source),
('HS006', '레몬생강차', '레몬생강차', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '얼그레이레몬차', '얼그레이레몬차', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '유자차', '유자차', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS006', '청귤차', '청귤차', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS006', '생강차', '생강차', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS006', '자몽차', '자몽차', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS006', '레몬차', '레몬차', '미표기', '미표기', 3300, 'branch_online_order', @hs_extra_source),
('HS006', '히비스커스', '히비스커스', '미표기', '미표기', 2800, 'branch_online_order', @hs_extra_source),
('HS006', '캐모마일', '캐모마일', '미표기', '미표기', 2800, 'branch_online_order', @hs_extra_source),
('HS006', '페퍼민트', '페퍼민트', '미표기', '미표기', 2800, 'branch_online_order', @hs_extra_source),
('HS006', '얼그레이', '얼그레이', '미표기', '미표기', 2800, 'branch_online_order', @hs_extra_source),
('HS006', '허니 그래놀라 아이스크림', '허니 그래놀라 아이스크림', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '츄러스 아이스크림', '츄러스 아이스크림', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '솔티 카라멜 아이스크림', '솔티 카라멜 아이스크림', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '티라미수 아이스크림', '티라미수 아이스크림', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '블루베리 아이스크림', '블루베리 아이스크림', '미표기', '미표기', 3000, 'branch_online_order', @hs_extra_source),
('HS006', '소프트 아이스크림', '소프트 아이스크림', '미표기', '미표기', 1500, 'branch_online_order', @hs_extra_source),
('HS006', '화이트롤슈', '화이트롤슈', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS006', '클래식 프렌치 토스트', '클래식 프렌치 토스트', '미표기', '미표기', 4300, 'branch_online_order', @hs_extra_source),
('HS006', '에그듬뿍모닝빵(1ea)', '에그듬뿍모닝빵(1ea)', '미표기', '미표기', 2500, 'branch_online_order', @hs_extra_source),
('HS006', '에그듬뿍모닝빵(2ea)', '에그듬뿍모닝빵(2ea)', '미표기', '미표기', 4800, 'branch_online_order', @hs_extra_source),
('HS006', '슈프림 오트밀 크랜베리 쿠키', '슈프림 오트밀 크랜베리 쿠키', '미표기', '미표기', 1800, 'branch_online_order', @hs_extra_source),
('HS006', '슈프림 피스타치오 아몬드 쿠키', '슈프림 피스타치오 아몬드 쿠키', '미표기', '미표기', 1800, 'branch_online_order', @hs_extra_source),
('HS006', '소금빵', '소금빵', '미표기', '미표기', 3200, 'branch_online_order', @hs_extra_source),
('HS006', '바삭츄러스호두과자', '바삭츄러스호두과자', '미표기', '미표기', 2500, 'branch_online_order', @hs_extra_source),
('HS006', '츄러스', '츄러스', '미표기', '미표기', 2000, 'branch_online_order', @hs_extra_source),
('HS006', '츄러스아이스크림', '츄러스아이스크림', '미표기', '미표기', 3500, 'branch_online_order', @hs_extra_source);

-- HS007 공개 메뉴 · https://www.diningcode.com/profile.php?rid=COpT1bxJzQ7n
SET @hs_extra_source = 'https://www.diningcode.com/profile.php?rid=COpT1bxJzQ7n';
INSERT INTO hs_extra_prices VALUES
('HS007', '아이스티샷추가(아샷추)', '아이스티샷추가(아샷추)', '미표기', '미표기', 3900, 'branch_listing_reference', @hs_extra_source),
('HS007', '아이스티 망고추가(아망추)', '아이스티 망고추가(아망추)w노란빨대', '미표기', '미표기', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '제로슈거 매실티', '제로슈거 매실티(ICED)', '미표기', 'ICE', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '율무라떼', '율무라떼(HOT)', '미표기', 'HOT', 3800, 'branch_listing_reference', @hs_extra_source),
('HS007', '율무라떼', '율무라떼(ICED)w노란빨대', '미표기', 'ICE', 3800, 'branch_listing_reference', @hs_extra_source),
('HS007', '쌍화라떼', '쌍화라떼(HOT)', '미표기', 'HOT', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '쌍화라떼', '쌍화라떼(ICED)', '미표기', 'ICE', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '대추라떼', '대추라떼(HOT)', '미표기', 'HOT', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '대추라떼', '대추라떼(ICED)', '미표기', 'ICE', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '딸기바나나빽스치노(베이직)', '딸기바나나빽스치노(베이직)w노란빨대', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '초코바나나빽스치노(베이직)', '초코바나나빽스치노(베이직)w노란빨대', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '자두스무디', '자두스무디w노란빨대', '미표기', '미표기', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '말차빽스치노(베이직)', '말차빽스치노(베이직)w노란빨대', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '원조빽스치노(베이직)', '원조빽스치노(베이직)w노란빨대', '미표기', '미표기', 3800, 'branch_listing_reference', @hs_extra_source),
('HS007', '피스타치오빽스치노(베이직)', '피스타치오빽스치노(베이직)w노란빨대', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '골든자바칩 스무디', '골든자바칩 스무디w노란빨대', '미표기', '미표기', 5300, 'branch_listing_reference', @hs_extra_source),
('HS007', '프로틴쉐이크 초코', '프로틴쉐이크 초코w노란빨대', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '프로틴쉐이크 바나나', '프로틴쉐이크 바나나w노란빨대', '미표기', '미표기', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '퐁당치노(바닐라)', '퐁당치노(바닐라)w노란빨대', '미표기', '미표기', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '퐁당치노(원조커피)', '퐁당치노(원조커피)w노란빨대', '미표기', '미표기', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '퐁당치노(미숫가루)', '퐁당치노(미숫가루)w노란빨대', '미표기', '미표기', 4700, 'branch_listing_reference', @hs_extra_source),
('HS007', '망고스무디', '망고스무디w노란빨대', '미표기', '미표기', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '플레인요거트스무디', '플레인요거트스무디w노란빨대', '미표기', '미표기', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '딸기요거트스무디', '딸기요거트스무디w노란빨대', '미표기', '미표기', 4800, 'branch_listing_reference', @hs_extra_source),
('HS007', '블루베리요거트스무디', '블루베리요거트스무디w노란빨대', '미표기', '미표기', 5800, 'branch_listing_reference', @hs_extra_source),
('HS007', '코코넛카페라떼', '코코넛카페라떼(HOT)', '미표기', 'HOT', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '밀크쉐이크', '밀크쉐이크w노란빨대', '미표기', '미표기', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '바나나밀크쉐이크', '바나나밀크쉐이크w노란빨대', '미표기', '미표기', 4800, 'branch_listing_reference', @hs_extra_source),
('HS007', '바나나커피쉐이크', '바나나커피쉐이크w노란빨대', '미표기', '미표기', 5400, 'branch_listing_reference', @hs_extra_source),
('HS007', '복숭아아이스티', '복숭아아이스티(ICED)', '미표기', 'ICE', 3300, 'branch_listing_reference', @hs_extra_source),
('HS007', '깔라만시티', '깔라만시티(HOT)', '미표기', 'HOT', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '깔라만시티', '깔라만시티(ICED)', '미표기', 'ICE', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '레몬티', '레몬티(HOT)', '미표기', 'HOT', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '레몬티', '레몬티(ICED)', '미표기', 'ICE', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '자몽티', '자몽티(HOT)', '미표기', 'HOT', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '자몽티', '자몽티(ICED)', '미표기', 'ICE', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '바닐라라떼', '바닐라라떼(ICED)', '미표기', 'ICE', 4200, 'branch_listing_reference', @hs_extra_source),
('HS007', '코코넛카페라떼', '코코넛카페라떼(ICED)', '미표기', 'ICE', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '유자티', '유자티(HOT)', '미표기', 'HOT', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '유자티', '유자티(ICED)', '미표기', 'ICE', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '피치우롱스위티', '피치우롱스위티(HOT)', '미표기', 'HOT', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '피치우롱스위티', '피치우롱스위티(ICED)', '미표기', 'ICE', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '우롱티', '우롱티(HOT)', '미표기', 'HOT', 2500, 'branch_listing_reference', @hs_extra_source),
('HS007', '우롱티', '우롱티(ICED)', '미표기', 'ICE', 2500, 'branch_listing_reference', @hs_extra_source),
('HS007', '페퍼민트티', '페퍼민트티(HOT)', '미표기', 'HOT', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '페퍼민트티', '페퍼민트티(ICED)', '미표기', 'ICE', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '황금캐모마일티', '황금캐모마일티(HOT)', '미표기', 'HOT', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '황금캐모마일티', '황금캐모마일티(ICED)', '미표기', 'ICE', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '민트초코라떼', '민트초코라떼(HOT)', '미표기', 'HOT', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '생강차', '생강차(HOT)', '미표기', 'HOT', 3800, 'branch_listing_reference', @hs_extra_source),
('HS007', '생강차', '생강차(ICED)', '미표기', 'ICE', 3800, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽사이즈 바닐라라떼', '빽사이즈 바닐라라떼(ICED)', '미표기', 'ICE', 7000, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽사이즈 원조커피', '빽사이즈 원조커피(ICED)', '미표기', 'ICE', 4000, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽사이즈 복숭아아이스티', '빽사이즈 복숭아아이스티(ICED)', '미표기', 'ICE', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽사이즈 아이스티샷추가', '빽사이즈 아이스티샷추가(ICED)', '미표기', 'ICE', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽사이즈 아이스티 망고추가', '빽사이즈 아이스티 망고추가w노란빨대', '미표기', '미표기', 6300, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽사이즈 미숫가루(우유)', '빽사이즈 미숫가루(우유)', '미표기', '미표기', 5500, 'branch_listing_reference', @hs_extra_source),
('HS007', '잼있는 사라다빵', '잼있는 사라다빵', '미표기', '미표기', 5100, 'branch_listing_reference', @hs_extra_source),
('HS007', '빽그램핫도그', '빽그램핫도그', '미표기', '미표기', 5300, 'branch_listing_reference', @hs_extra_source),
('HS007', '초코홀릭 바움쿠헨', '초코홀릭 바움쿠헨', '미표기', '미표기', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '치즈홀릭 바움쿠헨', '치즈홀릭 바움쿠헨', '미표기', '미표기', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '커스터드홀릭 바움쿠헨', '커스터드홀릭 바움쿠헨', '미표기', '미표기', 3500, 'branch_listing_reference', @hs_extra_source),
('HS007', '민트초코빽스치노(베이직)', '민트초코빽스치노(베이직)w노란빨대', '미표기', '미표기', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '초코츄러스 쫀득볼(3ea)', '초코츄러스 쫀득볼(3ea)', '미표기', '미표기', 3800, 'branch_listing_reference', @hs_extra_source),
('HS007', '콘쫀득볼(치즈와 앙금/2ea)', '콘쫀득볼(치즈와 앙금/2ea)', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '긴페스츄리와플', '긴페스츄리와플', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '햄치즈샌드위치', '햄치즈샌드위치', '미표기', '미표기', 4300, 'branch_listing_reference', @hs_extra_source),
('HS007', '크랜베리 쿠키', '크랜베리 쿠키', '미표기', '미표기', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '[MD]캐치티니핑 밀크', '[MD]캐치티니핑 밀크', '미표기', '미표기', 2500, 'branch_listing_reference', @hs_extra_source),
('HS007', '[MD] 캐치티니핑 딸기', '[MD] 캐치티니핑 딸기', '미표기', '미표기', 2500, 'branch_listing_reference', @hs_extra_source),
('HS007', '[MD] 캐치티니핑 사과', '[MD] 캐치티니핑 사과', '미표기', '미표기', 2500, 'branch_listing_reference', @hs_extra_source),
('HS007', '원조커피크림 라떼', '원조커피크림 라떼(ICED)', '미표기', 'ICE', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '원조커피크림 미숫가루', '원조커피크림 미숫가루(ICED)', '미표기', 'ICE', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '바닐라빽스치노(베이직)', '바닐라빽스치노(베이직)w노란빨대', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '바닐라커피빽스치노(베이직)', '바닐라커피빽스치노(베이직)w노란빨대', '미표기', '미표기', 5300, 'branch_listing_reference', @hs_extra_source),
('HS007', '사라다빵', '사라다빵', '미표기', '미표기', 4500, 'branch_listing_reference', @hs_extra_source),
('HS007', '아이스티 샷.망고추가(아샷망추)', '아이스티 샷.망고추가(아샷망추)w노란빨대', '미표기', '미표기', 4900, 'branch_listing_reference', @hs_extra_source),
('HS007', '원조커피', '원조커피(HOT)', '미표기', 'HOT', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '원조커피', '원조커피(ICED)', '미표기', 'ICE', 3000, 'branch_listing_reference', @hs_extra_source),
('HS007', '골드키위주스', '골드키위주스', '미표기', '미표기', 5300, 'branch_listing_reference', @hs_extra_source),
('HS007', '콜드브루 흑당라떼', '콜드브루 흑당라떼(HOT)', '미표기', 'HOT', 6000, 'branch_listing_reference', @hs_extra_source),
('HS007', '저당사과젤리 매실티', '저당사과젤리 매실티(ICED)w노란빨대', '미표기', 'ICE', 5000, 'branch_listing_reference', @hs_extra_source),
('HS007', '콜드브루 흑당라떼', '콜드브루 흑당라떼(ICED)', '미표기', 'ICE', 6000, 'branch_listing_reference', @hs_extra_source),
('HS007', '콜드브루 연유라떼', '콜드브루 연유라떼(HOT)', '미표기', 'HOT', 6000, 'branch_listing_reference', @hs_extra_source),
('HS007', '콜드브루 연유라떼', '콜드브루 연유라떼(ICED)', '미표기', 'ICE', 6000, 'branch_listing_reference', @hs_extra_source);

-- HS008 공개 메뉴 · https://app.passorder.co.kr/normal/31341cf4-38d6-4a7d-ab35-1c21046ada56
SET @hs_extra_source = 'https://app.passorder.co.kr/normal/31341cf4-38d6-4a7d-ab35-1c21046ada56';
INSERT INTO hs_extra_prices VALUES
('HS008', '추억의수박화채마빙', '추억의수박화채마빙(미디엄)', 'Medium', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS008', '추억의수박화채마빙', '추억의수박화채마빙(라지)', 'Large', '미표기', 4400, 'branch_online_order', @hs_extra_source),
('HS008', '옛날단팥딸기마빙', '옛날단팥딸기마빙(미디엄)', 'Medium', '미표기', 3500, 'branch_online_order', @hs_extra_source),
('HS008', '수박파인스무디', '수박파인스무디', '미표기', '미표기', 2800, 'branch_online_order', @hs_extra_source);

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
