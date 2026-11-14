USE shsrs;

SET @has_student_id = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'student_id'
);
SET @migration_sql = IF(@has_student_id = 0, 'ALTER TABLE users ADD COLUMN student_id CHAR(10) NULL', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_course = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'course'
);
SET @migration_sql = IF(@has_course = 0, 'ALTER TABLE users ADD COLUMN course VARCHAR(100) NULL', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_student_id_index = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_student_id'
);
SET @migration_sql = IF(@has_student_id_index = 0, 'ALTER TABLE users ADD UNIQUE KEY uq_users_student_id (student_id)', 'SELECT 1');
PREPARE migration_stmt FROM @migration_sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
