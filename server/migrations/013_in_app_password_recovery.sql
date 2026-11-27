USE shsrs;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  status ENUM('Pending','Approved','Rejected','Completed','Expired') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  approved_by INT NULL,
  approved_at DATETIME NULL,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY ix_password_reset_status_expiry (status, expires_at),
  KEY ix_password_reset_user_status (user_id, status),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_password_reset_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
