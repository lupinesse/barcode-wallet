/**
 * @module scanner
 * Wraps @zxing/browser to detect barcodes from camera, image elements, and canvas elements.
 * Supports all common 1-D and 2-D formats (QR, Code 128, EAN, ITF, Data Matrix, PDF417, …).
 */

import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from '@zxing/library';

/** All formats tried on every scan attempt. */
const HINTS = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.RSS_14,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

export class BarcodeScanner {
  /** @type {BrowserMultiFormatReader} */
  #reader;

  constructor() {
    this.#reader = new BrowserMultiFormatReader(HINTS);
  }

  /**
   * List available video input devices (cameras).
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async listCameras() {
    return BrowserMultiFormatReader.listVideoInputDevices();
  }

  /**
   * Start continuous scanning from the device camera.
   * Calls onResult with each detected barcode result, or onError on hard failure.
   * Returns a stop function.
   *
   * @param {HTMLVideoElement} videoEl
   * @param {string|undefined} deviceId - preferred camera device id; undefined = default
   * @param {(result: import('@zxing/library').Result) => void} onResult
   * @param {(err: Error) => void} onError
   * @returns {() => void} stop function
   */
  startCamera(videoEl, deviceId, onResult, onError) {
    this.#reader
      .decodeFromVideoDevice(deviceId ?? undefined, videoEl, (result, err) => {
        if (result) onResult(result);
        // NotFoundException fires every frame when nothing is found — ignore it
        if (err && !(err instanceof NotFoundException)) onError(err);
      })
      .catch(onError);

    return () => this.#reader.reset();
  }

  /**
   * Decode a barcode from a canvas element.
   * Converts to a data URL then uses decodeFromImageUrl, which is available
   * across all @zxing/library versions (decodeFromCanvas is not).
   *
   * @param {HTMLCanvasElement} canvas
   * @returns {Promise<import('@zxing/library').Result>}
   * @throws {NotFoundException} when no barcode is found
   */
  async scanCanvas(canvas) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return this.#reader.decodeFromImageUrl(dataUrl);
  }

  /** Release the camera stream. */
  stop() {
    this.#reader.reset();
  }
}
