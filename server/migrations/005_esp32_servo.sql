-- ESP32 SG90 servo command queue. Safe to run once on an existing SHSRS database.
USE shsrs;

CREATE TABLE IF NOT EXISTS esp32_commands (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id        INT NOT NULL,
  slot_no        TINYINT NOT NULL,
  action         ENUM('Stored','Retrieved') NOT NULL,
  status         ENUM('queued','claimed','completed','failed','expired') NOT NULL DEFAULT 'queued',
  device_message VARCHAR(240) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     DATETIME NOT NULL,
  claimed_at     DATETIME NULL,
  completed_at   DATETIME NULL,
  KEY ix_esp32_queue (status, expires_at, id),
  KEY ix_esp32_reservation (reservation_id)
) ENGINE=InnoDB;
