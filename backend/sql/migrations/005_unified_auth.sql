-- Run through scripts/apply-community.cjs (SQL plus identity mapping). Stop the API first.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS app_migrations (
 id VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS legacy_community_user_map (
 legacy_id BIGINT PRIMARY KEY, user_id BIGINT NOT NULL, INDEX mapped_user(user_id),
 FOREIGN KEY(user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS auth_login_flows (
 flow_hash CHAR(64) PRIMARY KEY, state_hash CHAR(64) NOT NULL, redirect_uri VARCHAR(2048) NOT NULL,
 expires_at TIMESTAMP(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
