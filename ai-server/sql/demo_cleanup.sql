-- Deletes only this fixture in the isolated demo DB. No DROP/TRUNCATE.
USE coffee_station_agent_demo;
START TRANSACTION;
DELETE FROM menu_prices WHERE cafe_id=990001 AND source='DEMO'
 AND price_id IN (992001,992002,992003,992004,992005,992006)
 AND menu_id IN (991001,991002,991003,991004,991005,991006);
DELETE m FROM menus m LEFT JOIN menu_prices p ON p.menu_id=m.menu_id
 WHERE m.menu_id IN (991001,991002,991003,991004,991005,991006)
 AND m.standard_name LIKE '[AGENT DEMO] %' AND p.price_id IS NULL;
DELETE c FROM cafes c LEFT JOIN menu_prices p ON p.cafe_id=c.cafe_id
 WHERE c.cafe_id=990001 AND c.name='[AGENT DEMO] 가상 카페' AND p.price_id IS NULL;
COMMIT;
