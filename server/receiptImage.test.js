const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { MAX_RECEIPT_BYTES, validateReceiptImage } = require('./receiptImage');

const createBmp24 = () => {
  const width = 2;
  const height = 2;
  const rowBytes = 8;
  const pixelOffset = 54;
  const buffer = Buffer.alloc(pixelOffset + rowBytes * height);
  buffer.write('BM', 0, 'ascii');
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(pixelOffset, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(rowBytes * height, 34);
  buffer.fill(0x20, pixelOffset);
  return buffer;
};

test('validates common image content and normalizes non-browser formats to JPEG', async () => {
  const image = sharp({ create: { width: 3, height: 2, channels: 3, background: '#123456' } });
  const fixtures = [
    { buffer: await image.clone().jpeg().toBuffer(), sourceFormat: 'jpeg', extension: 'jpg', mimeType: 'image/jpeg' },
    { buffer: await image.clone().png().toBuffer(), sourceFormat: 'png', extension: 'png', mimeType: 'image/png' },
    { buffer: await image.clone().webp().toBuffer(), sourceFormat: 'webp', extension: 'jpg', mimeType: 'image/jpeg' },
    { buffer: await image.clone().gif().toBuffer(), sourceFormat: 'gif', extension: 'jpg', mimeType: 'image/jpeg' },
    { buffer: await image.clone().tiff().toBuffer(), sourceFormat: 'tiff', extension: 'jpg', mimeType: 'image/jpeg' },
    { buffer: await image.clone().heif({ compression: 'av1' }).toBuffer(), sourceFormat: 'heif', extension: 'jpg', mimeType: 'image/jpeg' },
    { buffer: createBmp24(), sourceFormat: 'bmp', extension: 'jpg', mimeType: 'image/jpeg' },
  ];

  for (const fixture of fixtures) {
    const result = await validateReceiptImage(fixture.buffer);
    assert.equal(result.sourceFormat, fixture.sourceFormat);
    assert.equal(result.extension, fixture.extension);
    assert.equal(result.mimeType, fixture.mimeType);
    assert.ok(result.sourceMimeType.startsWith('image/'));
    assert.equal((await sharp(result.buffer).metadata()).format, fixture.extension === 'png' ? 'png' : 'jpeg');
  }
});

test('rejects empty, non-image, corrupted, and oversized uploads with clear errors', async () => {
  await assert.rejects(validateReceiptImage(Buffer.alloc(0)), /non-empty/);
  await assert.rejects(validateReceiptImage(Buffer.from('%PDF-1.7 document')), /not a supported image/);
  await assert.rejects(validateReceiptImage(Buffer.from('BM')), /corrupted or unsupported/);
  await assert.rejects(validateReceiptImage(Buffer.alloc(MAX_RECEIPT_BYTES + 1)), /5 MB/);
});

test('rejects truncated images that cannot be fully decoded', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } }).png().toBuffer();
  await assert.rejects(validateReceiptImage(png.subarray(0, Math.floor(png.length / 2))), /corrupted or unsupported/);
});

test('rejects BMP encodings that require decompression', async () => {
  const bmp = createBmp24();
  bmp.writeUInt32LE(1, 30);
  await assert.rejects(validateReceiptImage(bmp), /BMP encoding is not supported/);
});
