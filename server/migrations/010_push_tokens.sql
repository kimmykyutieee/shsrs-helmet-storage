USE shsrs;

CREATE TABLE IF NOT EXISTS push_tokens (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  platform     ENUM('expo','web') NOT NULL,
  token        TEXT NOT NULL,
  token_hash   CHAR(64) NOT NULL,
  device_label VARCHAR(200) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_push_token_hash (token_hash),
  KEY ix_push_tokens_user (user_id),
  CONSTRAINT fk_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
