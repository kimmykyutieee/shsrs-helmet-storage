const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidGcashTransactionReference } = require('./refundReference');

test('accepts 13-digit GCash transaction references, including leading zeroes', () => {
  assert.equal(isValidGcashTransactionReference('0123456789012'), true);
});

test('rejects references that are not exactly 13 digits', () => {
  for (const reference of ['', '123456789012', '12345678901234', '123456789012a']) {
    assert.equal(isValidGcashTransactionReference(reference), false);
  }
});
