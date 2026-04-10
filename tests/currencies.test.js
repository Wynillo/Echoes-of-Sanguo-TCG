import { describe, it, expect, afterEach } from 'vitest';
import { getCurrency, addCurrency, spendCurrency } from '../src/currencies.js';

describe('currencies', () => {
  const TEST_SLOT = 9;

  afterEach(() => {
    for (const id of ['coins', 'ancientcoins', 'moderncoins']) {
      localStorage.removeItem(`tcg_s${TEST_SLOT}_currency_${id}`);
    }
  });

  it('getCurrency returns 0 for unknown currency (auto-migration)', () => {
    expect(getCurrency(TEST_SLOT, 'ancientcoins')).toBe(0);
  });

  it('addCurrency creates key and returns new balance', () => {
    expect(addCurrency(TEST_SLOT, 'ancientcoins', 50)).toBe(50);
    expect(addCurrency(TEST_SLOT, 'ancientcoins', 30)).toBe(80);
  });

  it('getCurrency returns stored value', () => {
    addCurrency(TEST_SLOT, 'moderncoins', 100);
    expect(getCurrency(TEST_SLOT, 'moderncoins')).toBe(100);
  });

  it('spendCurrency returns false if insufficient balance', () => {
    expect(spendCurrency(TEST_SLOT, 'ancientcoins', 1)).toBe(false);
    expect(getCurrency(TEST_SLOT, 'ancientcoins')).toBe(0);
  });

  it('spendCurrency deducts and returns true on success', () => {
    addCurrency(TEST_SLOT, 'coins', 100);
    expect(spendCurrency(TEST_SLOT, 'coins', 60)).toBe(true);
    expect(getCurrency(TEST_SLOT, 'coins')).toBe(40);
  });

  it('spendCurrency with exact balance works', () => {
    addCurrency(TEST_SLOT, 'coins', 50);
    expect(spendCurrency(TEST_SLOT, 'coins', 50)).toBe(true);
    expect(getCurrency(TEST_SLOT, 'coins')).toBe(0);
  });

  it('addCurrency with zero amount returns current balance', () => {
    addCurrency(TEST_SLOT, 'coins', 10);
    expect(addCurrency(TEST_SLOT, 'coins', 0)).toBe(10);
  });

  it('addCurrency ignores negative amounts', () => {
    addCurrency(TEST_SLOT, 'coins', 10);
    expect(addCurrency(TEST_SLOT, 'coins', -5)).toBe(10);
  });
});
