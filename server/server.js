// SHSRS API — Express + MySQL/MariaDB
const { verifyIdentityQrSubmission } = require('./studentQr');
const { createCabinetQr, parseCabinetQr, verifyCabinetQrSignature } = require('./cabinetQr');
const { isValidGcashTransactionReference } = require('./refundReference');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const webpush = require('web-push');
const nodemailer = require('nodemailer');
const { MAX_RECEIPT_BYTES, validateReceiptImage } = require('./receiptImage');
const { calculateSchedule, timeMinutes } = require('./reservationSchedule');
// Load server/.env
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const DEVICE_ID = process.env.ESP32_DEVICE_ID || 'cabinet-esp32-01';
const DEVICE_TOKEN = process.env.ESP32_DEVICE_TOKEN || '';
const ALLOW_SCAN_WITHOUT_ESP32 = String(process.env.ALLOW_SCAN_WITHOUT_ESP32 || '').toLowerCase() === 'true';
const QR_SECRET = process.env.QR_SECRET || SECRET;
const SERVO_UNLOCK_MS = 1500;
const WEB_PUSH_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY || '';
const WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY || '';
const WEB_PUSH_SUBJECT = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@shsrs.local';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const mailTransport = SMTP_HOST && SMTP_FROM && Number.isInteger(SMTP_PORT) && SMTP_PORT > 0
  && Boolean(SMTP_USER) === Boolean(SMTP_PASS)
  ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  })
  : null;

if (WEB_PUSH_PUBLIC_KEY && WEB_PUSH_PRIVATE_KEY) {
  webpush.setVapidDetails(WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY);
}
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
const uploadDir = path.join(__dirname, 'uploads', 'receipts');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT_BYTES },
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const resetCodeHash = (userId, code) => crypto.createHmac('sha256', SECRET).update(`${userId}:${code}`).digest('hex');
const dt = (d, t) => { const [y, m, da] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return new Date(y, m - 1, da, h, mi); };
const fd = (d) => { const [y, m, da] = d.split('-').map(Number); return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${da}, ${y}`; };
const ft = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const receiptUrl = (req, value) => {
  if (!value) return '';
  if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${req.protocol}://${req.get('host')}${value}`;
  return value;
};

const auth = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  let claims;
  try { claims = jwt.verify(h.replace('Bearer ', ''), SECRET); } catch (e) { return bad(res, 'Please log in again.', 401); }
  const [[u]] = await pool.query('SELECT id, is_admin, is_finance, is_security, must_change_password, session_version FROM users WHERE id=?', [claims.uid]);
  if (!u) return bad(res, 'Please log in again.', 401);
  if (Number(claims.sv || 0) !== Number(u.session_version || 0)) return bad(res, 'Please log in again.', 401);
  req.uid = u.id; req.admin = !!u.is_admin; req.finance = !!u.is_finance; req.security = !!u.is_security;
  req.mustChangePassword = !!u.must_change_password;
  if (req.mustChangePassword && !(req.method === 'PUT' && req.path === '/api/me/password')) {
    return bad(res, 'Choose a new password before continuing.', 403);
  }
  next();
});
const deviceAuth = (req, res, next) => {
  const supplied = String(req.headers['x-device-token'] || '');

  if (
    !DEVICE_TOKEN ||
    supplied.length !== DEVICE_TOKEN.length ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(DEVICE_TOKEN) ||
    !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(DEVICE_TOKEN))
  ) {
    return bad(res, 'ESP32 device authentication failed.', 401);
  }

  if (String(req.headers['x-device-id'] || '') !== DEVICE_ID) {
    return bad(res, 'Unknown ESP32 device.', 403);
  }

  next();
};
const adminOnly = (req, res, next) => (req.admin && !req.finance && !req.security ? next() : bad(res, 'Admins only.', 403));
const financeOnly = (req, res, next) => (req.finance && !req.admin && !req.security ? next() : bad(res, 'Finance access only.', 403));
const financeOrAdmin = (req, res, next) => ((req.finance && !req.admin && !req.security) || (req.admin && !req.finance && !req.security) ? next() : bad(res, 'Finance or Admin access only.', 403));
const riderOrAdmin = (req, res, next) => (!req.finance && !req.security ? next() : bad(res, 'This feature is not available to your account role.', 403));
const scannerAccess = (req, res, next) => (req.admin || req.security ? next() : bad(res, 'Security or Admin access only.', 403));
const token = (uid, sessionVersion = 0) => jwt.sign({ uid, sv: sessionVersion }, SECRET, { expiresIn: '30d' });

const hashPushToken = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const removePushTokensByHashes = async (hashes) => {
  const list = [...new Set((hashes || []).filter(Boolean))];
  if (!list.length) return;
  await pool.query('DELETE FROM push_tokens WHERE token_hash IN (?)', [list]);
};

const sendExpoPushMessages = async (messages) => {
  const valid = (messages || []).filter((m) => m && m.to);
  if (!valid.length) return;
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(valid),
  });
  const json = await response.json().catch(() => ({}));
  const tickets = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
  const staleHashes = [];
  tickets.forEach((ticket, index) => {
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      const hash = valid[index]?.__tokenHash;
      if (hash) staleHashes.push(hash);
    }
  });
  if (staleHashes.length) await removePushTokensByHashes(staleHashes);
};

const sendWebPushMessage = async (tokenRow, payload) => {
  if (!WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY) return;
  let subscription;
  try { subscription = JSON.parse(tokenRow.token); } catch (_e) { return; }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await removePushTokensByHashes([tokenRow.token_hash]);
      return;
    }
    throw error;
  }
};

const dispatchPushNotification = async ({ eventKey, userId, title, message, type, reservationId = null, refundId = null }) => {
  try {
    if (eventKey) {
      const [[exists]] = await pool.query('SELECT id FROM notifications WHERE event_key=? LIMIT 1', [eventKey]);
      if (!exists) return;
    }
    const [tokens] = await pool.query(
      'SELECT id,platform,token,token_hash FROM push_tokens WHERE user_id=?',
      [userId],
    );
    if (!tokens.length) return;
    const data = {
      eventKey: eventKey || '',
      type: type || '',
      reservationId: reservationId == null ? '' : String(reservationId),
      refundId: refundId == null ? '' : String(refundId),
    };
    const expoMessages = [];
    const webJobs = [];
    for (const row of tokens) {
      if (row.platform === 'expo') {
        expoMessages.push({
          to: row.token,
          sound: 'default',
          title,
          body: message,
          data,
          channelId: 'default',
          __tokenHash: row.token_hash,
        });
      } else if (row.platform === 'web') {
        webJobs.push(sendWebPushMessage(row, { title, body: message, data }));
      }
    }
    if (expoMessages.length) await sendExpoPushMessages(expoMessages);
    if (webJobs.length) {
      const results = await Promise.allSettled(webJobs);
      results.forEach((result) => {
        if (result.status === 'rejected') console.error('Web push dispatch failed:', result.reason?.message || result.reason);
      });
    }
  } catch (error) {
    console.error('Push dispatch failed:', error?.message || error);
  }
};

const createNotification = async (connection, { eventKey, userId, title, message, type, reservationId = null, refundId = null }) => {
  if (!eventKey) throw new Error('Notification event key is required.');
  const [result] = await connection.query(
    `INSERT IGNORE INTO notifications
     (event_key,user_id,title,message,type,reservation_id,refund_id)
     VALUES (?,?,?,?,?,?,?)`,
    [eventKey, userId, title, message, type, reservationId, refundId],
  );
  if (result.affectedRows > 0) {
    setTimeout(() => {
      dispatchPushNotification({ eventKey, userId, title, message, type, reservationId, refundId }).catch((error) => {
        console.error('Push dispatch failed:', error?.message || error);
      });
    }, 1000);
  }
  return result.affectedRows > 0;
};

