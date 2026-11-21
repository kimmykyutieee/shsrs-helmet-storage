// SHSRS API — Express + MySQL/MariaDB
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyStudentQrSubmission } = require('./studentQr');
const { createCabinetQr, parseCabinetQr, verifyCabinetQrSignature } = require('./cabinetQr');

// Load server/.env without an extra dependency. Environment variables already set by the OS win.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      let value = match[2];
      if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const PAYMENT_AMOUNT = '25.00';
const DEVICE_ID = process.env.ESP32_DEVICE_ID || 'cabinet-esp32-01';
const DEVICE_TOKEN = process.env.ESP32_DEVICE_TOKEN || '';
const QR_SECRET = process.env.QR_SECRET || SECRET;
const SERVO_UNLOCK_MS = 1500;
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',          // XAMPP default: empty
  database: process.env.DB_NAME || 'shsrs',
  dateStrings: true,
  connectionLimit: 10,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => {
  console.log('Root endpoint accessed');

  res.status(200).json({
    message: 'SHSRS API is running successfully!',
    status: 'online'
  });
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
  console.error(e); res.status(500).json({ error: 'Database/server error: ' + (e.code || e.message) });
});
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const okMail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const okPhone = (p) => /^\+?[0-9\s()-]{7,30}$/.test(p || '');
const okDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const okTime = (t) => /^\d{2}:\d{2}$/.test(t || '');
const dt = (d, t) => { const [y, m, da] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return new Date(y, m - 1, da, h, mi); };
const fd = (d) => { const [y, m, da] = d.split('-').map(Number); return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${da}, ${y}`; };
const ft = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

const auth = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  let uid;
  try { uid = jwt.verify(h.replace('Bearer ', ''), SECRET).uid; } catch (e) { return bad(res, 'Please log in again.', 401); }
  const [[u]] = await pool.query('SELECT id, is_admin, is_finance, is_security FROM users WHERE id=?', [uid]);
  if (!u) return bad(res, 'Please log in again.', 401);
  req.uid = u.id; req.admin = !!u.is_admin; req.finance = !!u.is_finance; req.security = !!u.is_security;
  next();
});
const adminOnly = (req, res, next) => (req.admin && !req.finance && !req.security ? next() : bad(res, 'Admins only.', 403));
const financeOnly = (req, res, next) => (req.finance && !req.admin && !req.security ? next() : bad(res, 'Finance access only.', 403));
const riderOrAdmin = (req, res, next) => (!req.finance && !req.security ? next() : bad(res, 'This feature is not available to your account role.', 403));
const scannerAccess = (req, res, next) => (req.admin || req.security ? next() : bad(res, 'Security or Admin access only.', 403));
const token = (uid) => jwt.sign({ uid }, SECRET, { expiresIn: '30d' });

// ESP32 uses a separate device secret; it never receives student JWTs or decides authorization.
const deviceAuth = (req, res, next) => {
  const supplied = String(req.headers['x-device-token'] || '');
  if (!DEVICE_TOKEN || supplied.length !== DEVICE_TOKEN.length || Buffer.byteLength(supplied) !== Buffer.byteLength(DEVICE_TOKEN) || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(DEVICE_TOKEN))) {
    return bad(res, 'ESP32 device authentication failed.', 401);
  }
  if (String(req.headers['x-device-id'] || '') !== DEVICE_ID) return bad(res, 'Unknown ESP32 device.', 403);
  next();
};

app.get('/api/health', wrap(async (req, res) => {
  await pool.query('SELECT 1 FROM slots LIMIT 1');   // proves MySQL is up AND schema.sql was imported
  await pool.query('SELECT 1 FROM esp32_commands LIMIT 1'); // proves the ESP32 migration is installed
  res.json({ ok: true, db: 'connected' });
}));

/* ---------- auth ---------- */
app.post('/api/register', wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = verifyStudentQrSubmission(body);
  if (parsed.error) {
    const errors = {
      invalid: 'Invalid or unsupported student ID QR code.',
      studentId: 'The QR code must contain a 10-digit student ID.',
      name: 'The QR code is missing the student name.',
      course: 'The QR code is missing the course or program.',
      mismatch: 'Student details do not match the scanned QR code.',
    };
    return bad(res, errors[parsed.error]);
  }
  const { name, studentId, course } = parsed.student;
  const email = String(body.email || '').trim().toLowerCase(), pw = String(body.password || '');
  if (!name) return bad(res, 'Please enter your name.');
  if (!okMail(email)) return bad(res, 'Please enter a valid email address.');
  if (pw.length < 8) return bad(res, 'Password must be at least 8 characters.');
  const phone = String(body.phone || '').trim();
  if (!okPhone(phone)) return bad(res, 'Please enter a valid phone number.');
  const [[existingStudent]] = await pool.query('SELECT id FROM users WHERE student_id=?', [studentId]);
  if (existingStudent) return bad(res, 'This student ID is already registered.', 409);
  const [[existingEmail]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (existingEmail) return bad(res, 'That email is already registered.', 409);
  let r;
  try {
    [r] = await pool.query(
      'INSERT INTO users (name,email,password_hash,phone,student_id,course,is_admin) VALUES (?,?,?,?,?,?,0)',
      [name, email, await bcrypt.hash(pw, 10), phone, studentId, course],
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw e;
    const [[duplicateEmail]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (duplicateEmail) return bad(res, 'That email is already registered.', 409);
    const [[duplicateStudent]] = await pool.query('SELECT id FROM users WHERE student_id=?', [studentId]);
    if (duplicateStudent) return bad(res, 'This student ID is already registered.', 409);
    throw e;
  }
  res.json({ token: token(r.insertId) });
}));

app.post('/api/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const [[u]] = await pool.query('SELECT id, password_hash FROM users WHERE email=?', [email]);
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return bad(res, 'Incorrect email or password.', 401);
  res.json({ token: token(u.id) });
}));

/* ---------- everything the app needs in one call ---------- */
app.get('/api/data', auth, wrap(async (req, res) => {
  if (req.finance || req.security) {
    const [[user]] = await pool.query('SELECT id, name, email, photo, phone, is_admin, is_finance, is_security FROM users WHERE id=?', [req.uid]);
    const currentUser = {
      id: user.id, name: user.name, email: user.email, admin: !!user.is_admin, finance: !!user.is_finance, security: !!user.is_security,
      photo: user.photo || '', phone: user.phone || '',
    };
    if (req.finance) return res.json({ me: req.uid, users: [currentUser], res: [], slotReservations: [], slots: [], blocked: [], log: [], payments: [] });

    const [slotRows] = await pool.query('SELECT slot_no AS slot, is_blocked AS blocked FROM slots ORDER BY slot_no');
    const [slotReservations] = await pool.query('SELECT slot_no AS slot, res_date AS date, LEFT(res_time,5) AS time, status FROM reservations ORDER BY res_date, res_time');
    const [log] = await pool.query('SELECT reservation_id AS rid, slot_no AS slot, action AS act, ts FROM access_log ORDER BY id DESC LIMIT 50');
    const slots = slotRows.map((slot) => ({ ...slot, blocked: !!slot.blocked }));
    return res.json({
      me: req.uid, users: [currentUser], res: [],
      slotReservations,
      slots, blocked: slots.filter((slot) => slot.blocked).map((slot) => slot.slot),
      log: log.map((entry) => ({ ...entry, ts: Number(entry.ts) })), payments: [],
    });
  }
  const [users] = await pool.query('SELECT id, name, email, photo, phone, is_admin, is_finance, is_security FROM users ORDER BY id');
  const list = users.filter((u) => req.admin || u.id === req.uid).map((u) => ({
    id: u.id, name: u.name, email: u.email, admin: !!u.is_admin, finance: !!u.is_finance, security: !!u.is_security,
    photo: u.id === req.uid ? u.photo || '' : '', phone: u.id === req.uid ? u.phone || '' : '',
  }));
  const [res1] = req.admin
    ? await pool.query("SELECT id, user_id AS uid, slot_no AS slot, res_date AS date, LEFT(res_time,5) AS time, stored, status FROM reservations ORDER BY res_date, res_time")
    : await pool.query("SELECT id, user_id AS uid, slot_no AS slot, res_date AS date, LEFT(res_time,5) AS time, stored, status FROM reservations WHERE user_id=? ORDER BY res_date, res_time", [req.uid]);
  const [slotReservations] = await pool.query('SELECT slot_no AS slot, res_date AS date, LEFT(res_time,5) AS time, status FROM reservations ORDER BY res_date, res_time');
  const [slotRows] = await pool.query('SELECT slot_no AS slot, is_blocked AS blocked FROM slots ORDER BY slot_no');
  const slots = slotRows.map((slot) => ({ ...slot, blocked: !!slot.blocked }));
  const blocked = slots.filter((slot) => slot.blocked).map((slot) => slot.slot);
  const [log] = req.admin
    ? await pool.query('SELECT reservation_id AS rid, user_id AS uid, slot_no AS slot, action AS act, ts FROM access_log ORDER BY id')
    : await pool.query('SELECT reservation_id AS rid, user_id AS uid, slot_no AS slot, action AS act, ts FROM access_log WHERE user_id=? ORDER BY id', [req.uid]);
  const [payments] = await pool.query('SELECT id, reservation_id AS reservationId, amount, status, submitted_at AS submittedAt, processed_at AS processedAt FROM payments WHERE user_id=? ORDER BY submitted_at DESC', [req.uid]);
  res.json({
    me: req.uid, users: list,
    res: res1.map((r) => ({ ...r, stored: !!r.stored })),
    slotReservations,
    slots, blocked,
    log: log.map((l) => ({ ...l, ts: Number(l.ts) })),
    payments,
  });
}));

/* ---------- student payment submission ---------- */
app.post('/api/reservations/:id/payments', auth, riderOrAdmin, wrap(async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);
  const receipt = String(req.body.receipt || '');
  if (!Number.isInteger(reservationId) || reservationId < 1) return bad(res, 'Reservation not found.', 404);
  if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(receipt)) return bad(res, 'Upload a valid payment receipt image.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[reservation]] = await connection.query('SELECT id, status FROM reservations WHERE id=? AND user_id=? FOR UPDATE', [reservationId, req.uid]);
    if (!reservation) {
      await connection.rollback();
      return bad(res, 'Reservation not found.', 404);
    }
    if (reservation.status === 'Confirmed') {
      await connection.rollback();
      return bad(res, 'This reservation is already confirmed.', 409);
    }
    const [[existing]] = await connection.query(
      "SELECT id, status FROM payments WHERE reservation_id=? AND status IN ('Pending','Verified') ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [reservationId],
    );
    if (existing) {
      await connection.rollback();
      return bad(res, existing.status === 'Verified' ? 'Payment is already verified.' : 'A payment is already awaiting review.', 409);
    }
    const [payment] = await connection.query(
      'INSERT INTO payments (reservation_id,user_id,amount,receipt) VALUES (?,?,?,?)',
      [reservationId, req.uid, PAYMENT_AMOUNT, receipt],
    );
    await connection.commit();
    res.json({ id: payment.insertId, status: 'Pending' });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

/* ---------- finance payment review ---------- */
app.get('/api/finance/payments', auth, financeOnly, wrap(async (req, res) => {
  const [payments] = await pool.query(
    "SELECT p.id, p.reservation_id AS reservationId, p.user_id AS studentId, u.name AS studentName, r.slot_no AS slot, r.res_date AS date, LEFT(r.res_time,5) AS time, p.amount, p.status, p.submitted_at AS submittedAt FROM payments p JOIN users u ON u.id=p.user_id JOIN reservations r ON r.id=p.reservation_id WHERE p.status='Pending' ORDER BY p.submitted_at ASC",
  );
  res.json({ payments });
}));

app.get('/api/finance/payments/:id/receipt', auth, financeOnly, wrap(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  const [[payment]] = Number.isInteger(paymentId)
    ? await pool.query("SELECT receipt FROM payments WHERE id=? AND status='Pending'", [paymentId])
    : [[]];
  if (!payment) return bad(res, 'Pending payment receipt not found.', 404);
  res.json({ receipt: payment.receipt });
}));

app.get('/api/finance/payment-history', auth, financeOnly, wrap(async (req, res) => {
  const [payments] = await pool.query(
    "SELECT p.id, p.reservation_id AS reservationId, p.user_id AS studentId, u.name AS studentName, r.slot_no AS slot, r.res_date AS date, LEFT(r.res_time,5) AS time, p.amount, p.status, p.submitted_at AS submittedAt, p.processed_at AS processedAt FROM payments p JOIN users u ON u.id=p.user_id JOIN reservations r ON r.id=p.reservation_id WHERE p.status IN ('Verified','Rejected') ORDER BY p.processed_at DESC",
  );
  res.json({ payments });
}));

const decidePayment = (status) => wrap(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (!Number.isInteger(paymentId) || paymentId < 1) return bad(res, 'Payment not found.', 404);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[payment]] = await connection.query('SELECT id, reservation_id AS reservationId, status FROM payments WHERE id=? FOR UPDATE', [paymentId]);
    if (!payment) {
      await connection.rollback();
      return bad(res, 'Payment not found.', 404);
    }
    if (payment.status !== 'Pending') {
      await connection.rollback();
      return bad(res, 'This payment has already been processed.', 409);
    }
    await connection.query('UPDATE payments SET status=?, processed_at=CURRENT_TIMESTAMP, processed_by=? WHERE id=?', [status, req.uid, paymentId]);
    if (status === 'Verified') {
      await connection.query("UPDATE reservations SET status='Confirmed' WHERE id=?", [payment.reservationId]);
    }
    await connection.commit();
    res.json({ ok: true, status, smsSent: false, notification: 'SMS provider is not configured.' });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
});

app.post('/api/finance/payments/:id/verify', auth, financeOnly, decidePayment('Verified'));
app.post('/api/finance/payments/:id/reject', auth, financeOnly, decidePayment('Rejected'));

/* ---------- reservation QR authorization ---------- */
app.get('/api/reservations/:id/qr', auth, riderOrAdmin, wrap(async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);
  const [[reservation]] = Number.isInteger(reservationId)
    ? await pool.query("SELECT id, user_id, slot_no, res_date AS date, LEFT(res_time,5) AS time, status FROM reservations WHERE id=? AND (user_id=? OR ?=1)", [reservationId, req.uid, req.admin ? 1 : 0])
    : [[]];
  if (!reservation) return bad(res, 'Reservation not found.', 404);
  const [[payment]] = await pool.query("SELECT id FROM payments WHERE reservation_id=? AND status='Verified' LIMIT 1", [reservationId]);
  if (reservation.status !== 'Confirmed' || !payment) return bad(res, 'Finance must verify payment before QR access.', 403);
  res.json({ code: createCabinetQr({ reservationId: reservation.id, slotNo: reservation.slot_no, date: String(reservation.date).slice(0,10), time: String(reservation.time).slice(0,5), userId: reservation.user_id }, QR_SECRET) });
}));

/* ---------- reservations ---------- */
app.post('/api/reservations', auth, riderOrAdmin, wrap(async (req, res) => {
  const slot = parseInt(req.body.slot, 10), { date, time } = req.body;
  if (!(slot >= 1 && slot <= 12)) return bad(res, 'Please select a slot.');
  if (!okDate(date)) return bad(res, 'Please choose a date.');
  if (!okTime(time)) return bad(res, 'Please choose a time.');
  if (dt(date, time) < new Date()) return bad(res, 'Please choose a future date and time.');
  const [[s]] = await pool.query('SELECT is_blocked FROM slots WHERE slot_no=?', [slot]);
  if (!s) return bad(res, 'Unknown slot.');
  if (s.is_blocked) return bad(res, 'That slot is under maintenance.');
  try {
    const [r] = await pool.query('INSERT INTO reservations (user_id,slot_no,res_date,res_time) VALUES (?,?,?,?)', [req.uid, slot, date, time]);
    res.json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'That slot is already reserved on this date.', 409);
    throw e;
  }
}));

app.put('/api/reservations/:id', auth, riderOrAdmin, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10), { date, time } = req.body;
  if (!okDate(date) || !okTime(time)) return bad(res, 'Choose a date and time.');
  if (dt(date, time) < new Date()) return bad(res, 'Choose a future date and time.');
  const [[r]] = await pool.query('SELECT id FROM reservations WHERE id=? AND user_id=?', [id, req.uid]);
  if (!r) return bad(res, 'Reservation not found.', 404);
  try {
    await pool.query('UPDATE reservations SET res_date=?, res_time=? WHERE id=?', [date, time, id]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'That slot is already reserved on this date.', 409);
    throw e;
  }
}));

app.delete('/api/reservations/:id', auth, riderOrAdmin, wrap(async (req, res) => {
  await pool.query('DELETE FROM reservations WHERE id=? AND user_id=?', [parseInt(req.params.id, 10), req.uid]);
  res.json({ ok: true });
}));

/* ---------- cabinet scanner + ESP32 unlock queue ---------- */
app.post('/api/scan', auth, scannerAccess, wrap(async (req, res) => {
  const parsed = parseCabinetQr(String(req.body.code || '').trim());
  const out = (ok, title, msg, extra = {}) => res.json({ ok, title, msg, ...extra });
  if (!parsed || !verifyCabinetQrSignature(parsed, QR_SECRET)) return out(false, 'Invalid QR code', 'This QR code is invalid, altered, or not signed by SHSRS. Scan the latest reservation QR code from the app.');
  if (!DEVICE_TOKEN) return bad(res, 'ESP32 is not configured. Set ESP32_DEVICE_TOKEN in server/.env; the cabinet remains locked.', 503);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[r]] = await connection.query(
      `SELECT r.id, r.user_id, r.slot_no, r.res_date AS date, LEFT(r.res_time,5) AS time,
              r.stored, r.status, s.is_blocked,
              EXISTS(SELECT 1 FROM payments p WHERE p.reservation_id=r.id AND p.user_id=r.user_id AND p.status='Verified') AS payment_verified
       FROM reservations r JOIN slots s ON s.slot_no=r.slot_no WHERE r.id=? FOR UPDATE`,
      [parsed.reservationId],
    );
    if (!r) { await connection.rollback(); return out(false, 'Access denied', 'Reservation not found.'); }

    // Every field encoded in the QR must match the authoritative reservation record.
    if (Number(r.user_id) !== parsed.userId || Number(r.slot_no) !== parsed.slotNo || String(r.date).slice(0,10) !== parsed.date || String(r.time).slice(0,5) !== parsed.time) {
      await connection.rollback();
      return out(false, 'Invalid QR code', 'The QR details do not match this reservation. The cabinet remains locked.');
    }
    if (r.status !== 'Confirmed' || !r.payment_verified) {
      await connection.rollback();
      return out(false, 'Payment not verified', 'Finance must verify payment before this reservation can be used.');
    }
    if (r.is_blocked) {
      await connection.rollback();
      return out(false, 'Cabinet unavailable', 'This cabinet slot is under maintenance.');
    }
    const now = Date.now(), open = dt(r.date, r.time).getTime() - 30 * 60000, end = dt(r.date, '23:59').getTime() + 59999;
    if (now < open) { await connection.rollback(); return out(false, 'Too early', `Slot ${r.slot_no} opens 30 minutes before ${ft(r.time)} on ${fd(r.date)}.`); }
    if (now > end) { await connection.rollback(); return out(false, 'Reservation expired', 'The date of this reservation has passed.'); }

    const stored = r.stored ? 0 : 1;
    const action = stored ? 'Stored' : 'Retrieved';
    await connection.query('UPDATE reservations SET stored=? WHERE id=?', [stored, r.id]);
    await connection.query('INSERT INTO access_log (reservation_id,user_id,slot_no,action,ts) VALUES (?,?,?,?,?)', [r.id, r.user_id, r.slot_no, action, now]);
    const [command] = await connection.query(
      `INSERT INTO esp32_commands (reservation_id,user_id,slot_no,action,status,expires_at)
       VALUES (?,?,?,?,'queued',DATE_ADD(NOW(), INTERVAL 30 SECOND))`,
      [r.id, r.user_id, r.slot_no, action],
    );
    await connection.commit();
    return out(true, 'Reservation verified', `Slot ${r.slot_no}: ${action.toLowerCase()} recorded. The cabinet unlock command was queued.`, {
      hardware: { commandId: command.insertId, deviceId: DEVICE_ID, unlockDurationMs: SERVO_UNLOCK_MS },
    });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

// The ESP32 can only fetch commands already authorized and inserted by /api/scan.
app.get('/api/device/commands/next', deviceAuth, wrap(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE esp32_commands SET status='expired' WHERE status IN ('queued','claimed') AND expires_at<=NOW()");
    const [[command]] = await connection.query(
      `SELECT id, reservation_id AS reservationId, slot_no AS slot, action, UNIX_TIMESTAMP(expires_at) AS expiresAt
       FROM esp32_commands WHERE status='queued' AND expires_at>NOW() ORDER BY id ASC LIMIT 1 FOR UPDATE`,
    );
    if (!command) {
      await connection.commit();
      return res.json({ command: null });
    }
    await connection.query("UPDATE esp32_commands SET status='claimed', claimed_at=NOW() WHERE id=? AND status='queued'", [command.id]);
    await connection.commit();
    res.json({ command: { ...command, deviceId: DEVICE_ID, action: 'unlock', unlockDurationMs: SERVO_UNLOCK_MS } });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

app.post('/api/device/commands/:id/ack', deviceAuth, wrap(async (req, res) => {
  const commandId = Number.parseInt(req.params.id, 10);
  const status = String(req.body.status || '');
  const message = String(req.body.message || '').slice(0, 240);
  if (!Number.isInteger(commandId) || commandId < 1 || !['completed','failed'].includes(status)) return bad(res, 'Invalid command acknowledgement.');
  const [updated] = await pool.query(
    `UPDATE esp32_commands SET status=?, device_message=?, completed_at=NOW()
     WHERE id=? AND status='claimed' AND expires_at>NOW()`,
    [status, message, commandId],
  );
  if (!updated.affectedRows) return bad(res, 'Command not found, expired, or already acknowledged.', 404);
  res.json({ ok: true });
}));

/* ---------- profile ---------- */
app.put('/api/me', auth, riderOrAdmin, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim(), email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  if (!name) return bad(res, 'Name is required.');
  if (!okMail(email)) return bad(res, 'Enter a valid email address.');
  if (!okPhone(phone)) return bad(res, 'Enter a valid phone number.');
  const [[ex]] = await pool.query('SELECT id FROM users WHERE email=? AND id<>?', [email, req.uid]);
  if (ex) return bad(res, 'That email is already in use.', 409);
  await pool.query('UPDATE users SET name=?, email=?, phone=? WHERE id=?', [name, email, phone, req.uid]);
  res.json({ ok: true });
}));

app.put('/api/me/photo', auth, riderOrAdmin, wrap(async (req, res) => {
  await pool.query('UPDATE users SET photo=? WHERE id=?', [String(req.body.photo || '') || null, req.uid]);
  res.json({ ok: true });
}));

app.put('/api/me/password', auth, riderOrAdmin, wrap(async (req, res) => {
  const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.uid]);
  if (!(await bcrypt.compare(String(req.body.current || ''), u.password_hash))) return bad(res, 'Current password is incorrect.');
  if (String(req.body.next || '').length < 8) return bad(res, 'New password must be at least 8 characters.');
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(String(req.body.next), 10), req.uid]);
  res.json({ ok: true });
}));

app.delete('/api/me', auth, riderOrAdmin, wrap(async (req, res) => {
  await pool.query('DELETE FROM users WHERE id=?', [req.uid]);   // reservations cascade
  res.json({ ok: true });
}));

/* ---------- admin ---------- */
app.put('/api/admin/slots/:n/toggle', auth, adminOnly, wrap(async (req, res) => {
  await pool.query('UPDATE slots SET is_blocked = 1 - is_blocked WHERE slot_no=?', [parseInt(req.params.n, 10)]);
  res.json({ ok: true });
}));

app.delete('/api/admin/reservations/:id', auth, adminOnly, wrap(async (req, res) => {
  await pool.query('DELETE FROM reservations WHERE id=?', [parseInt(req.params.id, 10)]);
  res.json({ ok: true });
}));

app.put('/api/admin/users/:id/finance', auth, adminOnly, wrap(async (req, res) => {
  if (typeof req.body.finance !== 'boolean') return bad(res, 'Choose whether this account should have the Finance role.');
  const userId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userId) || userId < 1) return bad(res, 'User not found.', 404);
  const [[user]] = await pool.query('SELECT id, is_admin, is_finance, is_security FROM users WHERE id=?', [userId]);
  if (!user) return bad(res, 'User not found.', 404);
  if (user.is_admin) return bad(res, 'Administrator accounts cannot be assigned the Finance role.', 409);
  if (req.body.finance && user.is_security) return bad(res, 'Remove the Security role before assigning Finance.', 409);
  if (!!user.is_finance === req.body.finance) return bad(res, 'This account already has the requested role status.', 409);
  const [updated] = await pool.query('UPDATE users SET is_finance=? WHERE id=? AND is_admin=0 AND is_security=0 AND is_finance<>?', [req.body.finance ? 1 : 0, userId, req.body.finance ? 1 : 0]);
  if (!updated.affectedRows) return bad(res, 'This account role has already changed. Refresh and try again.', 409);
  res.json({ ok: true, finance: req.body.finance });
}));

app.put('/api/admin/users/:id/security', auth, adminOnly, wrap(async (req, res) => {
  if (typeof req.body.security !== 'boolean') return bad(res, 'Choose whether this account should have the Security role.');
  const userId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userId) || userId < 1) return bad(res, 'User not found.', 404);
  const [[user]] = await pool.query('SELECT id, is_admin, is_finance, is_security FROM users WHERE id=?', [userId]);
  if (!user) return bad(res, 'User not found.', 404);
  if (user.is_admin) return bad(res, 'Administrator accounts cannot be assigned the Security role.', 409);
  if (req.body.security && user.is_finance) return bad(res, 'Remove the Finance role before assigning Security.', 409);
  if (!!user.is_security === req.body.security) return bad(res, 'This account already has the requested role status.', 409);
  const [updated] = await pool.query('UPDATE users SET is_security=? WHERE id=? AND is_admin=0 AND is_finance=0 AND is_security<>?', [req.body.security ? 1 : 0, userId, req.body.security ? 1 : 0]);
  if (!updated.affectedRows) return bad(res, 'This account role has already changed. Refresh and try again.', 409);
  res.json({ ok: true, security: req.body.security });
}));

app.listen(PORT, '0.0.0.0', () => console.log(`SHSRS API running on http://localhost:${PORT}`));
