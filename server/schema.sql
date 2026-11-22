-- SHSRS database (MySQL / MariaDB, XAMPP + phpMyAdmin)
CREATE DATABASE IF NOT EXISTS shsrs CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE shsrs;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  photo         MEDIUMTEXT NULL,
  phone         VARCHAR(30) NULL,
  student_id    CHAR(10) NULL,
  course        VARCHAR(100) NULL,
  is_admin      TINYINT(1) NOT NULL DEFAULT 0,
  is_finance    TINYINT(1) NOT NULL DEFAULT 0,
  is_security   TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_student_id (student_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS slots (
  slot_no    TINYINT PRIMARY KEY,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO slots (slot_no) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12);

CREATE TABLE IF NOT EXISTS reservations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  slot_no    TINYINT NOT NULL,
  res_date   DATE NOT NULL,
  res_time   TIME NOT NULL,
  end_time   TIME NULL,
  duration_minutes SMALLINT UNSIGNED NULL,
  is_whole_day TINYINT(1) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NULL,
  stored     TINYINT(1) NOT NULL DEFAULT 0,
  actual_storage_ts BIGINT NULL,
  grace_deadline DATETIME NULL,
  qr_used TINYINT(1) NOT NULL DEFAULT 0,
  status     ENUM('Pending','Confirmed','Active','Expired','Cancelled','Used','Pending Refund Verification') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slot_date_time (slot_no, res_date, res_time),
  CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_slot FOREIGN KEY (slot_no) REFERENCES slots(slot_no)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS access_log (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NULL,
  user_id        INT NULL,
  slot_no        TINYINT NULL,
  action         ENUM('Stored','Retrieved','Scan Attempt') NOT NULL,
  ts             BIGINT NOT NULL,
  scan_result    ENUM('VALID','INVALID','EXPIRED','DENIED','ERROR') NULL,
  scan_code      VARCHAR(2048) NULL,
  scanned_by     INT NULL,
  KEY ix_access_log_scanned_by (scanned_by),
  CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_access_log_scanned_by FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
  rejection_reason VARCHAR(500) NULL,
  processed_by   INT NULL,
  payment_type ENUM('Original','Extension') NOT NULL DEFAULT 'Original',
  extension_id INT NULL,
  KEY ix_payment_status_submitted (status, submitted_at),
  KEY ix_payment_reservation (reservation_id),
  CONSTRAINT fk_payment_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
  CONSTRAINT fk_extension_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_extension_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_extension_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  CONSTRAINT fk_extension_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
  type VARCHAR(64) NOT NULL,
  event_key VARCHAR(191) NOT NULL,
  reservation_id INT NULL,
  refund_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_notification_event_key (event_key),
  KEY ix_notification_user_read (user_id,is_read,created_at),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_refund FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE
) ENGINE=InnoDB;
