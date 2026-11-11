-- Read-only checks, no changes to application tables.
SELECT store_code, COUNT(*) AS option_count FROM import_haengsin_prices GROUP BY store_code;
SELECT price_basis, COUNT(*) AS row_count FROM import_haengsin_prices GROUP BY price_basis;
SELECT * FROM import_haengsin_prices WHERE price_won IS NULL OR source_url IS NULL OR price_basis='unverified';
SELECT * FROM import_haengsin_stores WHERE cafe_id IS NULL OR latitude IS NULL OR longitude IS NULL;
SELECT s.store_name, p.* FROM import_haengsin_prices p
JOIN import_haengsin_stores s ON s.store_code=p.store_code
ORDER BY s.store_code, p.menu_name, p.price_won, p.import_row_id;
