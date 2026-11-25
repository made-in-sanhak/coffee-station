CREATE TABLE IF NOT EXISTS recommendation_quota_users (
  user_id VARBINARY(800) PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recommendation_quota_attempts (
  user_id VARBINARY(800) NOT NULL,
  lease_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  attempted_at_ms BIGINT UNSIGNED NOT NULL,
  expires_at_ms BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, lease_id),
  INDEX (user_id, attempted_at_ms),
  FOREIGN KEY (user_id) REFERENCES recommendation_quota_users (user_id)
) ENGINE=InnoDB;
