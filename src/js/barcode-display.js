/**
 * @module barcode-display
 * Renders a decoded barcode value back as a crisp barcode image using bwip-js.
 * Maps ZXing BarcodeFormat names to bwip-js encoder IDs.
 */

import bwipjs from 'bwip-js';

/**
 * Maps ZXing BarcodeFormat enum names to bwip-js bcid strings.
 * Formats not listed here fall back to code128 (universally readable).
 */
const FORMAT_TO_BCID = {
  QR_CODE: 'qrcode',
  DATA_MATRIX: 'datamatrix',
  PDF_417: 'pdf417',
  AZTEC: 'azteccode',
  CODE_128: 'code128',
  CODE_39: 'code39',
  CODE_93: 'code93',
  EAN_13: 'ean13',
  EAN_8: 'ean8',
  UPC_A: 'upca',
  UPC_E: 'upce',
  ITF: 'interleaved2of5',
  RSS_14: 'databar',
};

const TWO_DIMENSIONAL = new Set(['QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC']);

/**
 * @typedef {Object} RenderOptions
 * @property {number} [scale=3]
 * @property {boolean} [includetext=true]
 * @property {string} [color='000000']
 * @property {string} [backgroundcolor='ffffff']
 */

/**
 * Render a barcode onto a canvas element.
 *
 * @param {HTMLCanvasElement} canvas - target canvas (will be resized by bwip-js)
 * @param {string} text - the decoded barcode value
 * @param {string} zxingFormatName - BarcodeFormat enum name (e.g. 'CODE_128')
 * @param {RenderOptions} [opts]
 * @returns {HTMLCanvasElement} the same canvas, now painted
 * @throws {Error} if bwip-js cannot encode the value
 */
export function renderToCanvas(canvas, text, zxingFormatName, opts = {}) {
  const bcid = FORMAT_TO_BCID[zxingFormatName] ?? 'code128';
  const is2D = TWO_DIMENSIONAL.has(zxingFormatName);

  const bwipOpts = {
    bcid,
    text,
    scale: opts.scale ?? 3,
    includetext: opts.includetext ?? !is2D,
    color: opts.color ?? '000000',
    backgroundcolor: opts.backgroundcolor ?? 'ffffff',
  };

  // 1-D barcodes look better with explicit height; 2-D encode their own size
  if (!is2D) {
    bwipOpts.height = 18;
  }

  bwipjs.toCanvas(canvas, bwipOpts);
  return canvas;
}

/**
 * Human-readable label for a ZXing format name.
 *
 * @param {string} zxingFormatName
 * @returns {string}
 */
export function formatLabel(zxingFormatName) {
  const labels = {
    QR_CODE: 'QR Code',
    DATA_MATRIX: 'Data Matrix',
    PDF_417: 'PDF 417',
    AZTEC: 'Aztec',
    CODE_128: 'Code 128',
    CODE_39: 'Code 39',
    CODE_93: 'Code 93',
    EAN_13: 'EAN-13',
    EAN_8: 'EAN-8',
    UPC_A: 'UPC-A',
    UPC_E: 'UPC-E',
    ITF: 'ITF',
    RSS_14: 'GS1 DataBar',
  };
  return labels[zxingFormatName] ?? zxingFormatName;
}
