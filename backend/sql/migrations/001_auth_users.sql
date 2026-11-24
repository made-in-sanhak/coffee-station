-- 001: 회원·refresh 토큰 테이블 추가 (카카오 로그인 → 서비스 JWT)
-- 대상: 이미 schema.sql 을 적용한 coffee_station DB. 신규 DB는 schema.sql 에 포함되어 있어 실행하지 않아도 됩니다.
-- 선행 조건: 없음. 기존 테이블·데이터를 바꾸지 않고 새 테이블만 만듭니다. (IF NOT EXISTS 라 다시 실행해도 안전)
-- 검증: SHOW TABLES LIKE 'users'; SHOW TABLES LIKE 'refresh_tokens';
SET NAMES utf8mb4;

-- 회원·로그인 (카카오 로그인 후 서비스 JWT 발급)
CREATE TABLE IF NOT EXISTS users (
	`user_id`	BIGINT	NOT NULL AUTO_INCREMENT	COMMENT '회원ID',
	`kakao_id`	VARCHAR(32)	NOT NULL	COMMENT '카카오회원번호',
	`nickname`	VARCHAR(100)	NOT NULL	COMMENT '닉네임',
	`profile_image_url`	VARCHAR(500)	NULL	COMMENT '프로필사진URL',
	`role`	VARCHAR(10)	NOT NULL	DEFAULT 'USER'	COMMENT '권한(USER/OWNER/ADMIN)',
	`last_login_at`	DATETIME	NULL	COMMENT '마지막로그인일시',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '가입일시',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_users_kakao_id (kakao_id)
) ENGINE=InnoDB;

-- refresh 토큰은 원문이 아니라 SHA-256 해시만 저장합니다.
CREATE TABLE IF NOT EXISTS refresh_tokens (
	`token_id`	BIGINT	NOT NULL AUTO_INCREMENT	COMMENT '토큰ID',
	`user_id`	BIGINT	NOT NULL	COMMENT '회원ID',
	`token_hash`	CHAR(64)	NOT NULL	COMMENT '토큰해시(SHA-256 hex)',
	`expires_at`	DATETIME	NOT NULL	COMMENT '만료일시',
	`revoked_at`	DATETIME	NULL	COMMENT '폐기일시(로그아웃·재발급)',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '발급일시',
  PRIMARY KEY (token_id),
  UNIQUE KEY uk_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user (user_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;
