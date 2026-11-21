-- SHSRS demo data — import AFTER schema.sql (phpMyAdmin > shsrs > Import)
-- Logins:  admin@shsrs.demo / Admin1234   |   riders: <name>@shsrs.demo / Rider1234
-- Dates are relative to today, so the demo always looks current.
USE shsrs;

INSERT IGNORE INTO users (name, email, password_hash, is_admin) VALUES
 ('Demo Admin',   'admin@shsrs.demo',  '$2a$10$Mqo4CQx3FJOb70O.Yq0G0.EsePieFYoABAjBZXGyFtq2WCG/xniGa', 1),
 ('Maria Santos', 'maria@shsrs.demo',  '$2a$10$gmuGWj4.wuI7YTLslyOzX..u0MkxHlHXA1Hu7oeBeguxPdgTKgJlK', 0),
 ('Juan Dela Cruz','juan@shsrs.demo',  '$2a$10$gmuGWj4.wuI7YTLslyOzX..u0MkxHlHXA1Hu7oeBeguxPdgTKgJlK', 0),
 ('Ana Reyes',    'ana@shsrs.demo',    '$2a$10$gmuGWj4.wuI7YTLslyOzX..u0MkxHlHXA1Hu7oeBeguxPdgTKgJlK', 0),
 ('Carlo Mendoza','carlo@shsrs.demo',  '$2a$10$gmuGWj4.wuI7YTLslyOzX..u0MkxHlHXA1Hu7oeBeguxPdgTKgJlK', 0),
 ('Liza Garcia',  'liza@shsrs.demo',   '$2a$10$gmuGWj4.wuI7YTLslyOzX..u0MkxHlHXA1Hu7oeBeguxPdgTKgJlK', 0);

-- one slot under maintenance
UPDATE slots SET is_blocked = 1 WHERE slot_no = 11;

-- reservations: past (completed), today, and upcoming
INSERT IGNORE INTO reservations (user_id, slot_no, res_date, res_time, stored)
SELECT u.id, v.slot, CURDATE() + INTERVAL v.d DAY, v.t, v.st FROM (
  SELECT 'maria@shsrs.demo' e, 1 slot, -3 d, '08:00:00' t, 0 st UNION ALL
  SELECT 'juan@shsrs.demo',   2, -2, '09:30:00', 0 UNION ALL
  SELECT 'ana@shsrs.demo',    4, -1, '17:00:00', 0 UNION ALL
  SELECT 'maria@shsrs.demo',  1,  0, '23:30:00', 1 UNION ALL
  SELECT 'carlo@shsrs.demo',  6,  0, '23:00:00', 0 UNION ALL
  SELECT 'liza@shsrs.demo',   8,  1, '07:45:00', 0 UNION ALL
  SELECT 'juan@shsrs.demo',   2,  1, '13:00:00', 0 UNION ALL
  SELECT 'ana@shsrs.demo',    3,  2, '10:15:00', 0 UNION ALL
  SELECT 'carlo@shsrs.demo', 10,  3, '16:30:00', 0 UNION ALL
  SELECT 'liza@shsrs.demo',   5,  4, '08:30:00', 0 UNION ALL
  SELECT 'maria@shsrs.demo',  7,  5, '18:00:00', 0 UNION ALL
  SELECT 'juan@shsrs.demo',  12,  7, '09:00:00', 0
) v JOIN users u ON u.email = v.e;

-- cabinet access history
INSERT INTO access_log (reservation_id, user_id, slot_no, action, ts)
SELECT r.id, r.user_id, r.slot_no, a.act, (UNIX_TIMESTAMP() - a.ago) * 1000
FROM reservations r
JOIN users u ON u.id = r.user_id
JOIN (
  SELECT 'maria@shsrs.demo' e, 1 slot, -3 d, 'Stored' act, 259200 ago UNION ALL
  SELECT 'maria@shsrs.demo', 1, -3, 'Retrieved', 252000 UNION ALL
  SELECT 'juan@shsrs.demo',  2, -2, 'Stored', 172800 UNION ALL
  SELECT 'juan@shsrs.demo',  2, -2, 'Retrieved', 165600 UNION ALL
  SELECT 'ana@shsrs.demo',   4, -1, 'Stored', 86400 UNION ALL
  SELECT 'maria@shsrs.demo', 1,  0, 'Stored', 1800
) a ON a.e = u.email AND a.slot = r.slot_no AND r.res_date = CURDATE() + INTERVAL a.d DAY;
