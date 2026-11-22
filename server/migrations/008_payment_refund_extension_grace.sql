USE shsrs;

ALTER TABLE reservations
  MODIFY COLUMN status ENUM('Pending','Confirmed','Active','Expired','Cancelled','Used','Pending Refund Verification') NOT NULL DEFAULT 'Pending';

ALTER TABLE payments
  ADD COLUMN payment_type ENUM('Original','Extension') NOT NULL DEFAULT 'Original' AFTER status,
  ADD COLUMN extension_id INT NULL AFTER payment_type,
  ADD INDEX ix_payment_type_status (payment_type,status),
  ADD INDEX ix_payment_extension (extension_id);

CREATE TABLE IF NOT EXISTS reservation_extensions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id INT NOT NULL,
  additional_minutes SMALLINT UNSIGNED NOT NULL,
  additional_fee DECIMAL(10,2) NOT NULL,
  previous_end_time TIME NOT NULL,
  approved_end_time TIME NOT NULL,
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  payment_id INT NULL,
  rejection_reason VARCHAR(500) NULL,
  processed_by INT NULL,
  processed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_extension_status_created (status,created_at),
  KEY ix_extension_reservation_status (reservation_id,status),
  CONSTRAINT fk_extension_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_extension_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_extension_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  CONSTRAINT fk_extension_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