const processReservationAutomation = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [expired] = await connection.query(
      `SELECT r.id,r.user_id,r.slot_no,r.res_date,r.res_time,r.grace_deadline,r.total_price,
              r.stored,r.status,
              COALESCE(
                (SELECT p.amount FROM payments p WHERE p.reservation_id=r.id AND p.status='Verified' ORDER BY p.id DESC LIMIT 1),
                r.total_price
              ) AS original_amount
       FROM reservations r
       WHERE r.status IN ('Confirmed','Active')
         AND r.grace_deadline IS NOT NULL
         AND r.grace_deadline <= NOW()
       FOR UPDATE`,
    );
    for (const r of expired) {
      const [updated] = await connection.query("UPDATE reservations SET status='Expired' WHERE id=? AND status IN ('Confirmed','Active')", [r.id]);
      if (!updated.affectedRows) continue;
      await createNotification(connection, {
        eventKey: `reservation:${r.id}:expired`,
        userId: r.user_id,
        title: 'Reservation expired',
        message: r.stored
          ? `Reservation #${r.id} for locker ${r.slot_no} expired after the 10-minute grace period. Your stored helmet remains secured in the locker. You may request an extension to retrieve it.`
          : `Reservation #${r.id} for locker ${r.slot_no} expired because helmet storage was not recorded within the 10-minute grace period.`,
        type: 'RESERVATION_EXPIRED',
        reservationId: r.id,
      });
      if (r.stored) continue;
      const original = Number(r.original_amount || r.total_price || 0);
      const refundAmount = original * 0.5;
      const [insert] = await connection.query(
        `INSERT IGNORE INTO refunds
         (reservation_id,user_id,original_payment_amount,refund_percentage,refund_amount,
          non_refundable_amount,status,expiration_timestamp)
         VALUES (?,?,?,50.00,?,?, 'PENDING',NOW())`,
        [r.id, r.user_id, original, refundAmount, original - refundAmount],
      );
      if (insert.affectedRows) {
        await createNotification(connection, {
          eventKey: `refund:${insert.insertId}:pending`,
          userId: r.user_id,
          title: 'Refund request created',
          message: `Reservation #${r.id} for locker ${r.slot_no} expired without helmet storage. A 50% refund request is now pending Finance review.`,
          type: 'REFUND_STATUS',
          reservationId: r.id,
          refundId: insert.insertId,
        });
      }
    }

    const [timed] = await connection.query(
      `SELECT r.id,r.user_id,r.slot_no,r.res_date,r.res_time,r.end_time,r.status
       FROM reservations r
       WHERE r.status IN ('Confirmed','Active')
         AND EXISTS (SELECT 1 FROM payments p WHERE p.reservation_id=r.id AND p.status='Verified')
       ORDER BY r.id`,
    );
    for (const r of timed) {
      const start = dt(String(r.res_date).slice(0, 10), String(r.res_time).slice(0, 5)).getTime();
      const endTime = r.end_time || '21:00';
      const end = dt(String(r.res_date).slice(0, 10), String(endTime).slice(0, 5)).getTime();
      const now = Date.now();
      if (start - now <= 10 * 60000 && start > now) {
        const minutesRemaining = Math.ceil((start - now) / 60000);
        await createNotification(connection, {
          eventKey: `reservation:${r.id}:starting-reminder`,
          userId: r.user_id,
          title: `Reservation starting in ${minutesRemaining} minutes`,
          message: `Reservation #${r.id} for locker ${r.slot_no} starts in about ${minutesRemaining} minutes. Please prepare your QR code and arrive on time.`,
          type: 'RESERVATION_STARTING',
          reservationId: r.id,
        });
      }
      if (start <= now && start > now - 10 * 60000) {
        await createNotification(connection, {
          eventKey: `reservation:${r.id}:started`,
          userId: r.user_id,
          title: 'Reservation has started',
          message: `Reservation #${r.id} for locker ${r.slot_no} has reached its scheduled starting time.`,
          type: 'RESERVATION_STARTED',
          reservationId: r.id,
        });
      }
      if (end - now <= 10 * 60000 && end > now) {
        const minutesRemaining = Math.ceil((end - now) / 60000);
        await createNotification(connection, {
          eventKey: `reservation:${r.id}:ending-reminder`,
          userId: r.user_id,
          title: `Reservation ending in ${minutesRemaining} minutes`,
          message: `Reservation #${r.id} for locker ${r.slot_no} ends in about ${minutesRemaining} minutes. Please complete your locker activities before the reservation ends.`,
          type: 'RESERVATION_ENDING',
          reservationId: r.id,
        });
      }
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    console.error('Reservation automation failed:', e);
  } finally {
    connection.release();
  }
};

app.get('/api/health', wrap(async (req, res) => {
  await pool.query('SELECT 1 FROM slots LIMIT 1');   // proves MySQL is up AND schema.sql was imported
  await pool.query('SELECT 1 FROM esp32_commands LIMIT 1'); // server feature table from migration 005
  res.json({ ok: true, db: 'connected' });
}));

/* ---------- auth ---------- */
app.post('/api/register', wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = verifyIdentityQrSubmission(body);
  if (parsed.error) {
    const errors = {
      invalid: 'Invalid or unsupported USTP ID QR code.',
      memberId: 'The QR code must contain a 10-digit student ID or 7-digit faculty ID.',
      name: 'The QR code is missing the cardholder name.',
      affiliation: 'The QR code is missing the course/program or faculty position/address.',
      mismatch: 'The submitted identity details do not match the scanned QR code.',
    };
    return bad(res, errors[parsed.error]);
  }
  const { name, memberId, memberType, affiliation } = parsed.identity;
  const email = String(body.email || '').trim().toLowerCase(), pw = String(body.password || '');
  if (!name) return bad(res, 'Please enter your name.');
  if (!okMail(email)) return bad(res, 'Please enter a valid email address.');
  if (pw.length < 8) return bad(res, 'Password must be at least 8 characters.');
  const phone = String(body.phone || '').trim();
  if (!okPhone(phone)) return bad(res, 'Please enter a valid phone number.');
  const [[existingMember]] = await pool.query('SELECT id FROM users WHERE student_id=?', [memberId]);
  if (existingMember) return bad(res, 'This USTP ID is already registered.', 409);
  const [[existingEmail]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (existingEmail) return bad(res, 'That email is already registered.', 409);
  let r;
  try {
    [r] = await pool.query(
      'INSERT INTO users (name,email,password_hash,phone,student_id,member_type,course,is_admin) VALUES (?,?,?,?,?,?,?,0)',
      [name, email, await bcrypt.hash(pw, 10), phone, memberId, memberType, affiliation],
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw e;
    const [[duplicateEmail]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (duplicateEmail) return bad(res, 'That email is already registered.', 409);
    const [[duplicateMember]] = await pool.query('SELECT id FROM users WHERE student_id=?', [memberId]);
    if (duplicateMember) return bad(res, 'This USTP ID is already registered.', 409);
    throw e;
  }
  res.json({ token: token(r.insertId) });
}));

app.post('/api/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const [[u]] = await pool.query('SELECT id, password_hash, must_change_password, session_version FROM users WHERE email=?', [email]);
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return bad(res, 'Incorrect email or password.', 401);
  res.json({ token: token(u.id, Number(u.session_version || 0)), mustChangePassword: !!u.must_change_password });
}));

app.post('/api/password-reset-requests', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!okMail(email) || email.length > 150) return bad(res, 'Enter a valid email address.');
  if (!mailTransport) return bad(res, 'Email verification is not configured. Please contact an administrator.', 503);

  const [[user]] = await pool.query(
    'SELECT id,email FROM users WHERE email=? AND is_admin=0 AND is_finance=0 AND is_security=0',
    [email],
  );
  const genericResponse = { message: 'If a rider account uses that email, a verification code has been sent.' };
  if (!user) return res.json(genericResponse);

  const connection = await pool.getConnection();
  let resetId;
  let code;
  try {
    await connection.beginTransaction();
    const [[lockedUser]] = await connection.query(
      'SELECT id,email FROM users WHERE id=? AND is_admin=0 AND is_finance=0 AND is_security=0 FOR UPDATE',
      [user.id],
    );
    if (!lockedUser) {
      await connection.rollback();
      return res.json(genericResponse);
    }

    const [[recentRequests]] = await connection.query(
      'SELECT COUNT(*) AS count FROM password_reset_requests WHERE user_id=? AND created_at>=DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [user.id],
    );
    if (Number(recentRequests.count) >= 3) {
      await connection.rollback();
      return res.json(genericResponse);
    }

    await connection.query(
      "UPDATE password_reset_requests SET status='Expired' WHERE user_id=? AND status='Pending'",
      [user.id],
    );
    code = String(crypto.randomInt(100000, 1000000));
    const [insert] = await connection.query(
      "INSERT INTO password_reset_requests (user_id,token_hash,status,expires_at,attempt_count) VALUES (?,?,'Pending',DATE_ADD(NOW(),INTERVAL 15 MINUTE),0)",
      [user.id, resetCodeHash(user.id, code)],
    );
    resetId = insert.insertId;
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await mailTransport.sendMail({
      from: SMTP_FROM,
      to: user.email,
      subject: 'HelMate password reset code',
      text: `Your HelMate password reset code is ${code}. It expires in 15 minutes. If you did not request this, you can ignore this email.`,
    });
  } catch (error) {
    await pool.query(
      "UPDATE password_reset_requests SET status='Expired' WHERE id=? AND status='Pending'",
      [resetId],
    );
    console.error('[password-reset] Email delivery failed', {
      code: error.code,
      responseCode: error.responseCode,
    });
    return bad(res, 'Unable to send a verification email right now. Please try again later.', 503);
  }
  res.json(genericResponse);
}));

