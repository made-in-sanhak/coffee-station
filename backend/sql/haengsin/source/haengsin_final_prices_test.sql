SET NAMES utf8mb4;
DROP TEMPORARY TABLE IF EXISTS tmp_haengsin_final_prices;
CREATE TEMPORARY TABLE tmp_haengsin_final_prices (store_code VARCHAR(16), menu_name VARCHAR(60), product_name VARCHAR(100), size_label VARCHAR(40), temperature ENUM('HOT','ICE') NULL, price_won INT UNSIGNED NULL, price_basis VARCHAR(80), source_url VARCHAR(1024)) DEFAULT CHARSET=utf8mb4;
INSERT INTO tmp_haengsin_final_prices VALUES
('HS001', '아메리카노', '아메리카노', 'Regular', 'HOT', 4500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '아메리카노', '아메리카노', 'Regular', 'ICE', 4500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '아메리카노', '아메리카노', 'Large', 'HOT', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '아메리카노', '아메리카노', 'Large', 'ICE', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Regular', 'HOT', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Regular', 'ICE', 5000, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Large', 'HOT', 5500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS001', '카페라떼', '카페라떼', 'Large', 'ICE', 5500, 'historical_branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1990456677/menu'),
('HS002', '아메리카노', '카페 아메리카노', 'Short', 'HOT', 4700, 'unverified', NULL),
('HS002', '아메리카노', '카페 아메리카노', 'Tall', 'HOT', 4700, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Tall', 'ICE', 4700, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Grande', 'HOT', 5300, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Grande', 'ICE', 5300, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Venti', 'HOT', 6100, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '아메리카노', '카페 아메리카노', 'Venti', 'ICE', 6100, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Short', 'HOT', 5200, 'unverified', NULL),
('HS002', '카페라떼', '카페 라떼', 'Tall', 'HOT', 5200, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Tall', 'ICE', 5200, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Grande', 'HOT', 5800, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Grande', 'ICE', 5800, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Venti', 'HOT', 6600, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS002', '카페라떼', '카페 라떼', 'Venti', 'ICE', 6600, 'third_party_brand_price', 'https://life.gumbols.com/%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4-%EC%BB%A4%ED%94%BC-%EC%82%AC%EC%9D%B4%EC%A6%88-%EC%A2%85%EB%A5%98-%EB%B0%8F-%EA%B0%80%EA%B2%A9-2026-%EC%B5%9C%EC%8B%A0%EC%A0%95%EB%B3%B4/'),
('HS003', '아메리카노', '아메리카노', '기본', 'HOT', 1700, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '아메리카노', '아메리카노', '기본', 'ICE', 2000, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '카페라떼', '카페라떼', '기본', 'HOT', 2900, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '카페라떼', '카페라떼', '기본', 'ICE', 2900, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '아메리카노', '메가리카노', '왕메가', 'ICE', 3300, 'branch_menu_listing', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS003', '카페라떼', '왕메가카페라떼', '왕메가', 'ICE', 4400, 'branch_menu_photo', 'https://pcmap.place.naver.com/restaurant/1949487820/menu'),
('HS004', '아메리카노', '아메리카노', '기본', 'HOT', 1500, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '아메리카노', '아메리카노', '기본', 'ICE', 1800, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '카페라떼', '카페라떼', '기본', 'HOT', 2900, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '카페라떼', '카페라떼', '기본', 'ICE', 2900, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '아메리카노', '빅포즈 아메리카노', '빅포즈', 'ICE', 3000, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS004', '카페라떼', '빅포즈 카페라떼', '빅포즈', 'ICE', 4500, 'naver_branch_delivery_menu', 'https://pcmap.place.naver.com/restaurant/1123775615/menu'),
('HS005', '아메리카노', '아메리카노', '기본', 'HOT', 1900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '아메리카노', '아메리카노', '기본', 'ICE', 1900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '카페라떼', '카페라떼', '기본', 'HOT', 3900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '카페라떼', '카페라떼', '기본', 'ICE', 3900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '아메리카노', '백억카노 1L', '1리터', 'ICE', 2900, 'branch_pickup_listing', 'https://app.passorder.co.kr/normal/de0bbc70-3bef-476a-8dd1-8bbdbee16e6d'),
('HS005', '카페라떼', '1L 카페라떼', '1리터', 'ICE', 4900, 'branch_third_party_listing', 'https://www.diningcode.com/profile.php?rid=bUa3RpQmWIWd'),
('HS006', '아메리카노', '아메리카노', '기본', 'HOT', 1800, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '아메리카노', '아메리카노', '기본', 'ICE', 2000, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '카페라떼', '카페라떼', '기본', 'HOT', 3300, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '카페라떼', '카페라떼', '기본', 'ICE', 3300, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS006', '아메리카노', '아메리터 1L', '아메리터 1L', 'ICE', 3300, 'naver_branch_menu_bottle_excluded', 'https://pcmap.place.naver.com/restaurant/1697944324/menu'),
('HS007', '아메리카노', '아메리카노', '기본', 'HOT', 1700, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '아메리카노', '아메리카노', '기본', 'ICE', 2000, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '카페라떼', '카페라떼', '기본', 'HOT', 3200, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '카페라떼', '카페라떼', '기본', 'ICE', 3200, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '아메리카노', '빽사이즈 아메리카노', '빽사이즈', 'ICE', 3300, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS007', '카페라떼', '빽사이즈 카페라떼', '빽사이즈', 'ICE', 4800, 'branch_online_order', 'https://pcmap.place.naver.com/restaurant/1245924405/menu'),
('HS008', '아메리카노', '아메리카노', 'Large', 'HOT', 1500, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '아메리카노', '아메리카노', 'Large', 'ICE', 2000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '아메리카노', '아메리카노', 'Jumbo', 'ICE', 3000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '카페라떼', '카페라떼', 'Large', 'HOT', 3000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '카페라떼', '카페라떼', 'Large', 'ICE', 3000, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu'),
('HS008', '카페라떼', '카페라떼', 'Jumbo', 'ICE', 4500, 'naver_branch_menu', 'https://pcmap.place.naver.com/restaurant/2069347744/menu');

SELECT '투썸플레이스 행신역점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS001' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '스타벅스 행신역점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS002' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '메가MGC커피 행신역점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS003' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '컴포즈커피 고양행신점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS004' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '백억커피 행신점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS005' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '우지커피 행신역점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS006' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '빽다방 행신역점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS007' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;

SELECT '더벤티 행신역점' AS 매장;
SELECT menu_name AS 메뉴, product_name AS 상품명, size_label AS 사이즈, COALESCE(temperature, '미표기') AS 온도, price_won AS 최종가격_원 FROM tmp_haengsin_final_prices WHERE store_code = 'HS008' ORDER BY menu_name, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large') = 0, FIELD(size_label, '기본', 'Short', 'Tall', 'Grande', 'Venti', 'Regular', 'Large'), size_label, temperature;
