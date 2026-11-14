const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStudentQr, verifyStudentQrSubmission } = require('./studentQr');

test('parses name, 10-digit student ID, and course from the observed payload', () => {
  assert.deepEqual(parseStudentQr('KHRISTAL A. JAWAY 2024301392 BSIT'), {
    student: { name: 'KHRISTAL A. JAWAY', studentId: '2024301392', course: 'BSIT' },
  });
});

test('preserves multiword names and programs while normalizing whitespace', () => {
  assert.deepEqual(parseStudentQr('  KHRISTAL   A. JAWAY  2024301392  BS Information Technology  '), {
    student: { name: 'KHRISTAL A. JAWAY', studentId: '2024301392', course: 'BS Information Technology' },
  });
});

test('rejects empty or unsupported payloads and multiple student IDs', () => {
  assert.deepEqual(parseStudentQr(''), { error: 'invalid' });
  assert.deepEqual(parseStudentQr('not a student ID'), { error: 'studentId' });
  assert.deepEqual(parseStudentQr('Name 1234567890 BSIT 2024301392'), { error: 'invalid' });
});

test('rejects missing name, missing course, and IDs that are not ten digits', () => {
  assert.deepEqual(parseStudentQr('2024301392 BSIT'), { error: 'name' });
  assert.deepEqual(parseStudentQr('Student Name 2024301392'), { error: 'course' });
  assert.deepEqual(parseStudentQr('Student Name 202430139 BSIT'), { error: 'studentId' });
});

test('backend registration validation requires the raw QR payload', () => {
  assert.deepEqual(verifyStudentQrSubmission({}), { error: 'invalid' });
});

test('backend rejects student details that differ from the raw QR payload', () => {
  const base = {
    studentQr: 'KHRISTAL A. JAWAY 2024301392 BSIT',
    name: 'KHRISTAL A. JAWAY',
    studentId: '2024301392',
    course: 'BSIT',
  };
  assert.deepEqual(verifyStudentQrSubmission(base), {
    student: { name: 'KHRISTAL A. JAWAY', studentId: '2024301392', course: 'BSIT' },
  });
  assert.deepEqual(verifyStudentQrSubmission({ ...base, studentId: '2024301393' }), { error: 'mismatch' });
  assert.deepEqual(verifyStudentQrSubmission({ ...base, name: 'Another Student' }), { error: 'mismatch' });
  assert.deepEqual(verifyStudentQrSubmission({ ...base, course: 'BSCS' }), { error: 'mismatch' });
});
