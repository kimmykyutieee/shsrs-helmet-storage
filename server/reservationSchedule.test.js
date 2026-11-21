const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSchedule } = require('./reservationSchedule');

test('calculates regular reservation schedules', () => {
  assert.deepEqual(
    calculateSchedule('2026-11-22', '08:00', 60, false),
    { endTime: '09:00', durationMinutes: 60, wholeDay: false, totalPrice: 20 },
  );
  assert.deepEqual(
    calculateSchedule('2026-11-22', '08:00', 90, false),
    { endTime: '09:30', durationMinutes: 90, wholeDay: false, totalPrice: 30 },
  );
});

test('whole day ends at 9 PM and costs 100', () => {
  assert.deepEqual(
    calculateSchedule('2026-11-22', '08:00', null, true),
    { endTime: '21:00', durationMinutes: 780, wholeDay: true, totalPrice: 100 },
  );
});

test('rejects invalid duration and operating hours', () => {
  assert.equal(calculateSchedule('2026-11-22', '20:00', 120, false).error, 'Reservations must end by 9:00 PM.');
  assert.equal(calculateSchedule('2026-11-22', '08:00', 20, false).error, 'Duration must be a 15-minute increment.');
  assert.ok(calculateSchedule('2026-11-22', '05:59', 15, false).error);
});
