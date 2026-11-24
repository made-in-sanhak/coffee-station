SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS auth_users (
 user_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, kakao_id VARCHAR(30) NOT NULL UNIQUE,
 profile_image_url VARCHAR(2048) NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Allocate above any earlier community-only accounts. Never overwrite their identities.
SET @next_auth_id=(SELECT COALESCE(MAX(user_id),0)+1 FROM community_accounts);
SET @auth_ddl=CONCAT('ALTER TABLE auth_users AUTO_INCREMENT=',@next_auth_id);
PREPARE auth_ddl_stmt FROM @auth_ddl;
EXECUTE auth_ddl_stmt;
DEALLOCATE PREPARE auth_ddl_stmt;
CREATE TABLE IF NOT EXISTS auth_sessions (
 id CHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL, refresh_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMP(3) NOT NULL, revoked_at TIMESTAMP(3) NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX session_user(user_id), FOREIGN KEY(user_id) REFERENCES community_accounts(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS auth_login_flows (
 flow_hash CHAR(64) PRIMARY KEY, state_hash CHAR(64) NOT NULL, redirect_uri VARCHAR(2048) NOT NULL,
 expires_at TIMESTAMP(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
