import { describe, it, expect } from 'vitest';
import { generateBarcodeString, parseAmount } from '../src/js/fi-barcode-generator.js';

// Official Code 128C symbol pairs from Finance Finland Bank Bar Code Guide v5.3 §13.1–13.2.
// Each row is 27 pairs whose concatenated two-digit strings form the 54-digit barcode payload.
// Pairs are plain decimal integers; the helper below zero-pads them before joining.
function pairsToString(pairs) {
  return pairs.map((n) => String(n).padStart(2, '0')).join('');
}

describe('generateBarcodeString — version 4 (national reference)', () => {
  const specPairs = {
    'inv1': [47,94,40,52, 2, 0,36, 8,20, 4,88,31,50, 0, 0, 0, 8,68,51,62,59,61,98,97,10, 6,12],
    'inv2': [45,81, 1,71, 0, 0, 0,12,20, 0,48,29,90, 0, 0, 0, 5,59,58,22,43,29,46,71,12, 1,31],
    'inv3': [40,25, 0, 4,64, 0, 1,30,20, 0,69,38, 0, 0, 0, 6,98,75,67,20,83,43,53,64,11, 7,24],
    'inv4': [41,56,60,10, 0,15,30,64,10, 7,44,45,40, 0, 0, 0,77,58,47,47,90,64,74,89,19,12,19],
    'inv5': [41,68, 0, 1,40, 0,50,26,70, 0,93,58,50, 0, 0, 7,87,77,67,96,56,62,86,87, 0, 0, 0],
    'inv6': [47,33,13,13, 0,10, 0, 5,80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,86,86,24,13, 8, 9],
    'inv7': [48,33,30,10, 0,11, 0,77,51,50, 0, 2, 0, 0,92,12,53,74,25,25,39,89,77,37,16, 5,25],
    'inv8': [43,93,63,63, 0,20,92,49,20, 0, 0,10,30, 0, 0, 0, 0, 0, 0, 5,90,73,83,90,23, 3,11],
    'inv9': [49,23,93,90, 0,10, 3,39,10, 0, 0, 0,20, 0, 0, 0, 0, 0, 0, 0, 1,35,79,14,99,12,24],
  };

  const cases = [
    { key: 'inv1', iban: 'FI79 4405 2020 0360 82', euros: 4883, cents: 15, reference: '86851 62596 19897', dueDate: new Date(2010, 5, 12) },
    { key: 'inv2', iban: 'FI58 1017 1000 0001 22', euros: 482,  cents: 99, reference: '55958 22432 94671', dueDate: new Date(2012, 0, 31) },
    { key: 'inv3', iban: 'FI02 5000 4640 0013 02', euros: 693,  cents: 80, reference: '69 87567 20834 35364', dueDate: new Date(2011, 6, 24) },
    { key: 'inv4', iban: 'FI15 6601 0001 5306 41', euros: 7444, cents: 54, reference: '7 75847 47906 47489', dueDate: new Date(2019, 11, 19) },
    { key: 'inv5', iban: 'FI16 8000 1400 0502 67', euros: 935,  cents: 85, reference: '78 77767 96566 28687', dueDate: null },
    { key: 'inv6', iban: 'FI73 3131 3001 0000 58', euros: 0,    cents: 0,  reference: '8 68624', dueDate: new Date(2013, 7, 9) },
    { key: 'inv7', iban: 'FI83 3301 0001 1007 75', euros: 150000, cents: 20, reference: '92125 37425 25398 97737', dueDate: new Date(2016, 4, 25) },
    { key: 'inv8', iban: 'FI39 3636 3002 0924 92', euros: 1,    cents: 3,  reference: '5907 38390', dueDate: new Date(2023, 2, 11) },
    { key: 'inv9', iban: 'FI92 3939 0001 0033 91', euros: 0,    cents: 2,  reference: '13 57914', dueDate: new Date(2099, 11, 24) },
  ];

  cases.forEach(({ key, iban, euros, cents, reference, dueDate }) => {
    it(`v4 ${key}`, () => {
      const { barcodeString, version } = generateBarcodeString({ iban, euros, cents, reference, dueDate });
      expect(barcodeString).toBe(pairsToString(specPairs[key]));
      expect(version).toBe(4);
      expect(barcodeString).toHaveLength(54);
    });
  });
});

