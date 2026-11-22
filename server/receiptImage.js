const sharp = require('sharp');

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40000000;
const MAX_SIZE_MESSAGE = 'The image must be 5 MB or smaller.';
const UNSUPPORTED_MESSAGE = 'The file is not a supported image.';
const CORRUPT_MESSAGE = 'The image file is corrupted or unsupported.';
const BMP_UNSUPPORTED_MESSAGE = 'This BMP encoding is not supported. Please convert it to JPG or PNG.';
const ANIMATED_GIF_MESSAGE = 'Animated GIF receipts are not supported. Choose a static image.';
const MIME_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heif: 'image/heif',
  gif: 'image/gif',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
};
const SHARP_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif', 'gif', 'tiff']);
const SHARP_OPTIONS = { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS };

const hasImageSignature = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return true;
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return true;
  if (buffer.length >= 2 && buffer.toString('ascii', 0, 2) === 'BM') return true;
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;
  if (buffer.length >= 4 && (buffer.toString('ascii', 0, 4) === 'II*\u0000' || buffer.toString('ascii', 0, 4) === 'MM\u0000*')) return true;

  if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brands = buffer.toString('ascii', 8, Math.min(buffer.length, 64));
    return /heic|heix|hevc|hevx|heim|heis|mif1|msf1|avif|avis/.test(brands);
  }
  return false;
};

const decodeBmp = (buffer) => {
  if (buffer.length < 54) throw new Error(CORRUPT_MESSAGE);

  const headerSize = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18);
  const signedHeight = buffer.readInt32LE(22);
  const planes = buffer.readUInt16LE(26);
  const bitDepth = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);
  const pixelOffset = buffer.readUInt32LE(10);
  const height = Math.abs(signedHeight);

  if (headerSize < 40 || 14 + headerSize > buffer.length || width <= 0 || !height || planes !== 1) {
    throw new Error(CORRUPT_MESSAGE);
  }
  if (!Number.isSafeInteger(width * height) || width * height > MAX_IMAGE_PIXELS) {
    throw new Error('The image dimensions are too large to process.');
  }
  if (![1, 4, 8, 16, 24, 32].includes(bitDepth) || compression !== 0) {
    throw new Error(BMP_UNSUPPORTED_MESSAGE);
  }

  const rowBytes = Math.floor((width * bitDepth + 31) / 32) * 4;
  if (pixelOffset < 14 + headerSize || pixelOffset + rowBytes * height > buffer.length) {
    throw new Error(CORRUPT_MESSAGE);
  }

  const paletteCount = bitDepth <= 8
    ? (buffer.readUInt32LE(46) || (1 << bitDepth))
    : 0;
  const paletteOffset = 14 + headerSize;
  if (paletteCount && paletteOffset + paletteCount * 4 > pixelOffset) {
    throw new Error(CORRUPT_MESSAGE);
  }

  const pixels = Buffer.alloc(width * height * 4);
  const topDown = signedHeight < 0;
  let hasNonZeroAlpha = false;

  for (let y = 0; y < height; y += 1) {
    const sourceRow = pixelOffset + (topDown ? y : height - 1 - y) * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;
      let red;
      let green;
      let blue;
      let alpha = 255;

      if (bitDepth <= 8) {
        const byte = buffer[sourceRow + Math.floor((x * bitDepth) / 8)];
        const shift = 8 - bitDepth - ((x * bitDepth) % 8);
        const paletteIndex = (byte >> shift) & ((1 << bitDepth) - 1);
        if (paletteIndex >= paletteCount) throw new Error(CORRUPT_MESSAGE);
        const paletteEntry = paletteOffset + paletteIndex * 4;
        blue = buffer[paletteEntry];
        green = buffer[paletteEntry + 1];
        red = buffer[paletteEntry + 2];
      } else if (bitDepth === 16) {
        const value = buffer.readUInt16LE(sourceRow + x * 2);
        red = Math.round(((value >> 10) & 31) * 255 / 31);
        green = Math.round(((value >> 5) & 31) * 255 / 31);
        blue = Math.round((value & 31) * 255 / 31);
      } else {
        const source = sourceRow + x * (bitDepth / 8);
        blue = buffer[source];
        green = buffer[source + 1];
        red = buffer[source + 2];
        if (bitDepth === 32) {
          alpha = buffer[source + 3];
          if (alpha !== 0) hasNonZeroAlpha = true;
        }
      }

      pixels[target] = red;
      pixels[target + 1] = green;
      pixels[target + 2] = blue;
      pixels[target + 3] = alpha;
    }
  }

  if (bitDepth === 32 && !hasNonZeroAlpha) {
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  }

  return { data: pixels, width, height };
};

const validateReceiptImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Choose a non-empty image file.');
  }
  if (buffer.length > MAX_RECEIPT_BYTES) throw new Error(MAX_SIZE_MESSAGE);
  if (!hasImageSignature(buffer)) throw new Error(UNSUPPORTED_MESSAGE);

  try {
    const isBmp = buffer.toString('ascii', 0, 2) === 'BM';
    let sourceFormat;
    let sourceMimeType;
    let image;
    let metadata;

    if (isBmp) {
      const decoded = decodeBmp(buffer);
      sourceFormat = 'bmp';
      sourceMimeType = MIME_TYPES.bmp;
      image = sharp(decoded.data, {
        raw: { width: decoded.width, height: decoded.height, channels: 4 },
        limitInputPixels: MAX_IMAGE_PIXELS,
      });
    } else {
      image = sharp(buffer, SHARP_OPTIONS);
      metadata = await image.metadata();
      sourceFormat = metadata.format;
      if (!SHARP_FORMATS.has(sourceFormat)) throw new Error(UNSUPPORTED_MESSAGE);
      sourceMimeType = metadata.mediaType || MIME_TYPES[sourceFormat];
      if (sourceFormat === 'gif' && (metadata.pages || 1) > 1) {
        throw new Error(ANIMATED_GIF_MESSAGE);
      }
    }

    let normalizedBuffer = buffer;
    let extension;
    let mimeType;
    if (sourceFormat === 'jpeg') {
      await sharp(buffer, SHARP_OPTIONS).stats();
      extension = 'jpg';
      mimeType = MIME_TYPES.jpeg;
    } else if (sourceFormat === 'png') {
      await sharp(buffer, SHARP_OPTIONS).stats();
      extension = 'png';
      mimeType = MIME_TYPES.png;
    } else {
      normalizedBuffer = await image
        .rotate()
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 90 })
        .toBuffer();
      if (normalizedBuffer.length > MAX_RECEIPT_BYTES) throw new Error(MAX_SIZE_MESSAGE);
      extension = 'jpg';
      mimeType = MIME_TYPES.jpeg;
    }

    return { buffer: normalizedBuffer, extension, mimeType, sourceFormat, sourceMimeType };
  } catch (error) {
    if ([
      MAX_SIZE_MESSAGE,
      UNSUPPORTED_MESSAGE,
      CORRUPT_MESSAGE,
      BMP_UNSUPPORTED_MESSAGE,
      ANIMATED_GIF_MESSAGE,
      'The image dimensions are too large to process.',
    ].includes(error.message)) {
      throw error;
    }
    throw new Error(CORRUPT_MESSAGE);
  }
};

module.exports = { MAX_RECEIPT_BYTES, validateReceiptImage };
