const crypto = require('crypto');

// Format: SHSRS|R<reservationId>|S<slotNo>|YYYY-MM-DD|HH:mm|<userId>|H<sha256-hmac>
function canonicalQrFields(fields) {
  return `SHSRS|R${fields.reservationId}|S${fields.slotNo}|${fields.date}|${fields.time}|${fields.userId}`;
}

function createCabinetQr(fields, secret) {
  const canonical = canonicalQrFields(fields);
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return `${canonical}|H${signature}`;
}

function parseCabinetQr(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^SHSRS\|R([1-9][0-9]*)\|S([1-9][0-9]*)\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\|([1-9][0-9]*)\|H([a-f0-9]{64})$/);
  if (!match) return null;
  const reservationId = Number(match[1]);
  const slotNo = Number(match[2]);
  const userId = Number(match[5]);
  const [year, month, day] = match[3].split('-').map(Number);
  const [hour, minute] = match[4].split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59) return null;
  if (!Number.isSafeInteger(reservationId) || !Number.isSafeInteger(userId) || slotNo < 1 || slotNo > 12) return null;
  return { reservationId, slotNo, date: match[3], time: match[4], userId, signature: match[6] };
}

function verifyCabinetQrSignature(parsed, secret) {
  if (!parsed || typeof secret !== 'string' || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(canonicalQrFields(parsed)).digest();
  const supplied = Buffer.from(parsed.signature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = { createCabinetQr, parseCabinetQr, verifyCabinetQrSignature };
