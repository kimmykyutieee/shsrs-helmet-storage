USE shsrs;

SET @has_member_type = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'member_type'
);
SET @migration_sql = IF(
  @has_member_type = 0,
  "ALTER TABLE users ADD COLUMN member_type ENUM('Student','Faculty') NOT NULL DEFAULT 'Student' AFTER student_id",
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
