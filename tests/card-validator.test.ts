import { describe, it, expect } from 'vitest';
import { validateTcgCards } from '../src/card-validator.js';

describe('validateTcgCards', () => {
  it('validates a correct card array', () => {
    const cards = [
      { id: 1, type: 1, level: 4, atk: 1500, def: 1200, rarity: 1, attribute: 1, race: 1 },
    ];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-array input', () => {
    const result = validateTcgCards('not an array');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('JSON array');
  });

  it('rejects empty array', () => {
    const result = validateTcgCards([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at least one card');
  });

  it('detects duplicate IDs', () => {
    const cards = [
      { id: 1, type: 1, level: 4, rarity: 1 },
      { id: 1, type: 1, level: 3, rarity: 2 },
    ];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  it('validates type field', () => {
    const cards = [{ id: 1, type: 99, level: 4, rarity: 1 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('type'))).toBe(true);
  });

  it('requires level for monsters/fusions', () => {
    const cards = [{ id: 1, type: 1, rarity: 1 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('level'))).toBe(true);
  });

  it('rejects atk on spells/traps', () => {
    const cards = [{ id: 1, type: 3, level: 0, rarity: 1, atk: 100 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('atk') && e.includes('spells/traps'))).toBe(true);
  });

  it('accepts valid equipment card', () => {
    const cards = [{ id: 1, type: 5, level: 0, rarity: 1, atkBonus: 300 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(true);
  });

  it('accepts valid effect syntax', () => {
    const cards = [{ id: 1, type: 1, level: 4, rarity: 1, effect: 'onSummon:draw(self,2)' }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid effect syntax', () => {
    const cards = [{ id: 1, type: 1, level: 4, rarity: 1, effect: 'badTrigger:draw(self,2)' }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid effect syntax'))).toBe(true);
  });

  it('rejects non-string effect', () => {
    const cards = [{ id: 1, type: 1, level: 4, rarity: 1, effect: 42 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('effect') && e.includes('string'))).toBe(true);
  });

  it('validates rarity field must be positive integer', () => {
    const cards = [{ id: 1, type: 1, level: 4, rarity: -1 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('rarity'))).toBe(true);
  });

  it('accepts trapTrigger IDs 1-9', () => {
    for (let trigger = 1; trigger <= 9; trigger++) {
      const cards = [{ id: 1, type: 4, level: 0, rarity: 1, trapTrigger: trigger }];
      const result = validateTcgCards(cards);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects invalid trapTrigger ID', () => {
    const cards = [{ id: 1, type: 4, level: 0, rarity: 1, trapTrigger: 10 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('trapTrigger'))).toBe(true);
  });

  it('accepts string trapTrigger names and coerces to int', () => {
    const names = [
      'onAttack', 'onOwnMonsterAttacked', 'onOpponentSummon', 'manual',
      'onOpponentSpell', 'onAnySummon', 'onOpponentTrap', 'onOppCardEffect', 'onOpponentDraw',
    ];
    for (const name of names) {
      const card = { id: 1, type: 4, level: 0, rarity: 1, trapTrigger: name } as Record<string, unknown>;
      const cards = [card];
      const result = validateTcgCards(cards);
      expect(result.valid).toBe(true);
      expect(typeof card.trapTrigger).toBe('number');
    }
  });

  it('rejects invalid string trapTrigger names', () => {
    const cards = [{ id: 1, type: 4, level: 0, rarity: 1, trapTrigger: 'invalidTrigger' }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('trapTrigger'))).toBe(true);
  });

  it('accepts any positive integer as rarity', () => {
    const cards = [{ id: 1, type: 1, level: 4, rarity: 10 }];
    const result = validateTcgCards(cards);
    expect(result.valid).toBe(true);
  });
});
