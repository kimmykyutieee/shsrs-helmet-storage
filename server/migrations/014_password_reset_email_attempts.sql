USE shsrs;

SET @has_attempt_count = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_requests' AND COLUMN_NAME = 'attempt_count'
);
SET @migration_sql = IF(
  @has_attempt_count = 0,
  'ALTER TABLE password_reset_requests ADD COLUMN attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER expires_at',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