app.put('/api/password-reset-requests/password', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const nextPassword = String(req.body.next || '');
  if (!okMail(email) || email.length > 150) return bad(res, 'Enter a valid email address.');
  if (!/^\d{6}$/.test(code)) return bad(res, 'Enter the 6-digit verification code.');
  if (nextPassword.length < 8) return bad(res, 'New password must be at least 8 characters.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.query(
      'SELECT id FROM users WHERE email=? AND is_admin=0 AND is_finance=0 AND is_security=0 FOR UPDATE',
      [email],
    );
    if (!user) {
      await connection.rollback();
      return bad(res, 'The verification code is incorrect or expired.', 400);
    }

    const [[resetRequest]] = await connection.query(
      "SELECT id,token_hash,attempt_count,expires_at<=NOW() AS expired FROM password_reset_requests WHERE user_id=? AND status='Pending' ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [user.id],
    );
    if (!resetRequest || resetRequest.expired) {
      if (resetRequest) {
        await connection.query("UPDATE password_reset_requests SET status='Expired' WHERE id=?", [resetRequest.id]);
        await connection.commit();
      } else {
        await connection.rollback();
      }
      return bad(res, 'The verification code is incorrect or expired.', 400);
    }

    const expectedHash = Buffer.from(resetCodeHash(user.id, code), 'hex');
    const storedHash = Buffer.from(resetRequest.token_hash, 'hex');
    const validCode = storedHash.length === expectedHash.length && crypto.timingSafeEqual(storedHash, expectedHash);
    if (!validCode) {
      const attempts = Number(resetRequest.attempt_count) + 1;
      await connection.query(
        "UPDATE password_reset_requests SET attempt_count=?,status=IF(? >= 5,'Expired','Pending') WHERE id=?",
        [attempts, attempts, resetRequest.id],
      );
      await connection.commit();
      return bad(res, 'The verification code is incorrect or expired.', 400);
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10);
    await connection.query(
      'UPDATE users SET password_hash=?,must_change_password=0,session_version=session_version+1 WHERE id=?',
      [passwordHash, user.id],
    );
    await connection.query(
      "UPDATE password_reset_requests SET status='Completed',completed_at=NOW() WHERE id=?",
      [resetRequest.id],
    );
    await connection.query(
      "UPDATE password_reset_requests SET status='Expired' WHERE user_id=? AND status='Pending'",
      [user.id],
    );
    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

/* ---------- everything the app needs in one call ---------- */
app.get('/api/data', auth, wrap(async (req, res) => {
  await processReservationAutomation();
  if (req.finance || req.security) {
    const [[user]] = await pool.query('SELECT id, name, email, photo, phone, is_admin, is_finance, is_security FROM users WHERE id=?', [req.uid]);
    const currentUser = {
      id: user.id, name: user.name, email: user.email, admin: !!user.is_admin, finance: !!user.is_finance, security: !!user.is_security,
      photo: user.photo || '', phone: user.phone || '',
    };
    if (req.finance) return res.json({ me: req.uid, users: [currentUser], res: [], slotReservations: [], slots: [], blocked: [], log: [], payments: [] });

    const [slotRows] = await pool.query('SELECT slot_no AS slot, is_blocked AS blocked FROM slots ORDER BY slot_no');
    const [slotReservations] = await pool.query('SELECT slot_no AS slot, res_date AS date, LEFT(res_time,5) AS time, status FROM reservations ORDER BY res_date, res_time');
    const [log] = await pool.query("SELECT id,reservation_id AS rid, slot_no AS slot, action AS act, ts FROM access_log WHERE action IN ('Stored','Retrieved') ORDER BY id DESC LIMIT 50");
    const slots = slotRows.map((slot) => ({ ...slot, blocked: !!slot.blocked }));
    return res.json({
      me: req.uid, users: [currentUser], res: [],
      slotReservations,
      slots, blocked: slots.filter((slot) => slot.blocked).map((slot) => slot.slot),
      log: log.map((entry) => ({ ...entry, ts: Number(entry.ts) })), payments: [],
    });
  }
  const [users] = await pool.query('SELECT id, name, email, photo, phone, member_type, is_admin, is_finance, is_security FROM users ORDER BY id');
  const list = users.filter((u) => req.admin || u.id === req.uid).map((u) => ({
    id: u.id, name: u.name, email: u.email, admin: !!u.is_admin, finance: !!u.is_finance, security: !!u.is_security,
    memberType: u.member_type || 'Student',
    photo: u.id === req.uid ? u.photo || '' : '', phone: u.id === req.uid ? u.phone || '' : '',
  }));
  const [res1] = req.admin
    ? await pool.query("SELECT id,user_id AS uid,slot_no AS slot,res_date AS date,LEFT(res_time,5) AS time,LEFT(end_time,5) AS endTime,duration_minutes AS durationMinutes,is_whole_day AS wholeDay,total_price AS totalPrice,stored,actual_storage_ts AS actualStorageTs,grace_deadline AS graceDeadline,status FROM reservations ORDER BY res_date,res_time")
    : await pool.query("SELECT id,user_id AS uid,slot_no AS slot,res_date AS date,LEFT(res_time,5) AS time,LEFT(end_time,5) AS endTime,duration_minutes AS durationMinutes,is_whole_day AS wholeDay,total_price AS totalPrice,stored,actual_storage_ts AS actualStorageTs,grace_deadline AS graceDeadline,status FROM reservations WHERE user_id=? ORDER BY id DESC", [req.uid]);
  const [slotReservations] = await pool.query('SELECT slot_no AS slot,res_date AS date,LEFT(res_time,5) AS time,LEFT(end_time,5) AS endTime,status,stored FROM reservations WHERE status NOT IN (\'Cancelled\',\'Used\') AND (status <> \'Expired\' OR stored = 1) ORDER BY res_date,res_time');
  const [slotRows] = await pool.query('SELECT slot_no AS slot, is_blocked AS blocked FROM slots ORDER BY slot_no');
  const slots = slotRows.map((slot) => ({ ...slot, blocked: !!slot.blocked }));
  const blocked = slots.filter((slot) => slot.blocked).map((slot) => slot.slot);
  const [log] = req.admin
    ? await pool.query("SELECT id,reservation_id AS rid,user_id AS uid,slot_no AS slot,action AS act,ts FROM access_log WHERE action IN ('Stored','Retrieved') ORDER BY id DESC")
    : await pool.query("SELECT id,reservation_id AS rid,user_id AS uid,slot_no AS slot,action AS act,ts FROM access_log WHERE user_id=? AND action IN ('Stored','Retrieved') ORDER BY id DESC", [req.uid]);
  const [payments] = await pool.query('SELECT id,reservation_id AS reservationId,amount,status,rejection_reason AS rejectionReason,submitted_at AS submittedAt,processed_at AS processedAt FROM payments WHERE user_id=? ORDER BY submitted_at DESC', [req.uid]);
  const [notifications] = await pool.query(
    'SELECT id,title,message,type,reservation_id AS reservationId,refund_id AS refundId,created_at AS createdAt,is_read AS isRead FROM notifications WHERE user_id=? ORDER BY created_at DESC,id DESC',
    [req.uid],
  );
  const [reservationExtensions] = await pool.query(
    `SELECT e.id,e.reservation_id AS reservationId,e.additional_minutes AS additionalMinutes,
            e.additional_fee AS additionalFee,e.status,e.rejection_reason AS rejectionReason,
            LEFT(e.previous_end_time,5) AS previousEndTime,LEFT(e.approved_end_time,5) AS approvedEndTime,
            e.payment_id AS paymentId,e.created_at AS createdAt,e.processed_at AS processedAt
     FROM reservation_extensions e
     WHERE e.user_id=? ORDER BY e.created_at DESC`,
    [req.uid],
  );
  const [[notificationCounts]] = await pool.query(
    'SELECT COUNT(*) AS unread FROM notifications WHERE user_id=? AND is_read=0',
    [req.uid],
  );
  res.json({
    me: req.uid, users: list,
    res: res1.map((r) => ({ ...r, stored: !!r.stored })),
    slotReservations,
    slots, blocked,
    log: log.map((l) => ({ ...l, ts: Number(l.ts) })),
    payments,
    reservationExtensions,
    notifications: notifications.map((n) => ({ ...n, isRead: !!n.isRead })),
    unreadNotificationCount: Number(notificationCounts.unread),
  });
}));

/* ---------- student payment submission ---------- */
app.post('/api/reservations/:id/payments', auth, riderOrAdmin, upload.single('receipt'), wrap(async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(reservationId) || reservationId < 1) return bad(res, 'Reservation not found.', 404);

  let imageBuffer = req.file && req.file.buffer;
  if (!imageBuffer) {
    const dataUrl = String(req.body.receipt || '');
    const match = dataUrl.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]*={0,2})$/i);
    if (!match) return bad(res, 'Upload a valid image file.');
    if (match[1].length > Math.ceil(MAX_RECEIPT_BYTES / 3) * 4) {
      return bad(res, 'The image must be 5 MB or smaller.', 413);
    }
    imageBuffer = Buffer.from(match[1], 'base64');
  }

  let image;
  try {
    image = await validateReceiptImage(imageBuffer);
  } catch (e) {
    const validationMessages = [
      'The image must be 5 MB or smaller.',
      'Choose a non-empty image file.',
      'The file is not a supported image.',
      'The image file is corrupted or unsupported.',
      'This BMP encoding is not supported. Please convert it to JPG or PNG.',
      'Animated GIF receipts are not supported. Choose a static image.',
      'The image dimensions are too large to process.',
    ];
    if (validationMessages.includes(e.message)) {
      return bad(res, e.message, e.message === 'The image must be 5 MB or smaller.' ? 413 : 400);
    }
    return bad(res, 'The image file is corrupted or unsupported.');
  }

  const connection = await pool.getConnection();
  let storedPath;
  try {
    await connection.beginTransaction();
    const [[reservation]] = await connection.query('SELECT id,status,total_price,slot_no FROM reservations WHERE id=? AND user_id=? FOR UPDATE', [reservationId, req.uid]);
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
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${image.extension}`;
    storedPath = path.join(uploadDir, filename);
    await fs.promises.mkdir(uploadDir, { recursive: true });
    await fs.promises.writeFile(storedPath, image.buffer, { flag: 'wx' });
    const receipt = `/uploads/receipts/${filename}`;
    const [payment] = await connection.query(
      'INSERT INTO payments (reservation_id,user_id,amount,receipt) VALUES (?,?,?,?)',
      [reservationId, req.uid, reservation.total_price, receipt],
    );
    await createNotification(connection, {
      eventKey: `payment:${payment.insertId}:submitted`,
      userId: req.uid,
      title: 'Payment submitted',
      message: `Your payment proof for reservation #${reservationId} at locker ${reservation.slot_no} was submitted and is awaiting Finance verification.`,
      type: 'PAYMENT_SUBMITTED',
      reservationId,
    });
    const [financeUsers] = await connection.query('SELECT id FROM users WHERE is_finance=1');
    for (const financeUser of financeUsers) {
      await createNotification(connection, {
        eventKey: `finance:payment:${payment.insertId}:pending:${financeUser.id}`,
        userId: financeUser.id,
        title: 'Payment verification required',
        message: `A rider submitted payment proof for reservation #${reservationId} at locker ${reservation.slot_no}.`,
        type: 'PAYMENT_PENDING_FINANCE',
        reservationId,
      });
    }
    await connection.commit();
    storedPath = null;
    res.json({ id: payment.insertId, status: 'Pending', receipt: receiptUrl(req, receipt) });
  } catch (e) {
    await connection.rollback();
    if (storedPath) {
      try { await fs.promises.unlink(storedPath); }
      catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') console.error('Could not remove unreferenced receipt image:', cleanupError);
      }
    }
    throw e;
  } finally {
    connection.release();
  }
}));

