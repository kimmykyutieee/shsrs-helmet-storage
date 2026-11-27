const test = require('node:test');
const assert = require('node:assert/strict');
const { parseIdentityQr, verifyIdentityQrSubmission } = require('./studentQr');

test('parses student IDs and course details from the QR payload', () => {
  assert.deepEqual(parseIdentityQr('STUDENT RIDER 2024301392 BSIT'), {
    identity: { name: 'STUDENT RIDER', memberId: '2024301392', memberType: 'Student', affiliation: 'BSIT' },
  });
});

test('parses seven-digit faculty IDs and designation details', () => {
  assert.deepEqual(parseIdentityQr('FACULTY MEMBER 1234567 Instructor I College of Science'), {
    identity: {
      name: 'FACULTY MEMBER',
      memberId: '1234567',
      memberType: 'Faculty',
      affiliation: 'Instructor I College of Science',
    },
  });
});

test('preserves multiword names and affiliations while normalizing whitespace', () => {
  assert.deepEqual(parseIdentityQr('  STUDENT   RIDER  2024301392  BS Information Technology  '), {
    identity: { name: 'STUDENT RIDER', memberId: '2024301392', memberType: 'Student', affiliation: 'BS Information Technology' },
  });
});

test('rejects empty or unsupported payloads and multiple supported IDs', () => {
  assert.deepEqual(parseIdentityQr(''), { error: 'invalid' });
  assert.deepEqual(parseIdentityQr('not a USTP ID'), { error: 'memberId' });
  assert.deepEqual(parseIdentityQr('NAME 123456789 BSIT'), { error: 'memberId' });
  assert.deepEqual(parseIdentityQr('NAME 1234567 BSIT 2024301392'), { error: 'invalid' });
});

test('rejects missing name and missing course or faculty details', () => {
  assert.deepEqual(parseIdentityQr('2024301392 BSIT'), { error: 'name' });
  assert.deepEqual(parseIdentityQr('STUDENT RIDER 2024301392'), { error: 'affiliation' });
  assert.deepEqual(parseIdentityQr('FACULTY MEMBER 1234567'), { error: 'affiliation' });
});

test('registration validation requires the raw QR payload', () => {
  assert.deepEqual(verifyIdentityQrSubmission({}), { error: 'invalid' });
});

test('registration rejects details or account type that differ from the scanned QR', () => {
  const base = {
    identityQr: 'FACULTY MEMBER 1234567 Instructor I College of Science',
    name: 'FACULTY MEMBER',
    memberId: '1234567',
    memberType: 'Faculty',
    affiliation: 'Instructor I College of Science',
  };
  assert.deepEqual(verifyIdentityQrSubmission(base), {
    identity: {
      name: 'FACULTY MEMBER',
      memberId: '1234567',
      memberType: 'Faculty',
      affiliation: 'Instructor I College of Science',
    },
  });
  assert.deepEqual(verifyIdentityQrSubmission({ ...base, memberId: '1234568' }), { error: 'mismatch' });
  assert.deepEqual(verifyIdentityQrSubmission({ ...base, memberType: 'Student' }), { error: 'mismatch' });
  assert.deepEqual(verifyIdentityQrSubmission({ ...base, name: 'ANOTHER MEMBER' }), { error: 'mismatch' });
  assert.deepEqual(verifyIdentityQrSubmission({ ...base, affiliation: 'Another department' }), { error: 'mismatch' });
});

test('accepts legacy student registration fields during app rollout', () => {
  assert.deepEqual(verifyIdentityQrSubmission({
    studentQr: 'STUDENT RIDER 2024301392 BSIT',
    name: 'STUDENT RIDER',
    studentId: '2024301392',
    course: 'BSIT',
  }), {
    identity: { name: 'STUDENT RIDER', memberId: '2024301392', memberType: 'Student', affiliation: 'BSIT' },
  });
});
