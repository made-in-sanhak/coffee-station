-- Disposable test DB ONLY; schema.sql and 002 must be applied first.
INSERT INTO cafes(cafe_id,name,address,latitude,longitude) VALUES(1,'카페A','주소A',37.615,126.835),(2,'카페B','주소B',37.616,126.835),(3,'멀리있는카페','주소C',38,127);
INSERT INTO menus(menu_id,standard_name,category) VALUES(1,'아메리카노','COFFEE');
INSERT INTO menu_prices(price_id,cafe_id,menu_id,size,option_name,price,source,verified_at) VALUES(1,1,1,'Regular','ICE',2000,'DEMO',CURRENT_DATE()),(2,2,1,'Regular','ICE',3000,'OWNER',CURRENT_DATE()),(3,1,1,'Regular','ICE',2500,'DEMO',CURRENT_DATE()),(4,3,1,'Regular','ICE',1000,'DEMO',CURRENT_DATE());
INSERT INTO community_accounts(user_id,nickname) VALUES(1,'테스트사용자'),(2,'다른사용자');