/* ---------- finance payment review ---------- */
app.get('/api/finance/payments', auth, financeOnly, wrap(async (req, res) => {
  const [payments] = await pool.query(
    "SELECT p.id, p.reservation_id AS reservationId, p.user_id AS studentId, u.name AS studentName, r.slot_no AS slot, r.res_date AS date, LEFT(r.res_time,5) AS time, p.amount, p.status, p.submitted_at AS submittedAt FROM payments p JOIN users u ON u.id=p.user_id JOIN reservations r ON r.id=p.reservation_id WHERE p.status='Pending' AND p.payment_type='Original' AND r.status='Pending' ORDER BY p.submitted_at ASC",
  );
  res.json({ payments });
}));

app.get('/api/finance/payments/:id/receipt', auth, financeOnly, wrap(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  const [[payment]] = Number.isInteger(paymentId)
    ? await pool.query("SELECT receipt FROM payments WHERE id=? AND status='Pending'", [paymentId])
    : [[]];
  if (!payment) return bad(res, 'Pending payment receipt not found.', 404);
  res.json({ receipt: receiptUrl(req, payment.receipt) });
}));

app.get('/api/finance/payment-history', auth, financeOrAdmin, wrap(async (req, res) => {
  const includePending = req.admin && req.query.includePending === '1';
  const statusFilter = includePending ? "p.status IN ('Pending','Verified','Rejected')" : "p.status IN ('Verified','Rejected')";
  const [payments] = await pool.query(
    `SELECT p.id, p.reservation_id AS reservationId, p.user_id AS studentId, u.name AS studentName,
            r.slot_no AS slot, r.res_date AS date, LEFT(r.res_time,5) AS time,
            p.amount, p.status, p.payment_type AS paymentType,p.extension_id AS extensionId,
            e.additional_minutes AS additionalMinutes,p.submitted_at AS submittedAt,p.processed_at AS processedAt
     FROM payments p
     JOIN users u ON u.id=p.user_id
     JOIN reservations r ON r.id=p.reservation_id
     LEFT JOIN reservation_extensions e ON e.payment_id=p.id
     WHERE ${statusFilter}
     ORDER BY COALESCE(p.processed_at,p.submitted_at) DESC`,
  );
  res.json({ payments });
}));

const decidePayment = (status) => wrap(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (!Number.isInteger(paymentId) || paymentId < 1) return bad(res, 'Payment not found.', 404);
  const rejectionReason = String(req.body.reason || '').trim();
  if (status === 'Rejected' && !rejectionReason) return bad(res, 'A rejection reason is required.', 400);
  if (status === 'Rejected' && rejectionReason.length > 350) return bad(res, 'The rejection reason must be 350 characters or fewer.', 400);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[payment]] = await connection.query(
      `SELECT p.id,p.reservation_id AS reservationId,p.user_id AS userId,p.status,p.payment_type AS paymentType,p.extension_id AS extensionId,r.slot_no AS slot,
              LEFT(r.end_time,5) AS endTime,r.res_date AS date,r.stored
       FROM payments p JOIN reservations r ON r.id=p.reservation_id WHERE p.id=? FOR UPDATE`,
      [paymentId],
    );
    if (!payment) {
      await connection.rollback();
      return bad(res, 'Payment not found.', 404);
    }
    if (payment.status !== 'Pending') {
      await connection.rollback();
      return bad(res, 'This payment has already been processed.', 409);
    }
    await connection.query(
      'UPDATE payments SET status=?,rejection_reason=?,processed_at=CURRENT_TIMESTAMP,processed_by=? WHERE id=?',
      [status, status === 'Rejected' ? rejectionReason : null, req.uid, paymentId],
    );
    if (status === 'Verified' && payment.paymentType === 'Extension') {
      const [[extension]] = await connection.query(
        'SELECT id,status,additional_minutes,additional_fee,reservation_id AS reservationId FROM reservation_extensions WHERE id=? AND reservation_id=? FOR UPDATE',
        [payment.extensionId, payment.reservationId],
      );
      if (!extension || extension.status !== 'Pending') {
        await connection.rollback();
        return bad(res, 'This extension has already been processed or does not exist.', 409);
      }
      const [[reserved]] = await connection.query(
        'SELECT res_date AS date,LEFT(end_time,5) AS endTime,duration_minutes AS durationMinutes,total_price AS totalPrice,stored FROM reservations WHERE id=? FOR UPDATE',
        [payment.reservationId],
      );
      const start = timeMinutes(reserved.endTime);
      const approvedMinutes = start + Number(extension.additional_minutes);
      if (approvedMinutes > 1260) {
        await connection.rollback();
        return bad(res, 'The approved extension would end after 9:00 PM.', 409);
      }
      const [[overlap]] = await connection.query(
        `SELECT id FROM reservations
         WHERE slot_no=? AND res_date=? AND id<>? AND status NOT IN ('Cancelled','Used')
           AND (status <> 'Expired' OR stored = 1)
           AND TIME_TO_SEC(res_time) < ?
           AND CASE WHEN status='Expired' AND stored=1 THEN TIME_TO_SEC('21:00:00') ELSE TIME_TO_SEC(COALESCE(end_time,'21:00:00')) END > ?
         LIMIT 1`,
        [payment.slot, payment.date, payment.reservationId, approvedMinutes * 60, start * 60],
      );
      if (overlap) {
        await connection.rollback();
        return bad(res, 'The extension conflicts with another reservation and cannot be approved.', 409);
      }
      const approvedEnd = `${String(Math.floor(approvedMinutes / 60)).padStart(2,'0')}:${String(approvedMinutes % 60).padStart(2,'0')}`;
      await connection.query(
        `UPDATE reservations
         SET end_time=?,duration_minutes=COALESCE(duration_minutes,0)+?,total_price=COALESCE(total_price,0)+?,
             grace_deadline=CASE
               WHEN stored=1 THEN GREATEST(TIMESTAMP(res_date,ADDTIME(?, '00:10:00')), DATE_ADD(NOW(), INTERVAL 10 MINUTE))
               ELSE TIMESTAMP(res_date,ADDTIME(?, '00:10:00'))
             END,
             status=CASE WHEN stored=1 THEN 'Active' ELSE 'Confirmed' END
         WHERE id=?`,
        [approvedEnd + ':00', extension.additional_minutes, extension.additional_fee, approvedEnd + ':00', approvedEnd + ':00', payment.reservationId],
      );
      await connection.query(
        "UPDATE reservation_extensions SET status='Approved',processed_by=?,processed_at=CURRENT_TIMESTAMP,approved_end_time=? WHERE id=?",
        [req.uid, approvedEnd + ':00', extension.id],
      );
      await connection.query('UPDATE payments SET extension_id=? WHERE id=?', [extension.id, payment.id]);
      await createNotification(connection, {
        eventKey: `extension:${extension.id}:approved`,
        userId: payment.userId,
        title: 'Reservation extension approved',
        message: `Your ${extension.additional_minutes}-minute extension for reservation #${payment.reservationId} was approved. The reservation now ends at ${ft(approvedEnd)}.`,
        type: 'EXTENSION_APPROVED',
        reservationId: payment.reservationId,
      });
    } else if (status === 'Verified') {
      await connection.query("UPDATE reservations SET status='Confirmed' WHERE id=? AND status NOT IN ('Cancelled','Expired')", [payment.reservationId]);
      await createNotification(connection, {
        eventKey: `payment:${payment.id}:verified`,
        userId: payment.userId,
        title: 'Payment verified',
        message: `Payment for reservation #${payment.reservationId} at locker ${payment.slot} has been verified. Your QR code is now available.`,
        type: 'PAYMENT_VERIFIED',
        reservationId: payment.reservationId,
      });
      await createNotification(connection, {
        eventKey: `reservation:${payment.reservationId}:qr-available`,
        userId: payment.userId,
        title: 'Reservation QR code available',
        message: `The QR code for reservation #${payment.reservationId} at locker ${payment.slot} is available after Finance verification.`,
        type: 'QR_AVAILABLE',
        reservationId: payment.reservationId,
      });
    } else if (payment.paymentType === 'Extension') {
      const [[extension]] = await connection.query(
        'SELECT id,status FROM reservation_extensions WHERE id=? AND reservation_id=? FOR UPDATE',
        [payment.extensionId, payment.reservationId],
      );
      if (!extension || extension.status !== 'Pending') {
        await connection.rollback();
        return bad(res, 'This extension has already been processed or does not exist.', 409);
      }
      await connection.query(
        "UPDATE reservation_extensions SET status='Rejected',rejection_reason=?,processed_by=?,processed_at=CURRENT_TIMESTAMP WHERE id=?",
        [rejectionReason, req.uid, extension.id],
      );
      await createNotification(connection, {
        eventKey: `extension:${extension.id}:rejected`,
        userId: payment.userId,
        title: 'Reservation extension rejected',
        message: `Your reservation extension payment for reservation #${payment.reservationId} was rejected. Reason: ${rejectionReason}. The original expiration time is unchanged.`,
        type: 'EXTENSION_REJECTED',
        reservationId: payment.reservationId,
      });
    } else {
      await createNotification(connection, {
        eventKey: `payment:${payment.id}:rejected`,
        userId: payment.userId,
        title: 'Payment rejected',
        message: `Payment for reservation #${payment.reservationId} at locker ${payment.slot} was rejected. Reason: ${rejectionReason}`,
        type: 'PAYMENT_REJECTED',
        reservationId: payment.reservationId,
      });
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

app.get('/api/finance/extensions', auth, financeOnly, wrap(async (req, res) => {
  const [extensions] = await pool.query(
    `SELECT e.id,e.reservation_id AS reservationId,e.user_id AS riderId,u.name AS riderName,
            e.additional_minutes AS additionalMinutes,e.additional_fee AS additionalFee,
            e.status,e.rejection_reason AS rejectionReason,e.payment_id AS paymentId,
            LEFT(e.previous_end_time,5) AS previousEndTime,LEFT(e.approved_end_time,5) AS approvedEndTime,
            r.slot_no AS slot,r.res_date AS date,LEFT(r.res_time,5) AS time,
            p.status AS paymentStatus,p.amount AS paymentAmount,e.created_at AS createdAt
     FROM reservation_extensions e
     JOIN users u ON u.id=e.user_id
     JOIN reservations r ON r.id=e.reservation_id
     JOIN payments p ON p.id=e.payment_id
     WHERE e.status='Pending' AND p.status='Pending' AND p.payment_type='Extension'
       AND (r.status IN ('Confirmed','Active') OR (r.status='Expired' AND r.stored=1))
     ORDER BY e.created_at ASC`,
  );
  res.json({ extensions });
}));

app.post('/api/finance/extensions/:id/:action', auth, financeOnly, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const action = req.params.action;
  if (!Number.isInteger(id) || id < 1) return bad(res, 'Extension not found.', 404);
  const [[extension]] = await pool.query('SELECT payment_id AS paymentId FROM reservation_extensions WHERE id=?', [id]);
  if (!extension || !extension.paymentId) return bad(res, 'Extension payment not found.', 404);
  const target = req.params.action === 'verify' ? 'verify' : req.params.action === 'reject' ? 'reject' : '';
  if (!target) return bad(res, 'Unknown extension action.', 400);
  req.params.id = String(extension.paymentId);
  return decidePayment(target === 'verify' ? 'Verified' : 'Rejected')(req, res);
}));

