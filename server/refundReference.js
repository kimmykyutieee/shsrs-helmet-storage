function isValidGcashTransactionReference(value) {
  return /^\d{13}$/.test(String(value || '').trim());
}

module.exports = { isValidGcashTransactionReference };
