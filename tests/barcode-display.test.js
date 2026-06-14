import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatLabel, renderToCanvas } from '../src/js/barcode-display.js';

// bwip-js requires a real canvas; mock it in the test environment
vi.mock('bwip-js', () => ({
  default: {
    toCanvas: vi.fn((_canvas, opts) => {
      if (!opts.text) throw new Error('text is required');
    }),
  },
}));

describe('formatLabel', () => {
  it('returns a human-readable label for known formats', () => {
    expect(formatLabel('QR_CODE')).toBe('QR Code');
    expect(formatLabel('EAN_13')).toBe('EAN-13');
    expect(formatLabel('CODE_128')).toBe('Code 128');
    expect(formatLabel('ITF')).toBe('ITF');
  });

  it('returns the raw format name for unknown formats', () => {
    expect(formatLabel('UNKNOWN_FORMAT')).toBe('UNKNOWN_FORMAT');
  });
});

describe('renderToCanvas', () => {
  let canvas;

  beforeEach(() => {
    canvas = {};
  });

  it('calls bwip-js toCanvas with the mapped bcid for CODE_128', async () => {
    const { default: bwipjs } = await import('bwip-js');
    renderToCanvas(canvas, '123456', 'CODE_128');
    expect(bwipjs.toCanvas).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({ bcid: 'code128', text: '123456' })
    );
  });

  it('falls back to code128 for unknown format names', async () => {
    const { default: bwipjs } = await import('bwip-js');
    renderToCanvas(canvas, 'abc', 'UNKNOWN');
    expect(bwipjs.toCanvas).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({ bcid: 'code128' })
    );
  });

  it('uses qrcode bcid for QR_CODE', async () => {
    const { default: bwipjs } = await import('bwip-js');
    renderToCanvas(canvas, 'https://example.com', 'QR_CODE');
    expect(bwipjs.toCanvas).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({ bcid: 'qrcode' })
    );
  });

  it('omits includetext for 2-D formats', async () => {
    const { default: bwipjs } = await import('bwip-js');
    renderToCanvas(canvas, 'data', 'DATA_MATRIX');
    const call = bwipjs.toCanvas.mock.calls.at(-1)[1];
    expect(call.includetext).toBe(false);
  });
});
