-- Local review fixtures. Run after schema.sql in the selected local database.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS generated_reviews (
  id VARCHAR(64) PRIMARY KEY,
  cafe_id BIGINT NOT NULL,
  menu_id BIGINT NOT NULL,
  slot TINYINT UNSIGNED NOT NULL,
  author_nickname VARCHAR(50) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  content VARCHAR(500) NOT NULL,
  is_generated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY cafe_slot (cafe_id, slot),
  CHECK (slot BETWEEN 1 AND 5),
  CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;
