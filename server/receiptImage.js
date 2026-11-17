const sharp = require('sharp');

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = {
  avif: 'avif',
  gif: 'gif',
  heif: 'heic',
  jpeg: 'jpg',
  jp2: 'jp2',
  jxl: 'jxl',
  png: 'png',
  svg: 'svg',
  tiff: 'tif',
  webp: 'webp',
};

const validateReceiptImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Choose a non-empty image file.');
  }
  if (buffer.length > MAX_RECEIPT_BYTES) {
    throw new Error('The image must be 5 MB or smaller.');
  }

  const image = sharp(buffer, { failOn: 'error', limitInputPixels: 40000000 });
  const metadata = await image.metadata();
  if (!metadata.format || !metadata.width || !metadata.height || !IMAGE_EXTENSIONS[metadata.format]) {
    throw new Error('The file is not a supported image.');
  }
  await image.stats();

  return { extension: IMAGE_EXTENSIONS[metadata.format] };
};

module.exports = { MAX_RECEIPT_BYTES, validateReceiptImage };
