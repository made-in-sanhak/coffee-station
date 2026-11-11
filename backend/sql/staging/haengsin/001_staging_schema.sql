-- Manual staging only. Not an application schema or automatic init script.
-- Select the intended database before execution. Do not use --force.
-- Source values are preserved; no verification dates or coordinates are invented.
SET NAMES utf8mb4;
CREATE TABLE import_haengsin_stores (
    store_code VARCHAR(16) PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    cafe_id BIGINT NULL,
    address VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE import_haengsin_prices (
    import_row_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    store_code VARCHAR(16) NOT NULL,
    menu_name VARCHAR(60) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    size_label VARCHAR(40) NOT NULL,
    temperature ENUM('HOT','ICE') NULL,
    price_won INT UNSIGNED NULL,
    price_basis VARCHAR(80),
    source_url VARCHAR(1024),
    verified_at DATE NULL,
    KEY idx_import_store (store_code),
    CONSTRAINT fk_import_haengsin_store FOREIGN KEY (store_code)
        REFERENCES import_haengsin_stores(store_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
