// SHSRS API — Express + MySQL/MariaDB
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const PAYMENT_AMOUNT = '25.00';
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
  const [[u]] = await pool.query('SELECT id, is_admin, is_finance FROM users WHERE id=?', [uid]);
  if (!u) return bad(res, 'Please log in again.', 401);
  req.uid = u.id; req.admin = !!u.is_admin; req.finance = !!u.is_finance;
  next();
});
const adminOnly = (req, res, next) => (req.admin && !req.finance ? next() : bad(res, 'Admins only.', 403));
const financeOnly = (req, res, next) => (req.finance && !req.admin ? next() : bad(res, 'Finance access only.', 403));
const nonFinance = (req, res, next) => (!req.finance ? next() : bad(res, 'Finance users cannot access student functions.', 403));
const token = (uid) => jwt.sign({ uid }, SECRET, { expiresIn: '30d' });

app.get('/api/health', wrap(async (req, res) => {
  await pool.query('SELECT 1 FROM slots LIMIT 1');   // proves MySQL is up AND schema.sql was imported
  res.json({ ok: true, db: 'connected' });
}));

/* ---------- auth ---------- */
app.post('/api/register', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim(), email = String(req.body.email || '').trim().toLowerCase(), pw = String(req.body.password || '');
  if (!name) return bad(res, 'Please enter your name.');
  if (!okMail(email)) return bad(res, 'Please enter a valid email address.');
  if (pw.length < 8) return bad(res, 'Password must be at least 8 characters.');
  const phone = String(req.body.phone || '').trim();
  if (!okPhone(phone)) return bad(res, 'Please enter a valid phone number.');
  const [[ex]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (ex) return bad(res, 'That email is already registered.', 409);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users');
  const [r] = await pool.query('INSERT INTO users (name,email,password_hash,phone,is_admin) VALUES (?,?,?,?,?)', [name, email, await bcrypt.hash(pw, 10), phone, n === 0 ? 1 : 0]);
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
  if (req.finance) {
    const [[user]] = await pool.query('SELECT id, name, email, photo, phone, is_admin, is_finance FROM users WHERE id=?', [req.uid]);
    const currentUser = {
      id: user.id, name: user.name, email: user.email, admin: !!user.is_admin, finance: !!user.is_finance,
      photo: user.photo || '', phone: user.phone || '',
    };
    return res.json({ me: req.uid, users: [currentUser], res: [], blocked: [], log: [], payments: [] });
  }
  const [users] = await pool.query('SELECT id, name, email, photo, phone, is_admin, is_finance FROM users ORDER BY id');
  const list = users.filter((u) => req.admin || u.id === req.uid).map((u) => ({
    id: u.id, name: u.name, email: u.email, admin: !!u.is_admin, finance: !!u.is_finance,
    photo: u.id === req.uid ? u.photo || '' : '', phone: u.id === req.uid ? u.phone || '' : '',
  }));
  const [res1] = await pool.query("SELECT id, user_id AS uid, slot_no AS slot, res_date AS date, LEFT(res_time,5) AS time, stored, status FROM reservations ORDER BY res_date, res_time");
  const [bl] = await pool.query('SELECT slot_no FROM slots WHERE is_blocked=1 ORDER BY slot_no');
  const [log] = req.admin
    ? await pool.query('SELECT reservation_id AS rid, user_id AS uid, slot_no AS slot, action AS act, ts FROM access_log ORDER BY id')
    : await pool.query('SELECT reservation_id AS rid, user_id AS uid, slot_no AS slot, action AS act, ts FROM access_log WHERE user_id=? ORDER BY id', [req.uid]);
  const [payments] = await pool.query('SELECT id, reservation_id AS reservationId, amount, status, submitted_at AS submittedAt, processed_at AS processedAt FROM payments WHERE user_id=? ORDER BY submitted_at DESC', [req.uid]);
  res.json({
    me: req.uid, users: list,
    res: res1.map((r) => ({ ...r, stored: !!r.stored })),
    blocked: bl.map((b) => b.slot_no),
    log: log.map((l) => ({ ...l, ts: Number(l.ts) })),
    payments,
  });
}));

