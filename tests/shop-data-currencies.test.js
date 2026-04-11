import { describe, test, expect, afterEach } from 'vitest';
import { SHOP_DATA, applyShopData } from '../src/shop-data.js';

describe('multi-currency shop data', () => {
  afterEach(() => {
    SHOP_DATA.currencies = [{ id: 'coins', nameKey: 'common.coins', icon: '\u25c8' }];
    SHOP_DATA.packs = [];
  });

  test('SHOP_DATA has default currencies', () => {
    expect(SHOP_DATA.currencies).toHaveLength(1);
    expect(SHOP_DATA.currencies[0].id).toBe('coins');
  });

  test('applyShopData merges currencies by id (upsert)', () => {
    applyShopData({
      currencies: [
        { id: 'ancientcoins', nameKey: 'common.ancientcoins', icon: '◆' },
        { id: 'moderncoins', nameKey: 'common.moderncoins', icon: '★' },
      ],
    });
    expect(SHOP_DATA.currencies).toHaveLength(3);
    const ancient = SHOP_DATA.currencies.find(c => c.id === 'ancientcoins');
    expect(ancient?.icon).toBe('◆');
    const coins = SHOP_DATA.currencies.find(c => c.id === 'coins');
    expect(coins?.icon).toBe('\u25c8'); // unchanged
  });

  test('applyShopData replaces existing currency with same id', () => {
    SHOP_DATA.currencies.push({ id: 'ancientcoins', nameKey: 'common.ancientcoins', icon: '◆' });
    applyShopData({
      currencies: [{ id: 'ancientcoins', nameKey: 'common.ancientcoins', icon: '◇' }],
    });
    const ancient = SHOP_DATA.currencies.find(c => c.id === 'ancientcoins');
    expect(ancient?.icon).toBe('◇');
  });

  test('inferred id from nameKey when id absent', () => {
    SHOP_DATA.currencies = [];
    applyShopData({
      currencies: [{ nameKey: 'common.testcoins', icon: '◈' }],
    });
    expect(SHOP_DATA.currencies[0].id).toBe('testcoins');
  });
});