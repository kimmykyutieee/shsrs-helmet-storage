USE shsrs;

SET @has_security_role = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_security'
);
SET @migration_sql = IF(@has_security_role = 0, 'ALTER TABLE users ADD COLUMN is_security TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