/* ---------- student payment submission ---------- */
app.post('/api/reservations/:id/payments', auth, nonFinance, wrap(async (req, res) => {
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
    "SELECT p.id, p.reservation_id AS reservationId, p.user_id AS studentId, u.name AS studentName, p.amount, p.status, p.submitted_at AS submittedAt FROM payments p JOIN users u ON u.id=p.user_id WHERE p.status='Pending' ORDER BY p.submitted_at ASC",
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
    "SELECT p.id, p.reservation_id AS reservationId, p.user_id AS studentId, u.name AS studentName, p.amount, p.status, p.submitted_at AS submittedAt, p.processed_at AS processedAt FROM payments p JOIN users u ON u.id=p.user_id WHERE p.status IN ('Verified','Rejected') ORDER BY p.processed_at DESC",
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
app.get('/api/reservations/:id/qr', auth, nonFinance, wrap(async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);
  const [[reservation]] = Number.isInteger(reservationId)
    ? await pool.query("SELECT id, user_id, slot_no, res_date AS date, LEFT(res_time,5) AS time, status FROM reservations WHERE id=? AND (user_id=? OR ?=1)", [reservationId, req.uid, req.admin ? 1 : 0])
    : [[]];
  if (!reservation) return bad(res, 'Reservation not found.', 404);
  const [[payment]] = await pool.query("SELECT id FROM payments WHERE reservation_id=? AND status='Verified' LIMIT 1", [reservationId]);
  if (reservation.status !== 'Confirmed' || !payment) return bad(res, 'Finance must verify payment before QR access.', 403);
  res.json({ code: `SHSRS|R${reservation.id}|S${reservation.slot_no}|${reservation.date}|${reservation.time}|${reservation.user_id}` });
}));

/* ---------- reservations ---------- */
app.post('/api/reservations', auth, nonFinance, wrap(async (req, res) => {
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

app.put('/api/reservations/:id', auth, nonFinance, wrap(async (req, res) => {
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

app.delete('/api/reservations/:id', auth, nonFinance, wrap(async (req, res) => {
  await pool.query('DELETE FROM reservations WHERE id=? AND user_id=?', [parseInt(req.params.id, 10), req.uid]);
  res.json({ ok: true });
}));

/* ---------- cabinet scanner ---------- */
app.post('/api/scan', auth, nonFinance, wrap(async (req, res) => {
  const t = String(req.body.code || '').trim();
  const id = parseInt(t.startsWith('SHSRS|') ? (t.split('|')[1] || '').slice(1) : t.replace('#', ''), 10);
  const out = (ok, title, msg) => res.json({ ok, title, msg });
  const [[r]] = Number.isInteger(id) ? await pool.query("SELECT id, user_id, slot_no, res_date AS date, LEFT(res_time,5) AS time, stored, status, EXISTS(SELECT 1 FROM payments p WHERE p.reservation_id=reservations.id AND p.status='Verified') AS payment_verified FROM reservations WHERE id=? AND (user_id=? OR ?=1)", [id, req.uid, req.admin ? 1 : 0]) : [[]];
  if (!r) return out(false, 'Access denied', 'Reservation not found.');
  if (r.status !== 'Confirmed' || !r.payment_verified) return out(false, 'Payment not verified', 'Finance must verify payment before this reservation can be used.');
  const now = Date.now(), open = dt(r.date, r.time).getTime() - 30 * 60000, end = dt(r.date, '23:59').getTime() + 59999;
  if (now < open) return out(false, 'Too early', `Slot ${r.slot_no} opens 30 minutes before ${ft(r.time)} on ${fd(r.date)}.`);
  if (now > end) return out(false, 'Reservation expired', 'The date of this reservation has passed.');
  const stored = r.stored ? 0 : 1;
  await pool.query('UPDATE reservations SET stored=? WHERE id=?', [stored, id]);
  await pool.query('INSERT INTO access_log (reservation_id,user_id,slot_no,action,ts) VALUES (?,?,?,?,?)', [id, r.user_id, r.slot_no, stored ? 'Stored' : 'Retrieved', now]);
  out(true, 'Cabinet unlocked', `Slot ${r.slot_no}: ${stored ? 'store' : 'retrieve'} your helmet safely.`);
}));

/* ---------- profile ---------- */
app.put('/api/me', auth, nonFinance, wrap(async (req, res) => {
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

app.put('/api/me/photo', auth, nonFinance, wrap(async (req, res) => {
  await pool.query('UPDATE users SET photo=? WHERE id=?', [String(req.body.photo || '') || null, req.uid]);
  res.json({ ok: true });
}));

app.put('/api/me/password', auth, nonFinance, wrap(async (req, res) => {
  const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.uid]);
  if (!(await bcrypt.compare(String(req.body.current || ''), u.password_hash))) return bad(res, 'Current password is incorrect.');
  if (String(req.body.next || '').length < 8) return bad(res, 'New password must be at least 8 characters.');
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(String(req.body.next), 10), req.uid]);
  res.json({ ok: true });
}));

app.delete('/api/me', auth, nonFinance, wrap(async (req, res) => {
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
  const [[user]] = await pool.query('SELECT id, is_admin, is_finance FROM users WHERE id=?', [userId]);
  if (!user) return bad(res, 'User not found.', 404);
  if (user.is_admin) return bad(res, 'Administrator accounts cannot be assigned the Finance role.', 409);
  if (!!user.is_finance === req.body.finance) return bad(res, 'This account already has the requested role status.', 409);
  const [updated] = await pool.query('UPDATE users SET is_finance=? WHERE id=? AND is_admin=0 AND is_finance<>?', [req.body.finance ? 1 : 0, userId, req.body.finance ? 1 : 0]);
  if (!updated.affectedRows) return bad(res, 'This account role has already changed. Refresh and try again.', 409);
  res.json({ ok: true, finance: req.body.finance });
}));

app.listen(PORT, '0.0.0.0', () => console.log(`SHSRS API running on http://localhost:${PORT}`));
