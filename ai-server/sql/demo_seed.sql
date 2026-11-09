-- Run ONLY after demo_schema.sql. Plain INSERT: collisions fail, never overwrite.
USE coffee_station_agent_demo;
START TRANSACTION;
INSERT INTO cafes (cafe_id,name,address,latitude,longitude) VALUES
(990001,'[AGENT DEMO] 가상 카페','실재하지 않는 테스트 주소',37.6300000,126.8300000);
INSERT INTO menus (menu_id,standard_name,category) VALUES
(991001,'[AGENT DEMO] 아메리카노','COFFEE'),
(991002,'[AGENT DEMO] 카페라떼','LATTE'),
(991003,'[AGENT DEMO] 바닐라라떼','LATTE'),
(991004,'[AGENT DEMO] 에스프레소','COFFEE'),
(991005,'[AGENT DEMO] 디카페인 커피','COFFEE'),
(991006,'[AGENT DEMO] 홍차','TEA');
INSERT INTO menu_prices (price_id,cafe_id,menu_id,size,option_name,price,source,verified_at) VALUES
(992001,990001,991001,'REGULAR','',3500,'DEMO','2026-11-08'),
(992002,990001,991002,'REGULAR','',4500,'DEMO','2026-11-08'),
(992003,990001,991003,'REGULAR','',5000,'DEMO','2026-11-08'),
(992004,990001,991004,'REGULAR','',3000,'DEMO','2026-11-08'),
(992005,990001,991005,'REGULAR','',4000,'DEMO','2026-11-08'),
(992006,990001,991006,'REGULAR','',3800,'DEMO','2026-11-08');
COMMIT;
