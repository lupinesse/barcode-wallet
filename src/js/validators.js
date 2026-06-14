/**
 * @module validators
 * Validation helpers for Finnish payment data: IBAN, national reference, RF reference.
 * All validators return a { valid, normalized, error? } object rather than throwing,
 * so callers can surface friendly messages in the UI.
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string} normalized - input with spaces removed and uppercased
 * @property {string} [error] - human-readable reason when valid is false
 */

/**
 * Validate a Finnish IBAN (FI + 2 check digits + 14 account digits = 18 chars total).
 * Uses ISO 7064 MOD-97-10.
 *
 * @param {string} iban - raw IBAN, spaces allowed
 * @returns {ValidationResult}
 */
export function validateFinnishIBAN(iban) {
  const s = iban.replace(/\s/g, '').toUpperCase();

  if (!/^FI\d{16}$/.test(s)) {
    return { valid: false, normalized: s, error: 'IBAN tulee alkaa FI-tunnuksella ja sisältää 16 numeroa' };
  }

  // Rearrange: move first 4 chars to end, then replace letters with numbers
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, normalized: s, error: 'IBAN-tarkistenumerot eivät täsmää' };
  }

  return { valid: true, normalized: s };
}

/**
 * Validate a Finnish national reference number.
 * The last digit is a check digit; weights 7-3-1 cycle right-to-left over the preceding digits.
 *
 * @param {string} ref - reference number, spaces allowed
 * @returns {ValidationResult}
 */
export function validateNationalRef(ref) {
  const digits = ref.replace(/\s/g, '');

  if (!/^\d+$/.test(digits) || digits.length < 2 || digits.length > 20) {
    return { valid: false, normalized: digits, error: 'Viitenumero: 2–20 numeroa' };
  }

  const checkDigit = parseInt(digits.at(-1), 10);
  const body = digits.slice(0, -1);
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum += parseInt(body[body.length - 1 - i], 10) * weights[i % 3];
  }
  const expected = (10 - (sum % 10)) % 10;

  if (checkDigit !== expected) {
    return {
      valid: false,
      normalized: digits,
      error: `Viitenumeron tarkistenumero virheellinen (odotettu ${expected})`,
    };
  }

  return { valid: true, normalized: digits };
}

/**
 * Validate an RF (ISO 11649) creditor reference.
 * Finnish bank barcodes only support purely numeric RF references (no alphabetic body).
 * Format: RF + 2 check digits + 1–21 digits.
 *
 * @param {string} ref - RF reference, spaces allowed
 * @returns {ValidationResult}
 */
export function validateRFRef(ref) {
  const s = ref.replace(/\s/g, '').toUpperCase();

  if (!/^RF\d{3,23}$/.test(s)) {
    return {
      valid: false,
      normalized: s,
      error: 'RF-viite: RF + 2 tarkistetta + 1–21 numeroa (vain numerot suomalaisia viivakoodeja varten)',
    };
  }

  // Validate check digits: move 'RF' + 2-digit check to the end, replace letters, mod 97 must equal 1
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, normalized: s, error: 'RF-viitteen tarkistenumerot eivät täsmää' };
  }

  return { valid: true, normalized: s };
}

/**
 * Detect whether a reference string is a national numeric reference or an RF reference.
 *
 * @param {string} ref
 * @returns {'rf' | 'national' | 'unknown'}
 */
export function detectRefType(ref) {
  const s = ref.replace(/\s/g, '').toUpperCase();
  if (s.startsWith('RF')) return 'rf';
  if (/^\d+$/.test(s)) return 'national';
  return 'unknown';
}
