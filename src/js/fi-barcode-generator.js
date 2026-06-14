/**
 * @module fi-barcode-generator
 * Generates the 54-digit Finnish bank bar code string (versions 4 and 5)
 * per Finance Finland Bank Bar Code Guide v5.3.
 *
 * Version 4: IBAN + national reference → [4][IBAN_16][EUR_6][CENTS_2][000][REF_20][YYMMDD]
 * Version 5: IBAN + RF reference      → [5][IBAN_16][EUR_6][CENTS_2][RF_23][YYMMDD]
 *
 * The resulting string is encoded as Code 128 Character Set C by the display layer.
 */

import { detectRefType } from './validators.js';

/**
 * Encode an RF reference (ISO 11649) into the 23-digit barcode field.
 * Algorithm: strip "RF" and spaces → keep 2-digit check, zero-pad between check and body.
 *
 * Example: RF06 5595 8224 3294 671
 *   → stripped: 065595822432946​71
 *   → check: 06, body: 559582243294671 (15 digits), zeros: 23-2-15 = 6
 *   → result: 06000000559582243294671
 *
 * @param {string} rfRef - validated RF reference, spaces allowed
 * @returns {string} 23-digit string
 */
function encodeRFReference(rfRef) {
  const s = rfRef.replace(/\s/g, '').toUpperCase().replace(/^RF/, '');
  const check = s.slice(0, 2);
  const body = s.slice(2);
  const zeros = '0'.repeat(23 - 2 - body.length);
  return check + zeros + body;
}

/**
 * Format a Date as YYMMDD for the due-date field.
 *
 * @param {Date} date
 * @returns {string} 6-digit YYMMDD
 */
function formatDueDate(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * @typedef {Object} BarcodeParams
 * @property {string} iban       - Finnish IBAN, e.g. 'FI58 1017 1000 0001 22'
 * @property {number} euros      - whole euros (0–999999); use 0 if amount unknown
 * @property {number} cents      - cents (0–99)
 * @property {string} reference  - national reference or RF reference ('RF...')
 * @property {Date|null} dueDate - payment due date, or null for no due date
 */

/**
 * @typedef {Object} BarcodeResult
 * @property {string} barcodeString - 54-digit string to encode as Code 128
 * @property {4|5}   version        - barcode format version used
 */

/**
 * Generate the 54-digit Finnish bank barcode string.
 * Inputs must be pre-validated with validators.js before calling this function.
 *
 * @param {BarcodeParams} params
 * @returns {BarcodeResult}
 * @throws {Error} if a parameter is out of range or the reference format is unsupported
 */
export function generateBarcodeString({ iban, euros, cents, reference, dueDate }) {
  if (!Number.isInteger(euros) || euros < 0 || euros > 999999) {
    throw new Error('Euros must be an integer 0–999999');
  }
  if (!Number.isInteger(cents) || cents < 0 || cents > 99) {
    throw new Error('Cents must be an integer 0–99');
  }

  const ibanNum = iban.replace(/\s/g, '').toUpperCase().slice(2); // strip 'FI'
  if (ibanNum.length !== 16 || !/^\d+$/.test(ibanNum)) {
    throw new Error('IBAN numeric part must be exactly 16 digits');
  }

  const eurosStr = String(euros).padStart(6, '0');
  const centsStr = String(cents).padStart(2, '0');
  const dueDateStr = dueDate ? formatDueDate(dueDate) : '000000';
  const refType = detectRefType(reference);

  if (refType === 'national') {
    const refDigits = reference.replace(/\s/g, '');
    if (refDigits.length > 20) throw new Error('National reference must be ≤ 20 digits');
    const refField = refDigits.padStart(20, '0');
    const barcodeString = `4${ibanNum}${eurosStr}${centsStr}000${refField}${dueDateStr}`;
    if (barcodeString.length !== 54) throw new Error(`Internal: length ${barcodeString.length} ≠ 54`);
    return { barcodeString, version: 4 };
  }

  if (refType === 'rf') {
    const rfField = encodeRFReference(reference);
    if (rfField.length !== 23) throw new Error(`Internal: RF field length ${rfField.length} ≠ 23`);
    const barcodeString = `5${ibanNum}${eurosStr}${centsStr}${rfField}${dueDateStr}`;
    if (barcodeString.length !== 54) throw new Error(`Internal: length ${barcodeString.length} ≠ 54`);
    return { barcodeString, version: 5 };
  }

  throw new Error(
    'Reference must be a numeric national reference or an RF reference starting with "RF"'
  );
}

/**
 * Parse a decimal amount string (e.g. "482.99", "693,80", "150000.20") into
 * separate euros and cents integers.
 *
 * @param {string} amountStr - decimal amount, comma or period as separator
 * @returns {{ euros: number, cents: number }}
 * @throws {Error} if the string cannot be parsed or is out of range
 */
export function parseAmount(amountStr) {
  const normalised = amountStr.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalised)) {
    throw new Error('Summa: käytä muotoa 482.99 tai 482');
  }
  const [euroPart, centPart = '0'] = normalised.split('.');
  const euros = parseInt(euroPart, 10);
  const cents = parseInt(centPart.padEnd(2, '0'), 10);
  if (euros > 999999) throw new Error('Summa ylittää enimmäismäärän (999 999 €)');
  return { euros, cents };
}
