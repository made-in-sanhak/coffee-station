-- Select the application's database first. Additive / repeatable MySQL 8 migration.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS community_accounts (
 user_id BIGINT PRIMARY KEY, nickname VARCHAR(50) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_reviews (
 id VARCHAR(64) PRIMARY KEY, cafe_id BIGINT NOT NULL, author_id BIGINT NULL,
 author_nickname VARCHAR(50) NOT NULL, rating TINYINT UNSIGNED NOT NULL,
 content VARCHAR(2000) NOT NULL, category VARCHAR(30) NOT NULL DEFAULT '리뷰',
 source VARCHAR(20) NOT NULL DEFAULT 'USER', created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX review_cafe(cafe_id,created_at), INDEX review_author(author_id,created_at),
 FOREIGN KEY(cafe_id) REFERENCES cafes(cafe_id), FOREIGN KEY(author_id) REFERENCES community_accounts(user_id),
 CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_review_likes (
 review_id VARCHAR(64) NOT NULL, user_id BIGINT NOT NULL,
 PRIMARY KEY(review_id,user_id), FOREIGN KEY(review_id) REFERENCES community_reviews(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES community_accounts(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_review_comments (
 id CHAR(36) PRIMARY KEY, review_id VARCHAR(64) NOT NULL, author_id BIGINT NOT NULL,
 content VARCHAR(1000) NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX comment_review(review_id,created_at),
 FOREIGN KEY(review_id) REFERENCES community_reviews(id) ON DELETE CASCADE,
 FOREIGN KEY(author_id) REFERENCES community_accounts(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_review_images (
 id CHAR(36) PRIMARY KEY, review_id VARCHAR(64) NOT NULL, position TINYINT NOT NULL,
 mime_type VARCHAR(20) NOT NULL, image_data MEDIUMBLOB NOT NULL,
 UNIQUE KEY image_position(review_id,position), FOREIGN KEY(review_id) REFERENCES community_reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cafe_price_requests (
 id CHAR(36) PRIMARY KEY, cafe_id BIGINT NOT NULL, price_id BIGINT NOT NULL, author_id BIGINT NOT NULL,
 reported_price INT NOT NULL, note VARCHAR(1000) NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX request_cafe(cafe_id,status), FOREIGN KEY(cafe_id) REFERENCES cafes(cafe_id),
 FOREIGN KEY(price_id) REFERENCES menu_prices(price_id), FOREIGN KEY(author_id) REFERENCES community_accounts(user_id),
 CHECK (reported_price BETWEEN 1 AND 1000000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cafe_interactions (
 interaction_key VARCHAR(64) PRIMARY KEY, cafe_id BIGINT NOT NULL,
 interaction_type VARCHAR(20) NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX interaction_cafe(cafe_id,created_at), FOREIGN KEY(cafe_id) REFERENCES cafes(cafe_id),
 CHECK (interaction_type IN ('DETAIL_VIEW','DIRECTIONS'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