/* ---------- refunds and notifications ---------- */
app.get('/api/finance/refunds', auth, financeOrAdmin, wrap(async (req, res) => {
  await processReservationAutomation();
  const [refunds] = await pool.query(
    `SELECT rf.id,rf.reservation_id AS reservationId,rf.user_id AS riderId,u.name AS riderName,
            u.student_id AS riderStudentId,r.slot_no AS slot,r.res_date AS date,
            LEFT(r.res_time,5) AS startTime,LEFT(r.end_time,5) AS endTime,
            r.duration_minutes AS durationMinutes,r.is_whole_day AS wholeDay,
            rf.original_payment_amount AS originalPaymentAmount,rf.refund_percentage AS refundPercentage,
            rf.refund_amount AS refundAmount,rf.non_refundable_amount AS nonRefundableAmount,
            rf.status,rf.rejection_reason AS rejectionReason,rf.transaction_reference AS transactionReference,
            rf.approval_timestamp AS approvalTimestamp,rf.completion_timestamp AS completionTimestamp,
            rf.expiration_timestamp AS expirationTimestamp,rf.created_at AS createdAt,
            approver.name AS approverName
     FROM refunds rf
     JOIN reservations r ON r.id=rf.reservation_id
     JOIN users u ON u.id=rf.user_id
     LEFT JOIN users approver ON approver.id=rf.finance_approver_id
     ORDER BY rf.created_at DESC`,
  );
  res.json({ refunds });
}));

app.post('/api/finance/refunds/:id/:action', auth, financeOnly, wrap(async (req, res) => {
  await processReservationAutomation();
  const id = parseInt(req.params.id, 10);
  const action = req.params.action;
  if (!Number.isInteger(id) || id < 1) return bad(res, 'Refund not found.', 404);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[refund]] = await connection.query(
      `SELECT rf.id,rf.reservation_id AS reservationId,rf.user_id AS userId,rf.status,r.slot_no AS slot
       FROM refunds rf JOIN reservations r ON r.id=rf.reservation_id WHERE rf.id=? FOR UPDATE`,
      [id],
    );
    if (!refund) { await connection.rollback(); return bad(res, 'Refund not found.', 404); }

    let status;
    let sql;
    let params;
    if (action === 'approve') {
      if (refund.status !== 'PENDING') { await connection.rollback(); return bad(res, 'Only pending refunds can be approved.', 409); }
      status = 'APPROVED';
      sql = 'UPDATE refunds SET status=?,finance_approver_id=?,approval_timestamp=CURRENT_TIMESTAMP WHERE id=?';
      params = [status,req.uid,id];
    } else if (action === 'reject') {
      if (refund.status !== 'PENDING') { await connection.rollback(); return bad(res, 'Only pending refunds can be rejected.', 409); }
      const reason = String(req.body.reason || '').trim();
      if (!reason) { await connection.rollback(); return bad(res, 'A rejection reason is required.', 400); }
      if (reason.length > 350) { await connection.rollback(); return bad(res, 'The rejection reason must be 350 characters or fewer.', 400); }
      status = 'REJECTED';
      sql = 'UPDATE refunds SET status=?,finance_approver_id=?,rejection_reason=? WHERE id=?';
      params = [status,req.uid,reason,id];
    } else if (action === 'complete') {
      if (refund.status !== 'APPROVED') { await connection.rollback(); return bad(res, 'Refund must be approved before completion.', 409); }
      const reference = String(req.body.transactionReference || '').trim();
      if (!isValidGcashTransactionReference(reference)) {
        await connection.rollback();
        return bad(res, 'The GCash transaction reference must be exactly 13 digits.', 400);
      }
      status = 'COMPLETED';
      sql = 'UPDATE refunds SET status=?,finance_approver_id=?,completion_timestamp=CURRENT_TIMESTAMP,transaction_reference=? WHERE id=?';
      params = [status,req.uid,reference,id];
    } else {
      await connection.rollback();
      return bad(res, 'Unknown refund action.', 400);
    }
    await connection.query(sql, params);
    if (status === 'APPROVED') {
      await connection.query(
        "UPDATE reservations SET status='Cancelled',qr_used=1 WHERE id=?",
        [refund.reservationId],
      );
    } else if (status === 'REJECTED') {
      await connection.query(
        "UPDATE reservations r SET r.status=CASE WHEN r.stored=1 THEN 'Active' ELSE 'Confirmed' END WHERE r.id=?",
        [refund.reservationId],
      );
    }
    const rejectionReason = status === 'REJECTED' ? String(req.body.reason || '').trim() : '';
    const message = status === 'APPROVED'
      ? `Your 50% refund request for reservation #${refund.reservationId} at locker ${refund.slot} has been approved by Finance.`
      : status === 'COMPLETED'
        ? `Your refund for reservation #${refund.reservationId} at locker ${refund.slot} has been processed. Please check your payment account.`
        : `Your refund request for reservation #${refund.reservationId} at locker ${refund.slot} was rejected. Reason: ${rejectionReason}`;
    await createNotification(connection, {
      eventKey: `refund:${refund.id}:${status.toLowerCase()}`,
      userId: refund.userId,
      title: `Refund ${status.toLowerCase()}`,
      message,
      type: 'REFUND_STATUS',
      reservationId: refund.reservationId,
      refundId: refund.id,
    });
    await connection.commit();
    res.json({ ok:true,status });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

app.post('/api/notifications/:id/read', auth, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [id,req.uid]);
  res.json({ ok:true });
}));

app.post('/api/notifications/read-all', auth, wrap(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.uid]);
  res.json({ ok:true });
}));

/* ---------- push notifications ---------- */
const normalizePushRegistration = (body) => {
  const platform = String(body?.platform || '').trim().toLowerCase();
  if (platform === 'expo') {
    const token = String(body?.token || '').trim();
    if (!/^Expo(nent)?PushToken\[[^\]]+\]$/.test(token)) return { error: 'A valid Expo push token is required.' };
    return { platform, token, tokenHash: hashPushToken(token) };
  }
  if (platform === 'web') {
    let subscription = body?.token;
    if (typeof subscription === 'string') {
      try { subscription = JSON.parse(subscription); } catch (_e) { return { error: 'A valid web push subscription is required.' }; }
    }
    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const authKey = String(subscription?.keys?.auth || '').trim();
    if (!endpoint || !p256dh || !authKey) return { error: 'A valid web push subscription is required.' };
    const token = JSON.stringify({ endpoint, expirationTime: subscription.expirationTime ?? null, keys: { p256dh, auth: authKey } });
    return { platform, token, tokenHash: hashPushToken(token) };
  }
  return { error: 'Push platform must be expo or web.' };
};

app.get('/api/push/vapid-public-key', (_req, res) => {
  res.json({ publicKey: WEB_PUSH_PUBLIC_KEY || '' });
});

app.post('/api/push/register', auth, wrap(async (req, res) => {
  const normalized = normalizePushRegistration(req.body);
  if (normalized.error) return bad(res, normalized.error, 400);
  const deviceLabel = String(req.body?.deviceLabel || '').trim().slice(0, 200) || null;
  await pool.query(
    `INSERT INTO push_tokens (user_id, platform, token, token_hash, device_label, last_seen_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       user_id=VALUES(user_id),
       platform=VALUES(platform),
       token=VALUES(token),
       device_label=VALUES(device_label),
       last_seen_at=NOW(),
       updated_at=CURRENT_TIMESTAMP`,
    [req.uid, normalized.platform, normalized.token, normalized.tokenHash, deviceLabel],
  );
  res.json({ ok: true });
}));

