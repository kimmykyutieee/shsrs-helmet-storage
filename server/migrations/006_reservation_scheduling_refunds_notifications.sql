USE shsrs;

ALTER TABLE reservations
  MODIFY COLUMN status ENUM('Pending','Confirmed','Active','Expired','Cancelled','Used') NOT NULL DEFAULT 'Pending',
  ADD COLUMN end_time TIME NULL AFTER res_time,
  ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER end_time,
  ADD COLUMN is_whole_day TINYINT(1) NOT NULL DEFAULT 0 AFTER duration_minutes,
  ADD COLUMN total_price DECIMAL(10,2) NULL AFTER is_whole_day,
  ADD COLUMN actual_storage_ts BIGINT NULL AFTER stored,
  ADD COLUMN grace_deadline DATETIME NULL AFTER actual_storage_ts,
  ADD COLUMN qr_used TINYINT(1) NOT NULL DEFAULT 0 AFTER grace_deadline;

UPDATE reservations
SET end_time = CASE WHEN end_time IS NULL THEN '21:00:00' ELSE end_time END,
    duration_minutes = CASE WHEN duration_minutes IS NULL THEN 60 ELSE duration_minutes END,
    total_price = CASE WHEN total_price IS NULL THEN 20 ELSE total_price END,
    grace_deadline = CASE WHEN grace_deadline IS NULL THEN
      TIMESTAMP(res_date, ADDTIME(res_time, '00:10:00')) ELSE grace_deadline END;

CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id INT NOT NULL,
  original_payment_amount DECIMAL(10,2) NOT NULL,
  refund_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  refund_amount DECIMAL(10,2) NOT NULL,
  non_refundable_amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','APPROVED','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  finance_approver_id INT NULL,
  approval_timestamp DATETIME NULL,
  completion_timestamp DATETIME NULL,
  rejection_reason VARCHAR(500) NULL,
  transaction_reference VARCHAR(200) NULL,
  expiration_timestamp DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refund_reservation (reservation_id),
  KEY ix_refund_status_created (status, created_at),
  CONSTRAINT fk_refund_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_refund_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_refund_approver FOREIGN KEY (finance_approver_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  type ENUM('PAYMENT_VERIFIED','RESERVATION_STARTING','RESERVATION_ENDING','REFUND_STATUS') NOT NULL,
  reservation_id INT NULL,
  refund_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_notification_reservation_type (user_id,type,reservation_id),
  KEY ix_notification_user_read (user_id,is_read,created_at),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_refund FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE
) ENGINE=InnoDB;
