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
  is_admin      TINYINT(1) NOT NULL DEFAULT 0,
  is_finance    TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  stored     TINYINT(1) NOT NULL DEFAULT 0,
  status     ENUM('Pending','Confirmed') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slot_date (slot_no, res_date),
  CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_slot FOREIGN KEY (slot_no) REFERENCES slots(slot_no)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS access_log (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id        INT NULL,
  slot_no        TINYINT NOT NULL,
  action         ENUM('Stored','Retrieved') NOT NULL,
  ts             BIGINT NOT NULL,
  CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
  processed_by   INT NULL,
  KEY ix_payment_status_submitted (status, submitted_at),
  KEY ix_payment_reservation (reservation_id),
  CONSTRAINT fk_payment_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