app.post('/api/push/unregister', auth, wrap(async (req, res) => {
  const normalized = normalizePushRegistration(req.body);
  if (normalized.error) return bad(res, normalized.error, 400);
  await pool.query('DELETE FROM push_tokens WHERE token_hash=? AND user_id=?', [normalized.tokenHash, req.uid]);
  res.json({ ok: true });
}));

/* ---------- reservation QR authorization ---------- */
app.get('/api/reservations/:id/qr', auth, riderOrAdmin, wrap(async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);
  const [[reservation]] = Number.isInteger(reservationId)
    ? await pool.query(
        "SELECT id,user_id,slot_no,res_date AS date,LEFT(res_time,5) AS time,status FROM reservations WHERE id=? AND (user_id=? OR ?=1)",
        [reservationId, req.uid, req.admin ? 1 : 0]
      )
    : [[]];

  if (!reservation) return bad(res, 'Reservation not found.', 404);

  const [[payment]] = await pool.query(
    "SELECT id FROM payments WHERE reservation_id=? AND status='Verified' LIMIT 1",
    [reservationId]
  );

  if (!['Confirmed','Active','Used'].includes(reservation.status) || !payment) {
    return bad(res, 'Finance must verify payment before QR access.', 403);
  }
  const [[operatingTime]] = await pool.query('SELECT HOUR(NOW()) * 60 + MINUTE(NOW()) AS currentMinutes');
  const currentMinutes = Number(operatingTime.currentMinutes);
  if (currentMinutes < 360 || currentMinutes > 1260) {
    return bad(res, 'Reservation QR codes can be viewed between 6:00 AM and 9:00 PM.', 403);
  }

  res.json({
    code: createCabinetQr({
      reservationId: reservation.id,
      slotNo: reservation.slot_no,
      date: String(reservation.date).slice(0, 10),
      time: String(reservation.time).slice(0, 5),
      userId: reservation.user_id
    }, QR_SECRET)
  });
}));

/* ---------- reservations ---------- */
app.post('/api/reservations', auth, riderOrAdmin, wrap(async (req, res) => {
  const slot = parseInt(req.body.slot, 10), { date, time } = req.body;
  const wholeDay = req.body.wholeDay === true || req.body.duration === 'whole_day';
  const durationMinutes = wholeDay ? null : parseInt(req.body.durationMinutes, 10);
  if (!(slot >= 1 && slot <= 12)) return bad(res, 'Please select a slot.');
  if (!okDate(date)) return bad(res, 'Please choose a date.');
  if (!okTime(time)) return bad(res, 'Please choose a time.');
  if (dt(date, time) < new Date()) return bad(res, 'Please choose a future date and time.');
  const schedule = calculateSchedule(date, time, durationMinutes, wholeDay);
  if (schedule.error) return bad(res, schedule.error);
  const [[s]] = await pool.query('SELECT is_blocked FROM slots WHERE slot_no=?', [slot]);
  if (!s) return bad(res, 'Unknown slot.');
  if (s.is_blocked) return bad(res, 'That slot is under maintenance.');
  const startMinutes = timeMinutes(time);
  const endMinutes = timeMinutes(schedule.endTime);
  const [[overlap]] = await pool.query(
    `SELECT id FROM reservations
     WHERE slot_no=? AND res_date=? AND status NOT IN ('Cancelled','Used')
       AND (status <> 'Expired' OR stored = 1)
       AND TIME_TO_SEC(res_time) < ?
       AND CASE WHEN status='Expired' AND stored=1 THEN TIME_TO_SEC('21:00:00') ELSE TIME_TO_SEC(COALESCE(end_time,'21:00:00')) END > ?
     LIMIT 1`,
    [slot, date, endMinutes * 60, startMinutes * 60],
  );
  if (overlap) return bad(res, 'This slot already has an overlapping reservation.', 409);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [r] = await connection.query(
      `INSERT INTO reservations
       (user_id,slot_no,res_date,res_time,end_time,duration_minutes,is_whole_day,total_price,grace_deadline)
       VALUES (?,?,?,?,?,?,?,?,TIMESTAMP(?,ADDTIME(?, '00:10:00')))`,
      [req.uid, slot, date, time, schedule.endTime + ':00', schedule.durationMinutes,
       schedule.wholeDay ? 1 : 0, schedule.totalPrice, date, schedule.endTime],
    );
    await createNotification(connection, {
      eventKey: `reservation:${r.insertId}:created`,
      userId: req.uid,
      title: 'Reservation created',
      message: `Reservation #${r.insertId} for locker ${slot} on ${fd(date)} at ${ft(time)} was created. Complete payment and wait for Finance verification.`,
      type: 'RESERVATION_CREATED',
      reservationId: r.insertId,
    });
    await connection.commit();
    res.json({ id: r.insertId });
  } catch (e) {
    await connection.rollback();
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'That slot is already reserved on this date.', 409);
    throw e;
  } finally { connection.release(); }
}));

app.post('/api/reservations/:id/extensions', auth, riderOrAdmin, upload.single('receipt'), wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const additionalMinutes = parseInt(req.body.durationMinutes, 10);
  if (!Number.isInteger(id) || id < 1) return bad(res, 'Reservation not found.', 404);
  if (!Number.isInteger(additionalMinutes) || additionalMinutes < 15 || additionalMinutes % 15 !== 0) {
    return bad(res, 'Extension duration must be in 15-minute increments.', 400);
  }
  const connection = await pool.getConnection();
  let storedPath;
  try {
    await connection.beginTransaction();
    const [[reservation]] = await connection.query(
      'SELECT id,user_id,slot_no,res_date AS date,LEFT(res_time,5) AS time,LEFT(end_time,5) AS endTime,status,stored,grace_deadline FROM reservations WHERE id=? AND user_id=? FOR UPDATE',
      [id, req.uid],
    );
    if (!reservation) { await connection.rollback(); return bad(res, 'Reservation not found.', 404); }
    const canExtendExpiredStored = reservation.status === 'Expired' && Number(reservation.stored) === 1;
    if (!['Confirmed','Active'].includes(reservation.status) && !canExtendExpiredStored) {
      await connection.rollback();
      return bad(res, 'This reservation is not eligible for extension. Expired reservations can only be extended when the helmet is still stored and has not been retrieved.', 409);
    }
    const [[verified]] = await connection.query(
      "SELECT id FROM payments WHERE reservation_id=? AND status='Verified' AND payment_type='Original' LIMIT 1",
      [id],
    );
    if (!verified) { await connection.rollback(); return bad(res, 'The original reservation payment must be verified first.', 409); }
    const [[pending]] = await connection.query(
      "SELECT id FROM reservation_extensions WHERE reservation_id=? AND status='Pending' LIMIT 1 FOR UPDATE",
      [id],
    );
    if (pending) { await connection.rollback(); return bad(res, 'A duplicate extension request is already pending.', 409); }

    const previousMinutes = timeMinutes(reservation.endTime);
    let billedMinutes = additionalMinutes;
    if (canExtendExpiredStored) {
      const [[dbTime]] = await connection.query('SELECT UNIX_TIMESTAMP(NOW()) * 1000 AS nowMs');
      const nowMs = Number(dbTime.nowMs);
      const graceMs = reservation.grace_deadline
        ? new Date(reservation.grace_deadline).getTime()
        : dt(reservation.date, reservation.endTime || '21:00').getTime() + 10 * 60000;
      const lateMs = Math.max(0, nowMs - graceMs);
      billedMinutes = Math.max(15, Math.ceil(lateMs / (15 * 60000)) * 15);
    }
    const approvedMinutes = previousMinutes + billedMinutes;
    if (approvedMinutes > 1260) { await connection.rollback(); return bad(res, 'The extension would end after 9:00 PM.', 400); }
    const [[overlap]] = await connection.query(
      `SELECT id FROM reservations
       WHERE slot_no=? AND res_date=? AND id<>? AND status NOT IN ('Cancelled','Used')
         AND (status <> 'Expired' OR stored = 1)
         AND TIME_TO_SEC(res_time) < ?
         AND CASE WHEN status='Expired' AND stored=1 THEN TIME_TO_SEC('21:00:00') ELSE TIME_TO_SEC(COALESCE(end_time,'21:00:00')) END > ?
       LIMIT 1`,
      [reservation.slot_no, reservation.date, id, approvedMinutes * 60, previousMinutes * 60],
    );
    if (overlap) { await connection.rollback(); return bad(res, 'The extension conflicts with another reservation.', 409); }

    let imageBuffer = req.file && req.file.buffer;
    if (!imageBuffer) {
      const dataUrl = String(req.body.receipt || '').trim();
      const match = dataUrl.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]*={0,2})$/i);
      if (!match) { await connection.rollback(); return bad(res, 'Upload a valid image file.'); }
      if (match[1].length > Math.ceil(MAX_RECEIPT_BYTES / 3) * 4) {
        await connection.rollback();
        return bad(res, 'The image must be 5 MB or smaller.', 413);
      }
      imageBuffer = Buffer.from(match[1], 'base64');
    }

    let image;
    try {
      image = await validateReceiptImage(imageBuffer);
    } catch (e) {
      await connection.rollback();
      const validationMessages = [
        'The image must be 5 MB or smaller.',
        'Choose a non-empty image file.',
        'The file is not a supported image.',
        'The image file is corrupted or unsupported.',
        'This BMP encoding is not supported. Please convert it to JPG or PNG.',
        'Animated GIF receipts are not supported. Choose a static image.',
        'The image dimensions are too large to process.',
      ];
      if (validationMessages.includes(e.message)) {
        return bad(res, e.message, e.message === 'The image must be 5 MB or smaller.' ? 413 : 400);
      }
      return bad(res, 'The image file is corrupted or unsupported.');
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${image.extension}`;
    storedPath = path.join(uploadDir, filename);
    await fs.promises.mkdir(uploadDir, { recursive: true });
    await fs.promises.writeFile(storedPath, image.buffer, { flag: 'wx' });
    const receipt = `/uploads/receipts/${filename}`;

    const fee = (billedMinutes / 15) * 5;
    const approvedEnd = `${String(Math.floor(approvedMinutes / 60)).padStart(2,'0')}:${String(approvedMinutes % 60).padStart(2,'0')}`;
    const [extension] = await connection.query(
      `INSERT INTO reservation_extensions
       (reservation_id,user_id,additional_minutes,additional_fee,previous_end_time,approved_end_time,status)
       VALUES (?,?,?,?,?,?,'Pending')`,
      [id, req.uid, billedMinutes, fee, reservation.endTime + ':00', approvedEnd + ':00'],
    );
    const [payment] = await connection.query(
      `INSERT INTO payments
       (reservation_id,user_id,amount,receipt,status,payment_type,extension_id)
       VALUES (?,?,?,?, 'Pending','Extension',?)`,
      [id, req.uid, fee, receipt, extension.insertId],
    );
    await connection.query('UPDATE reservation_extensions SET payment_id=? WHERE id=?', [payment.insertId, extension.insertId]);
    await createNotification(connection, {
      eventKey: `extension:${extension.insertId}:submitted`,
      userId: req.uid,
      title: 'Extension payment pending verification',
      message: canExtendExpiredStored
        ? `Your late-retrieval extension payment for reservation #${id} covers ${billedMinutes} minute(s) after the 10-minute grace period (PHP ${Number(fee).toFixed(2)}). Finance verification is required before you can retrieve your helmet.`
        : `Your ${billedMinutes}-minute extension payment for reservation #${id} is awaiting Finance verification.`,
      type: 'EXTENSION_PENDING',
      reservationId: id,
    });
    const [financeUsers] = await connection.query('SELECT id FROM users WHERE is_finance=1');
    for (const financeUser of financeUsers) {
      await createNotification(connection, {
        eventKey: `finance:extension:${extension.insertId}:pending:${financeUser.id}`,
        userId: financeUser.id,
        title: 'Extension verification required',
        message: canExtendExpiredStored
          ? `A rider submitted a late-retrieval extension for reservation #${id}: ${billedMinutes} minute(s) after grace, PHP ${Number(fee).toFixed(2)}.`
          : `A rider submitted a ${billedMinutes}-minute extension payment for reservation #${id}.`,
        type: 'EXTENSION_PENDING_FINANCE',
        reservationId: id,
      });
    }
    await connection.commit();
    storedPath = null;
    res.json({ id: extension.insertId, status: 'Pending', additionalMinutes: billedMinutes, fee, paymentId: payment.insertId });
  } catch (e) {
    await connection.rollback();
    if (storedPath) { try { await fs.promises.unlink(storedPath); } catch (_) {} }
    throw e;
  } finally { connection.release(); }
}));

