-- SHSRS demo data — based on phpMyAdmin export of `shsrs` (shsrs.sql, 2026-11-24).
-- Import AFTER server/schema.sql (phpMyAdmin > shsrs > Import).
-- Password hashes are preserved from the export; use your known credentials for these accounts.
USE shsrs;

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Data for table `slots`
-- --------------------------------------------------------
UPDATE slots SET is_blocked = 0;
UPDATE slots SET is_blocked = 1 WHERE slot_no = 2;

-- --------------------------------------------------------
-- Data for table `users`
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `photo`, `phone`, `student_id`, `course`, `is_admin`, `is_finance`, `is_security`, `created_at`) VALUES
(1, 'Admin', 'admin@shsrs.com', '$2a$10$Mqo4CQx3FJOb70O.Yq0G0.EsePieFYoABAjBZXGyFtq2WCG/xniGa', NULL, NULL, NULL, NULL, 1, 0, 0, '2026-11-23 17:48:29'),
(2, 'Finance', 'finance@shsrs.com', '$2a$10$sNfA0yUdAEFLgPCb3V4dyudYttLoMhtBVNrPa1dmNGdmSEm0yZuMW', NULL, NULL, NULL, NULL, 0, 1, 0, '2026-11-23 17:48:29'),
(3, 'Security', 'security@shsrs.com', '$2a$10$mWtOLyjcCBTeTjjGSuDjSefbWhHOZkFgvw8flvUNGzIAxTgPp4M3.', NULL, NULL, NULL, NULL, 0, 0, 1, '2026-11-23 17:48:29');

-- --------------------------------------------------------
-- Data for table `reservations`, `payments`, and `refunds`
-- (No demo rows)
-- --------------------------------------------------------

-- --------------------------------------------------------
-- Data for table `access_log`
-- --------------------------------------------------------
INSERT INTO `access_log` (`id`, `reservation_id`, `user_id`, `slot_no`, `action`, `ts`, `scan_result`, `scan_code`, `scanned_by`) VALUES
(8, NULL, NULL, NULL, 'Scan Attempt', 1795456384078, 'INVALID', '25761993566_194903720452', 3),
(9, NULL, NULL, NULL, 'Scan Attempt', 1795456390090, 'INVALID', '25761993566_194903720452', 3),
(10, NULL, NULL, NULL, 'Scan Attempt', 1795456396291, 'INVALID', '25761993566_194903720452', 3),
(11, NULL, NULL, NULL, 'Scan Attempt', 1795456412433, 'INVALID', '25761993566_194903720452', 3),
(12, NULL, NULL, NULL, 'Scan Attempt', 1795456420998, 'INVALID', '25761993566_194903720452', 3);

-- --------------------------------------------------------
-- Data for table `esp32_commands` and `notifications`
-- (No demo rows)
-- --------------------------------------------------------

-- No reservation extension rows in export.

-- --------------------------------------------------------
-- Auto-increment counters
-- --------------------------------------------------------
ALTER TABLE `access_log` AUTO_INCREMENT = 13;
ALTER TABLE `esp32_commands` AUTO_INCREMENT = 1;
ALTER TABLE `notifications` AUTO_INCREMENT = 1;
ALTER TABLE `payments` AUTO_INCREMENT = 1;
ALTER TABLE `refunds` AUTO_INCREMENT = 1;
ALTER TABLE `reservations` AUTO_INCREMENT = 1;
ALTER TABLE `reservation_extensions` AUTO_INCREMENT = 1;
ALTER TABLE `users` AUTO_INCREMENT = 4;

SET FOREIGN_KEY_CHECKS = 1;