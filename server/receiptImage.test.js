const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { MAX_RECEIPT_BYTES, validateReceiptImage } = require('./receiptImage');

test('accepts supported formats based on valid image bytes, not image contents', async () => {
  const image = sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } });
  assert.deepEqual(await validateReceiptImage(await image.clone().png().toBuffer()), { extension: 'png' });
  assert.deepEqual(await validateReceiptImage(await image.clone().jpeg().toBuffer()), { extension: 'jpg' });
  assert.deepEqual(await validateReceiptImage(await image.clone().webp().toBuffer()), { extension: 'webp' });
});

test('rejects empty, corrupt, and oversized uploads', async () => {
  await assert.rejects(validateReceiptImage(Buffer.alloc(0)), /non-empty/);
  await assert.rejects(validateReceiptImage(Buffer.from('not an image')), /supported image/);
  await assert.rejects(validateReceiptImage(Buffer.alloc(MAX_RECEIPT_BYTES + 1)), /5 MB/);
});

test('rejects truncated images that cannot be fully decoded', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } }).png().toBuffer();
  await assert.rejects(validateReceiptImage(png.subarray(0, Math.floor(png.length / 2))));
});