app.put('/api/reservations/:id', auth, riderOrAdmin, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return bad(res, 'Reservation not found.', 404);
  const [[r]] = await pool.query('SELECT id FROM reservations WHERE id=? AND user_id=?', [id, req.uid]);
  if (!r) return bad(res, 'Reservation not found.', 404);
  return bad(res, 'Reservation details are final and cannot be changed after creation.', 409);
}));

app.delete('/api/reservations/:id', auth, riderOrAdmin, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return bad(res, 'Reservation not found.', 404);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[reservation]] = await connection.query(
      'SELECT id,user_id,slot_no,status,total_price FROM reservations WHERE id=? AND user_id=? FOR UPDATE',
      [id, req.uid],
    );
    if (!reservation) {
      await connection.rollback();
      return bad(res, 'Reservation not found.', 404);
    }
    const [[verifiedPayment]] = await connection.query(
      "SELECT id,amount FROM payments WHERE reservation_id=? AND status='Verified' AND payment_type='Original' ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [id],
    );
    if (verifiedPayment) {
      const [[existingRefund]] = await connection.query(
        "SELECT id,status FROM refunds WHERE reservation_id=? FOR UPDATE",
        [id],
      );
      if (existingRefund) {
        await connection.rollback();
        return bad(res, existingRefund.status === 'PENDING'
          ? 'A refund request is already awaiting Finance verification.'
          : 'A refund decision already exists for this reservation.', 409);
      }
      const original = Number(verifiedPayment.amount || reservation.total_price || 0);
      const refundAmount = original * 0.5;
      await connection.query(
        "UPDATE reservations SET status='Pending Refund Verification' WHERE id=? AND status NOT IN ('Cancelled','Expired')",
        [id],
      );
      const [insert] = await connection.query(
        `INSERT INTO refunds
         (reservation_id,user_id,original_payment_amount,refund_percentage,refund_amount,
          non_refundable_amount,status,expiration_timestamp)
         VALUES (?,?,?,50.00,?,?, 'PENDING',NOW())`,
        [id, req.uid, original, refundAmount, original - refundAmount],
      );
      await createNotification(connection, {
        eventKey: `refund:${insert.insertId}:pending:rider`,
        userId: req.uid,
        title: 'Refund verification requested',
        message: `Your cancellation for reservation #${id} at locker ${reservation.slot_no} is awaiting Finance refund verification.`,
        type: 'REFUND_PENDING',
        reservationId: id,
        refundId: insert.insertId,
      });
      const [financeUsers] = await connection.query('SELECT id FROM users WHERE is_finance=1');
      for (const financeUser of financeUsers) {
        await createNotification(connection, {
          eventKey: `refund:${insert.insertId}:pending:finance:${financeUser.id}`,
          userId: financeUser.id,
          title: 'Refund verification required',
          message: `Rider cancelled paid reservation #${id} at locker ${reservation.slot_no}. Refund review is required.`,
          type: 'REFUND_PENDING_FINANCE',
          reservationId: id,
          refundId: insert.insertId,
        });
      }
    } else if (reservation.status !== 'Cancelled') {
      await connection.query("UPDATE reservations SET status='Cancelled' WHERE id=?", [id]);
      await createNotification(connection, {
        eventKey: `reservation:${id}:cancelled`,
        userId: req.uid,
        title: 'Reservation cancelled',
        message: `Reservation #${id} for locker ${reservation.slot_no} was cancelled.`,
        type: 'RESERVATION_CANCELLED',
        reservationId: id,
      });
    }
    await connection.commit();
    res.json({ ok: true });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

