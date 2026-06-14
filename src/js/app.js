/**
 * @module app
 * Main application entry point.
 * Wires together input sources (camera, image upload, PDF upload, manual entry)
 * with the barcode scanner, Finnish barcode generator, and display modules.
 */

import { BarcodeScanner } from './scanner.js';
import { renderToCanvas, formatLabel } from './barcode-display.js';
import { generateBarcodeString, parseAmount } from './fi-barcode-generator.js';
import { validateFinnishIBAN, validateNationalRef, validateRFRef, detectRefType } from './validators.js';

const scanner = new BarcodeScanner();

// ── DOM references ────────────────────────────────────────────────────────────
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');
const video = document.getElementById('camera-video');
const cameraStartBtn = document.getElementById('camera-start');
const cameraStopBtn = document.getElementById('camera-stop');
const cameraSelect = document.getElementById('camera-select');
const imageInput = document.getElementById('image-input');
const imageDropZone = document.getElementById('image-drop-zone');
const pdfInput = document.getElementById('pdf-input');
const pdfDropZone = document.getElementById('pdf-drop-zone');
const pdfPageNav = document.getElementById('pdf-page-nav');
const pdfPageNum = document.getElementById('pdf-page-num');
const pdfPageTotal = document.getElementById('pdf-page-total');
const pdfPrevBtn = document.getElementById('pdf-prev');
const pdfNextBtn = document.getElementById('pdf-next');
const outputSection = document.getElementById('output-section');
const outputCanvas = document.getElementById('output-canvas');
const outputFormat = document.getElementById('output-format');
const outputText = document.getElementById('output-text');
const copyBtn = document.getElementById('copy-btn');
const copyBarcodeBtn = document.getElementById('copy-barcode-btn');
const statusEl = document.getElementById('status');

// Generate-panel fields
const generateForm = document.getElementById('generate-form');
const genIban = document.getElementById('gen-iban');
const genIbanError = document.getElementById('gen-iban-error');
const genAmount = document.getElementById('gen-amount');
const genAmountError = document.getElementById('gen-amount-error');
const genRef = document.getElementById('gen-ref');
const genRefError = document.getElementById('gen-ref-error');
const genDue = document.getElementById('gen-due');

/** @type {import('pdfjs-dist').PDFDocumentProxy|null} */
let currentPDF = null;
let currentPage = 1;
let stopCamera = null;
/** The 54-digit Finnish barcode string for the current result, if generated. */
let currentBarcodeString = null;

// ── Tab switching ─────────────────────────────────────────────────────────────
tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
    panels.forEach((p) => p.setAttribute('hidden', ''));
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(btn.dataset.panel).removeAttribute('hidden');

    if (btn.dataset.panel !== 'panel-camera') stopCurrentCamera();
  });
});

// ── Status helpers ────────────────────────────────────────────────────────────
/**
 * @param {string} msg
 * @param {'idle'|'scanning'|'ok'|'error'} [type='idle']
 */
function setStatus(msg, type = 'idle') {
  statusEl.textContent = msg;
  statusEl.dataset.type = type;
}

