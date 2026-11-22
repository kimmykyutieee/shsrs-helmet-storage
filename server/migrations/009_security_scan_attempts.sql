USE shsrs;

ALTER TABLE access_log
  MODIFY COLUMN reservation_id INT NULL,
  MODIFY COLUMN slot_no TINYINT NULL,
  MODIFY COLUMN action ENUM('Stored','Retrieved','Scan Attempt') NOT NULL,
  ADD COLUMN scan_result ENUM('VALID','INVALID','EXPIRED','DENIED','ERROR') NULL AFTER ts,
  ADD COLUMN scan_code VARCHAR(2048) NULL AFTER scan_result,
  ADD COLUMN scanned_by INT NULL AFTER scan_code,
  ADD KEY ix_access_log_scanned_by (scanned_by),
  ADD CONSTRAINT fk_access_log_scanned_by FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL;
