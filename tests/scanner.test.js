import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarcodeScanner } from '../src/js/scanner.js';

// ZXing relies on browser APIs unavailable in Node; mock the reader
vi.mock('@zxing/library', () => {
  const NotFoundException = class NotFoundException extends Error {
    constructor() { super('not found'); this.name = 'NotFoundException'; }
  };

  const BrowserMultiFormatReader = vi.fn(() => ({
    decodeFromVideoDevice: vi.fn(() => Promise.resolve()),
    decodeFromImageUrl: vi.fn(),
    decodeFromImageElement: vi.fn(),
    reset: vi.fn(),
  }));

  return {
    BrowserMultiFormatReader,
    BarcodeFormat: {
      QR_CODE: 'QR_CODE', CODE_128: 'CODE_128', EAN_13: 'EAN_13',
      EAN_8: 'EAN_8', UPC_A: 'UPC_A', UPC_E: 'UPC_E', ITF: 'ITF',
      CODE_39: 'CODE_39', CODE_93: 'CODE_93', DATA_MATRIX: 'DATA_MATRIX',
      PDF_417: 'PDF_417', AZTEC: 'AZTEC', RSS_14: 'RSS_14',
    },
    DecodeHintType: { POSSIBLE_FORMATS: 'POSSIBLE_FORMATS', TRY_HARDER: 'TRY_HARDER' },
    NotFoundException,
  };
});

describe('BarcodeScanner', () => {
  let s;

  beforeEach(() => {
    s = new BarcodeScanner();
  });

  it('constructs without throwing', () => {
    expect(s).toBeInstanceOf(BarcodeScanner);
  });

  it('startCamera returns a stop function', () => {
    const videoEl = {};
    const stop = s.startCamera(videoEl, undefined, vi.fn(), vi.fn());
    expect(typeof stop).toBe('function');
  });

  it('stop() calls reader.reset()', async () => {
    const { BrowserMultiFormatReader } = await import('@zxing/library');
    const instance = BrowserMultiFormatReader.mock.results.at(-1).value;
    s.stop();
    expect(instance.reset).toHaveBeenCalled();
  });

  it('scanCanvas delegates to reader.decodeFromImageUrl with a data URL', async () => {
    const { BrowserMultiFormatReader } = await import('@zxing/library');
    const instance = BrowserMultiFormatReader.mock.results.at(-1).value;
    const canvas = { toDataURL: vi.fn(() => 'data:image/jpeg;base64,abc') };
    await s.scanCanvas(canvas).catch(() => {});
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92);
    expect(instance.decodeFromImageUrl).toHaveBeenCalledWith('data:image/jpeg;base64,abc');
  });
});