// ── Camera ────────────────────────────────────────────────────────────────────
async function populateCameraList() {
  try {
    const devices = await scanner.listCameras();
    cameraSelect.innerHTML = '';
    if (!devices.length) {
      cameraSelect.innerHTML = '<option disabled>No cameras found</option>';
      return;
    }
    devices.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${i + 1}`;
      if (/back|rear|environment/i.test(d.label)) opt.selected = true;
      cameraSelect.appendChild(opt);
    });
  } catch {
    setStatus('Camera list unavailable', 'error');
  }
}

function stopCurrentCamera() {
  if (stopCamera) {
    stopCamera();
    stopCamera = null;
  }
  video.srcObject = null;
  cameraStartBtn.disabled = false;
  cameraStopBtn.disabled = true;
}

cameraStartBtn.addEventListener('click', async () => {
  stopCurrentCamera();
  setStatus('Starting camera…', 'scanning');
  cameraStartBtn.disabled = true;
  cameraStopBtn.disabled = false;

  const deviceId = cameraSelect.value || undefined;
  stopCamera = scanner.startCamera(
    video,
    deviceId,
    (result) => {
      setStatus('Barcode detected!', 'ok');
      showScannedResult(result);
    },
    (err) => {
      setStatus(`Camera error: ${err.message}`, 'error');
      stopCurrentCamera();
    }
  );
});

cameraStopBtn.addEventListener('click', stopCurrentCamera);

document.querySelector('[data-panel="panel-camera"]').addEventListener(
  'click',
  () => populateCameraList(),
  { once: true }
);

// ── Image upload / drop ───────────────────────────────────────────────────────
function setupDropZone(zone, input, handler) {
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handler(file);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) handler(input.files[0]);
  });
}

setupDropZone(imageDropZone, imageInput, async (file) => {
  if (!file.type.startsWith('image/')) {
    setStatus('Please drop an image file', 'error');
    return;
  }
  setStatus('Scanning image…', 'scanning');
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);
    const result = await scanner.scanCanvas(canvas);
    showScannedResult(result);
    setStatus('Barcode found!', 'ok');
  } catch (err) {
    setStatus(noBarcode(err), 'error');
  }
});

// ── PDF upload / drop ─────────────────────────────────────────────────────────
setupDropZone(pdfDropZone, pdfInput, async (file) => {
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    setStatus('Please drop a PDF file', 'error');
    return;
  }
  setStatus('Loading PDF…', 'scanning');
  try {
    const { loadPDF } = await import('./pdf-reader.js');
    currentPDF = await loadPDF(file);
    currentPage = 1;
    pdfPageTotal.textContent = currentPDF.numPages;
    pdfPageNav.hidden = currentPDF.numPages <= 1;
    await scanPDFPage();
  } catch (err) {
    setStatus(`PDF error: ${err.message}`, 'error');
  }
});

async function scanPDFPage() {
  if (!currentPDF) return;
  setStatus(`Scanning page ${currentPage}…`, 'scanning');
  pdfPageNum.textContent = currentPage;
  try {
    const { renderPage } = await import('./pdf-reader.js');
    const canvas = await renderPage(currentPDF, currentPage);
    const result = await scanner.scanCanvas(canvas);
    showScannedResult(result);
    setStatus('Barcode found!', 'ok');
  } catch (err) {
    setStatus(noBarcode(err), 'error');
    hideOutput();
  }
}

pdfPrevBtn.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; scanPDFPage(); }
});
pdfNextBtn.addEventListener('click', () => {
  if (currentPDF && currentPage < currentPDF.numPages) { currentPage++; scanPDFPage(); }
});

// ── Generate panel ────────────────────────────────────────────────────────────
/** Show or hide a field error message. */
function fieldError(el, msg) {
  el.textContent = msg ?? '';
  el.hidden = !msg;
}

generateForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Clear previous errors
  fieldError(genIbanError, null);
  fieldError(genAmountError, null);
  fieldError(genRefError, null);

  let valid = true;

  // Validate IBAN
  const ibanResult = validateFinnishIBAN(genIban.value);
  if (!ibanResult.valid) {
    fieldError(genIbanError, ibanResult.error);
    valid = false;
  }

  // Parse and validate amount (optional — default to 0)
  let euros = 0;
  let cents = 0;
  const amountRaw = genAmount.value.trim();
  if (amountRaw && amountRaw !== '0') {
    try {
      ({ euros, cents } = parseAmount(amountRaw));
    } catch (err) {
      fieldError(genAmountError, err.message);
      valid = false;
    }
  }

  // Validate reference
  const refType = detectRefType(genRef.value);
  if (refType === 'national') {
    const refResult = validateNationalRef(genRef.value);
    if (!refResult.valid) {
      fieldError(genRefError, refResult.error);
      valid = false;
    }
  } else if (refType === 'rf') {
    const rfResult = validateRFRef(genRef.value);
    if (!rfResult.valid) {
      fieldError(genRefError, rfResult.error);
      valid = false;
    }
  } else {
    fieldError(genRefError, 'Enter a numeric reference or an RF reference (starting with RF)');
    valid = false;
  }

  if (!valid) return;

  // Parse due date
  const dueDate = genDue.value ? new Date(genDue.value) : null;

  try {
    const { barcodeString, version } = generateBarcodeString({
      iban: genIban.value,
      euros,
      cents,
      reference: genRef.value,
      dueDate,
    });
    showGeneratedBarcode(barcodeString, version);
    setStatus(`Version ${version} barcode generated`, 'ok');
  } catch (err) {
    setStatus(`Generation error: ${err.message}`, 'error');
  }
});

// ── Result display ────────────────────────────────────────────────────────────
/**
 * Show result from a scanner (ZXing Result object).
 * @param {import('@zxing/library').Result} result
 */
function showScannedResult(result) {
  const text = result.getText();
  const formatName = result.getBarcodeFormat().toString();

  currentBarcodeString = null;
  outputText.textContent = text;
  outputFormat.textContent = formatLabel(formatName);
  copyBarcodeBtn.hidden = true;
  outputSection.hidden = false;

  try {
    renderToCanvas(outputCanvas, text, formatName);
  } catch (renderErr) {
    console.warn('Barcode render failed:', renderErr.message);
    outputCanvas.getContext('2d').clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  }
}

/**
 * Show a generated Finnish bank barcode.
 * @param {string} barcodeString - 54-digit string
 * @param {4|5} version
 */
function showGeneratedBarcode(barcodeString, version) {
  currentBarcodeString = barcodeString;
  outputText.textContent = barcodeString;
  outputFormat.textContent = `Finnish bank barcode v${version}`;
  copyBarcodeBtn.hidden = false;
  outputSection.hidden = false;

  try {
    renderToCanvas(outputCanvas, barcodeString, 'CODE_128');
  } catch (renderErr) {
    console.warn('Barcode render failed:', renderErr.message);
  }
}

function hideOutput() {
  outputSection.hidden = true;
  currentBarcodeString = null;
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
async function copyToClipboard(text, btn, label) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = label; }, 2000);
  } catch {
    setStatus('Clipboard access denied', 'error');
  }
}

copyBtn.addEventListener('click', () => copyToClipboard(outputText.textContent, copyBtn, 'Copy value'));
copyBarcodeBtn.addEventListener('click', () =>
  copyToClipboard(currentBarcodeString ?? outputText.textContent, copyBarcodeBtn, 'Copy barcode string')
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function noBarcode(err) {
  if (err?.name === 'NotFoundException' || /not found/i.test(err?.message)) {
    return 'No barcode detected — try a clearer image';
  }
  return `Scan error: ${err?.message ?? err}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
setStatus('Ready — pick an input source above');
