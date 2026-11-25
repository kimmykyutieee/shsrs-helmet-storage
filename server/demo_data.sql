-- SHSRS demo data
-- Import AFTER server/schema.sql (phpMyAdmin > shsrs > Import).
-- Inserts only the 3 staff accounts. No reservations, payments, refunds, notifications,
-- access logs, or other demo rows are included.
USE shsrs;

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `photo`, `phone`, `student_id`, `course`, `is_admin`, `is_finance`, `is_security`, `created_at`) VALUES
(1, 'Admin', 'admin@shsrs.com', '$2a$10$Mqo4CQx3FJOb70O.Yq0G0.EsePieFYoABAjBZXGyFtq2WCG/xniGa', NULL, NULL, NULL, NULL, 1, 0, 0, '2026-11-23 17:48:29'),
(2, 'Finance', 'finance@shsrs.com', '$2a$10$sNfA0yUdAEFLgPCb3V4dyudYttLoMhtBVNrPa1dmNGdmSEm0yZuMW', NULL, NULL, NULL, NULL, 0, 1, 0, '2026-11-23 17:48:29'),
(3, 'Security', 'security@shsrs.com', '$2a$10$mWtOLyjcCBTeTjjGSuDjSefbWhHOZkFgvw8flvUNGzIAxTgPp4M3.', NULL, NULL, NULL, NULL, 0, 0, 1, '2026-11-23 17:48:29');

ALTER TABLE `users` AUTO_INCREMENT = 4;

SET FOREIGN_KEY_CHECKS = 1;