describe('generateBarcodeString — version 5 (RF reference)', () => {
  const specPairs = {
    'inv1': [57,94,40,52, 2, 0,36, 8,20, 4,88,31,50,90, 0, 0, 8,68,51,62,59,61,98,97,10, 6,12],
    'inv2': [55,81, 1,71, 0, 0, 0,12,20, 0,48,29,90,60, 0, 0, 5,59,58,22,43,29,46,71,10, 1,31],
    'inv3': [50,25, 0, 4,64, 0, 1,30,20, 0,69,38, 6,10, 0, 0, 0, 0,69,87,56,72, 8,39,11, 7,24],
    'inv4': [51,56,60,10, 0,15,30,64,10, 7,44,45,48,40, 0, 0,77,58,47,47,90,64,74,89,19,12,19],
    'inv5': [51,68, 0, 1,40, 0,50,26,70, 0,93,58,56, 0, 0, 7,87,77,67,96,56,62,86,87, 0, 0, 0],
    'inv6': [57,33,13,13, 0,10, 0, 5,80, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0,86,86,24,13, 8, 9],
    'inv7': [58,33,30,10, 0,11, 0,77,51,50, 0, 2, 7,10,92,12,53,74,25,25,39,89,77,37,16, 5,25],
    'inv8': [53,93,63,63, 0,20,92,49,20, 0, 0,10,36,60, 0, 0, 0, 0, 0, 5,90,73,83,90,23, 3,11],
    'inv9': [59,23,93,90, 0,10, 3,39,10, 0, 0, 0,29,50, 0, 0, 0, 0, 0, 0, 1,35,79,14,99,12,24],
  };

  const cases = [
    { key: 'inv1', iban: 'FI79 4405 2020 0360 82', euros: 4883, cents: 15, reference: 'RF09 8685 1625 9619 897', dueDate: new Date(2010, 5, 12) },
    { key: 'inv2', iban: 'FI58 1017 1000 0001 22', euros: 482,  cents: 99, reference: 'RF06 5595 8224 3294 671', dueDate: new Date(2010, 0, 31) },
    { key: 'inv3', iban: 'FI02 5000 4640 0013 02', euros: 693,  cents: 80, reference: 'RF61 6987 5672 0839', dueDate: new Date(2011, 6, 24) },
    { key: 'inv4', iban: 'FI15 6601 0001 5306 41', euros: 7444, cents: 54, reference: 'RF84 7758 4747 9064 7489', dueDate: new Date(2019, 11, 19) },
    { key: 'inv5', iban: 'FI16 8000 1400 0502 67', euros: 935,  cents: 85, reference: 'RF60 7877 7679 6566 2868 7', dueDate: null },
    { key: 'inv6', iban: 'FI73 3131 3001 0000 58', euros: 0,    cents: 0,  reference: 'RF10 8686 24', dueDate: new Date(2013, 7, 9) },
    { key: 'inv7', iban: 'FI83 3301 0001 1007 75', euros: 150000, cents: 20, reference: 'RF71 9212 5374 2525 3989 7737', dueDate: new Date(2016, 4, 25) },
    { key: 'inv8', iban: 'FI39 3636 3002 0924 92', euros: 1,    cents: 3,  reference: 'RF66 5907 3839 0', dueDate: new Date(2023, 2, 11) },
    { key: 'inv9', iban: 'FI92 3939 0001 0033 91', euros: 0,    cents: 2,  reference: 'RF95 1357 914', dueDate: new Date(2099, 11, 24) },
  ];

  cases.forEach(({ key, iban, euros, cents, reference, dueDate }) => {
    it(`v5 ${key}`, () => {
      const { barcodeString, version } = generateBarcodeString({ iban, euros, cents, reference, dueDate });
      expect(barcodeString).toBe(pairsToString(specPairs[key]));
      expect(version).toBe(5);
      expect(barcodeString).toHaveLength(54);
    });
  });
});

describe('parseAmount', () => {
  it('parses "482.99"', () => {
    expect(parseAmount('482.99')).toEqual({ euros: 482, cents: 99 });
  });

  it('parses comma decimal separator', () => {
    expect(parseAmount('693,80')).toEqual({ euros: 693, cents: 80 });
  });

  it('parses whole number with no cents', () => {
    expect(parseAmount('1000')).toEqual({ euros: 1000, cents: 0 });
  });

  it('pads single cent digit', () => {
    expect(parseAmount('1.5')).toEqual({ euros: 1, cents: 50 });
  });

  it('throws on invalid input', () => {
    expect(() => parseAmount('abc')).toThrow();
    expect(() => parseAmount('1.234')).toThrow();
  });
});