/* ---------- cabinet scanner ---------- */
/* ---------- cabinet scanner + ESP32 unlock queue ---------- */
app.post('/api/scan', auth, scannerAccess, wrap(async (req, res) => {
  const code = String(req.body.code || '').trim();
  const parsed = parseCabinetQr(code);
  const recordScanAttempt = async (scanResult, reservation = null) => {
    if (!req.security) return;
    await pool.query(
      `INSERT INTO access_log
       (reservation_id,user_id,slot_no,action,ts,scan_result,scan_code,scanned_by)
       VALUES (?,?,?,'Scan Attempt',?,?,?,?)`,
      [
        reservation ? reservation.id : null,
        reservation ? reservation.userId : null,
        reservation ? reservation.slotNo : null,
        Date.now(),
        scanResult,
        code.slice(0, 2048),
        req.uid,
      ],
    );
  };
  const out = async (ok, title, msg, extra = {}, scanResult = 'DENIED', reservation = null) => {
    if (scanResult !== 'VALID') await recordScanAttempt(scanResult, reservation);
    return res.json({ ok, title, msg, scanResult, ...extra });
  };

  if (!parsed || !verifyCabinetQrSignature(parsed, QR_SECRET)) {
    return out(false, 'Invalid QR code',
      'This QR code is invalid, altered, or not signed by SHSRS. Scan the latest reservation QR code from the app.',
      {}, 'INVALID');
  }

  const devScanBypass = !DEVICE_TOKEN && ALLOW_SCAN_WITHOUT_ESP32;
  if (!DEVICE_TOKEN && !ALLOW_SCAN_WITHOUT_ESP32) {
    await recordScanAttempt('ERROR');
    return bad(res, 'ESP32 is not configured. Set ESP32_DEVICE_TOKEN in server/.env; the cabinet remains locked. For local testing only, set ALLOW_SCAN_WITHOUT_ESP32=true.', 503);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[r]] = await connection.query(
      `SELECT r.id, r.user_id, r.slot_no, r.res_date AS date,
              LEFT(r.res_time,5) AS time, r.stored, r.status,
              r.qr_used,r.actual_storage_ts,r.grace_deadline,
              LEFT(r.end_time,5) AS endTime,s.is_blocked,
              EXISTS(
                SELECT 1 FROM payments p
                WHERE p.reservation_id=r.id
                  AND p.user_id=r.user_id
                  AND p.status='Verified'
              ) AS payment_verified
       FROM reservations r
       JOIN slots s ON s.slot_no=r.slot_no
       WHERE r.id=?
       FOR UPDATE`,
      [parsed.reservationId]
    );

    if (!r) {
      await connection.rollback();
      return out(false, 'Access denied', 'Reservation not found.', {}, 'INVALID');
    }

    if (
      Number(r.user_id) !== parsed.userId ||
      Number(r.slot_no) !== parsed.slotNo ||
      String(r.date).slice(0,10) !== parsed.date ||
      String(r.time).slice(0,5) !== parsed.time
    ) {
      await connection.rollback();
      return out(false, 'Invalid QR code',
        'The QR details do not match this reservation. The cabinet remains locked.',
        {}, 'INVALID', { id: r.id, userId: r.user_id, slotNo: r.slot_no });
    }

    const canScanExpiredStored = r.status === 'Expired' && Number(r.stored) === 1;
    if ((!['Confirmed','Active','Used'].includes(r.status) && !canScanExpiredStored) || !r.payment_verified) {
      await connection.rollback();
      return out(false, 'Payment not verified',
        'Finance must verify payment before this reservation can be used.',
        {}, 'DENIED', { id: r.id, userId: r.user_id, slotNo: r.slot_no });
    }

    if (r.is_blocked) {
      await connection.rollback();
      return out(false, 'Cabinet unavailable',
        'This cabinet slot is under maintenance.',
        {}, 'DENIED', { id: r.id, userId: r.user_id, slotNo: r.slot_no });
    }

    const [[dbTime]] = await connection.query('SELECT UNIX_TIMESTAMP(NOW()) * 1000 AS nowMs');
    const now = Number(dbTime.nowMs);
    const open = dt(r.date, r.time).getTime();
    const end = dt(r.date, r.endTime || '21:00').getTime();
    const graceDeadline = r.grace_deadline ? new Date(r.grace_deadline).getTime() : end + 10 * 60000;
    const validUntil = graceDeadline;

    if (now < open) {
      await connection.rollback();
      return out(false, 'Too early',
        `Slot ${r.slot_no} opens at ${ft(r.time)} on ${fd(r.date)}.`,
        {}, 'DENIED', { id: r.id, userId: r.user_id, slotNo: r.slot_no });
    }

    if (now > validUntil && !canScanExpiredStored) {
      await connection.rollback();
      return out(false, 'Reservation expired',
        'The reservation and 10-minute grace period have ended.',
        {}, 'EXPIRED', { id: r.id, userId: r.user_id, slotNo: r.slot_no });
    }

    const stored = r.stored ? 0 : 1;
    const action = stored ? 'Stored' : 'Retrieved';

    if (stored) {
      await connection.query(
        "UPDATE reservations SET stored=1,actual_storage_ts=?,qr_used=1,status='Active' WHERE id=?",
        [now,r.id]
      );
    } else {
      await connection.query("UPDATE reservations SET stored=0,status='Used' WHERE id=?", [r.id]);
    }

    await connection.query(
      `INSERT INTO access_log
       (reservation_id,user_id,slot_no,action,ts,scan_result,scan_code,scanned_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [r.id, r.user_id, r.slot_no, action, now, req.security ? 'VALID' : null,
        req.security ? code.slice(0, 2048) : null, req.security ? req.uid : null]
    );

    let commandId = null;
    if (!devScanBypass) {
      const [command] = await connection.query(
        `INSERT INTO esp32_commands
         (reservation_id,user_id,slot_no,action,status,expires_at)
         VALUES (?,?,?,?,'queued',DATE_ADD(NOW(), INTERVAL 30 SECOND))`,
        [r.id, r.user_id, r.slot_no, action]
      );
      commandId = command.insertId;
    }

    await connection.commit();

    return out(true, 'Reservation verified',
      devScanBypass
        ? `Slot ${r.slot_no}: ${action.toLowerCase()} recorded. ESP32 is not configured; unlock was simulated for local testing.`
        : `Slot ${r.slot_no}: ${action.toLowerCase()} recorded. The cabinet unlock command was queued.`,
      {
        reservation: {
          id: r.id,
          slot: r.slot_no,
          date: String(r.date).slice(0, 10),
          time: String(r.time).slice(0, 5),
          endTime: String(r.endTime || '').slice(0, 5),
        },
        action,
        hardware: {
          commandId,
          deviceId: DEVICE_ID,
          unlockDurationMs: SERVO_UNLOCK_MS,
          simulated: devScanBypass,
        }
      }, 'VALID'
    );

  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
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
  const nextPassword = String(req.body.next || '');
  if (nextPassword.length < 8) return bad(res, 'New password must be at least 8 characters.');
  if (nextPassword === String(req.body.current || '')) return bad(res, 'Choose a different new password.');
  await pool.query('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?', [await bcrypt.hash(nextPassword, 10), req.uid]);
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

app.put('/api/admin/users/:id', auth, adminOnly, wrap(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!Number.isInteger(userId) || userId < 1) return bad(res, 'User not found.', 404);
  if (!name || name.length > 100) return bad(res, 'Enter a name of 1 to 100 characters.');
  if (!okMail(email) || email.length > 150) return bad(res, 'Enter a valid email address.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.query('SELECT id FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!user) {
      await connection.rollback();
      return bad(res, 'User not found.', 404);
    }
    const [[existing]] = await connection.query(
      'SELECT id FROM users WHERE email=? AND id<>? LIMIT 1',
      [email, userId],
    );
    if (existing) {
      await connection.rollback();
      return bad(res, 'That email is already in use.', 409);
    }

    await connection.query('UPDATE users SET name=?,email=? WHERE id=?', [name, email, userId]);
    await connection.commit();
    res.json({ ok: true });
  } catch (e) {
    await connection.rollback();
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'That email is already in use.', 409);
    throw e;
  } finally {
    connection.release();
  }
}));

app.delete('/api/admin/users/:id', auth, adminOnly, wrap(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userId) || userId < 1) return bad(res, 'User not found.', 404);
  if (userId === req.uid) return bad(res, 'You cannot delete the account you are using.', 409);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.query('SELECT id,is_admin,is_finance,is_security FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!user) {
      await connection.rollback();
      return bad(res, 'User not found.', 404);
    }
    if (user.is_admin || user.is_finance || user.is_security) {
      await connection.rollback();
      return bad(res, 'Staff accounts are managed in the database and cannot be deleted here.', 409);
    }

    await connection.query(
      'DELETE FROM esp32_commands WHERE user_id=? OR reservation_id IN (SELECT id FROM reservations WHERE user_id=?)',
      [userId, userId],
    );
    await connection.query(
      'DELETE FROM access_log WHERE user_id=? OR scanned_by=? OR reservation_id IN (SELECT id FROM reservations WHERE user_id=?)',
      [userId, userId, userId],
    );
    await connection.query(
      'DELETE FROM users WHERE id=? AND is_admin=0 AND is_finance=0 AND is_security=0',
      [userId],
    );
    await connection.commit();
    res.json({ ok: true });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

app.put('/api/admin/users/:id/finance', auth, adminOnly, (_req, res) => bad(res, 'Staff roles can only be managed in the database.', 403));
app.put('/api/admin/users/:id/security', auth, adminOnly, (_req, res) => bad(res, 'Staff roles can only be managed in the database.', 403));


/* ---------- ESP32 command polling ---------- */

app.get('/api/device/commands/next', deviceAuth, wrap(async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "UPDATE esp32_commands SET status='expired' WHERE status IN ('queued','claimed') AND expires_at<=NOW()"
    );

    const [[command]] = await connection.query(
      `SELECT id, reservation_id AS reservationId, slot_no AS slot,
       action, UNIX_TIMESTAMP(expires_at) AS expiresAt
       FROM esp32_commands
       WHERE status='queued' AND expires_at>NOW()
       ORDER BY id ASC LIMIT 1 FOR UPDATE`
    );

    if (!command) {
      await connection.commit();
      return res.json({ command: null });
    }

    await connection.query(
      "UPDATE esp32_commands SET status='claimed', claimed_at=NOW() WHERE id=? AND status='queued'",
      [command.id]
    );

    await connection.commit();

    res.json({
      command: {
        ...command,
        deviceId: DEVICE_ID,
        action: 'unlock',
        unlockDurationMs: SERVO_UNLOCK_MS
      }
    });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}));

/* ---------- ESP32 acknowledgement ---------- */

app.post('/api/device/commands/:id/ack', deviceAuth, wrap(async (req, res) => {
  const commandId = Number.parseInt(req.params.id, 10);
  const status = String(req.body.status || '');
  const message = String(req.body.message || '').slice(0, 240);

  if (!Number.isInteger(commandId) || commandId < 1 ||
      !['completed', 'failed'].includes(status)) {
    return bad(res, 'Invalid command acknowledgement.');
  }

  const [updated] = await pool.query(
    `UPDATE esp32_commands
     SET status=?, device_message=?, completed_at=NOW()
     WHERE id=? AND status='claimed' AND expires_at>NOW()`,
    [status, message, commandId]
  );

  if (!updated.affectedRows) {
    return bad(res, 'Command not found, expired, or already acknowledged.', 404);
  }

  res.json({ ok: true });
}));

/* ---------- Error handler ---------- */

app.use((err, req, res, next) => {
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err instanceof multer.MulterError)) {
    return bad(res, 'The image must be 5 MB or smaller.', 413);
  }
  if (err.type === 'entity.too.large') {
    return bad(res, 'Request body is too large. Reduce the image size and try again.', 413);
  }
  if (err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')) {
    return bad(res, 'Request body must be valid JSON.');
  }
  next(err);
});

processReservationAutomation().catch(() => {});
setInterval(() => processReservationAutomation().catch(() => {}), 30000);
app.listen(PORT, '0.0.0.0', () => console.log(`SHSRS API running on http://localhost:${PORT}`));
