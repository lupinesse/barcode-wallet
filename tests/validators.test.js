import { describe, it, expect } from 'vitest';
import {
  validateFinnishIBAN,
  validateNationalRef,
  validateRFRef,
  detectRefType,
} from '../src/js/validators.js';

describe('validateFinnishIBAN', () => {
  it('accepts all spec test IBANs', () => {
    const valid = [
      'FI79 4405 2020 0360 82',
      'FI58 1017 1000 0001 22',
      'FI02 5000 4640 0013 02',
      'FI15 6601 0001 5306 41',
      'FI16 8000 1400 0502 67',
      'FI73 3131 3001 0000 58',
      'FI83 3301 0001 1007 75',
      'FI39 3636 3002 0924 92',
      'FI92 3939 0001 0033 91',
    ];
    valid.forEach((iban) => {
      expect(validateFinnishIBAN(iban).valid, iban).toBe(true);
    });
  });

  it('rejects non-FI IBAN', () => {
    expect(validateFinnishIBAN('DE89 3704 0044 0532 0130 00').valid).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validateFinnishIBAN('FI58 1017 1000 0001').valid).toBe(false);
  });

  it('rejects bad check digits', () => {
    // Flip one digit in the numeric part
    expect(validateFinnishIBAN('FI58 1017 1000 0001 23').valid).toBe(false);
  });

  it('normalises by stripping spaces', () => {
    const result = validateFinnishIBAN('FI5810171000000122');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('FI5810171000000122');
  });
});

describe('validateNationalRef', () => {
  it('accepts all spec v4 reference numbers', () => {
    const valid = [
      '86851 62596 19897',
      '55958 22432 94671',
      '69 87567 20834 35364',
      '7 75847 47906 47489',
      '78 77767 96566 28687',
      '8 68624',
      '92125 37425 25398 97737',
      '5907 38390',
      '13 57914',
    ];
    valid.forEach((ref) => {
      expect(validateNationalRef(ref).valid, ref).toBe(true);
    });
  });

  it('rejects wrong check digit', () => {
    expect(validateNationalRef('86851 62596 19890').valid).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(validateNationalRef('RF06 1234').valid).toBe(false);
  });
});

describe('validateRFRef', () => {
  it('accepts all spec v5 reference numbers', () => {
    const valid = [
      'RF09 8685 1625 9619 897',
      'RF06 5595 8224 3294 671',
      'RF61 6987 5672 0839',
      'RF84 7758 4747 9064 7489',
      'RF60 7877 7679 6566 2868 7',
      'RF10 8686 24',
      'RF71 9212 5374 2525 3989 7737',
      'RF66 5907 3839 0',
      'RF95 1357 914',
    ];
    valid.forEach((ref) => {
      expect(validateRFRef(ref).valid, ref).toBe(true);
    });
  });

  it('rejects wrong check digits', () => {
    expect(validateRFRef('RF99 9991').valid).toBe(false);
  });

  it('rejects alphabetic body (not supported for Finnish barcodes)', () => {
    expect(validateRFRef('RF75 ABCD').valid).toBe(false);
  });
});

describe('detectRefType', () => {
  it('detects national references', () => {
    expect(detectRefType('86851 62596 19897')).toBe('national');
  });

  it('detects RF references', () => {
    expect(detectRefType('RF06 5595 8224 3294 671')).toBe('rf');
    expect(detectRefType('rf06 5595')).toBe('rf');
  });

  it('returns unknown for unsupported formats', () => {
    expect(detectRefType('ABC 123')).toBe('unknown');
  });
});
