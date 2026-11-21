USE shsrs;

SET @has_phone = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'
);
SET @migration_sql = IF(@has_phone = 0, 'ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_finance = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_finance'
);
SET @migration_sql = IF(@has_finance = 0, 'ALTER TABLE users ADD COLUMN is_finance TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_reservation_status = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'status'
);
SET @migration_sql = IF(@has_reservation_status = 0, 'ALTER TABLE reservations ADD COLUMN status ENUM(''Pending'',''Confirmed'') NOT NULL DEFAULT ''Pending''', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id        INT NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  method         VARCHAR(100) NULL,
  receipt        MEDIUMTEXT NOT NULL,
  status         ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending',
  submitted_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at   TIMESTAMP NULL DEFAULT NULL,
  processed_by   INT NULL,
  KEY ix_payment_status_submitted (status, submitted_at),
  KEY ix_payment_reservation (reservation_id),
  CONSTRAINT fk_payment_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
