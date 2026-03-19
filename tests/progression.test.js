// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Progression } from '../js/progression.ts';

beforeEach(() => {
  localStorage.clear();
  Progression.init();
});

describe('coins', () => {
  it('starts at 0', () => { expect(Progression.getCoins()).toBe(0); });

  it('addCoins increases balance', () => {
    Progression.addCoins(100);
    expect(Progression.getCoins()).toBe(100);
  });

  it('addCoins ignores negative amounts', () => {
    Progression.addCoins(-50);
    expect(Progression.getCoins()).toBe(0);
  });

  it('spendCoins deducts when sufficient', () => {
    Progression.addCoins(200);
    expect(Progression.spendCoins(100)).toBe(true);
    expect(Progression.getCoins()).toBe(100);
  });

  it('spendCoins returns false when insufficient', () => {
    expect(Progression.spendCoins(100)).toBe(false);
    expect(Progression.getCoins()).toBe(0);
  });
});

describe('collection', () => {
  it('starts empty', () => { expect(Progression.getCollection()).toEqual([]); });

  it('addCardsToCollection tracks counts', () => {
    Progression.addCardsToCollection(['M001', 'M001', 'M002']);
    expect(Progression.cardCount('M001')).toBe(2);
    expect(Progression.cardCount('M002')).toBe(1);
  });

  it('ownsCard returns false for unowned card', () => {
    expect(Progression.ownsCard('M001')).toBe(false);
  });

  it('ownsCard returns true after adding', () => {
    Progression.addCardsToCollection(['M001']);
    expect(Progression.ownsCard('M001')).toBe(true);
  });
});

describe('deck', () => {
  it('getDeck returns null before saving', () => {
    expect(Progression.getDeck()).toBeNull();
  });

  it('saveDeck persists and getDeck retrieves', () => {
    Progression.saveDeck(['M001', 'M002', 'S001']);
    expect(Progression.getDeck()).toEqual(['M001', 'M002', 'S001']);
  });
});

describe('opponents', () => {
  it('only opponent 1 is unlocked initially', () => {
    const ops = Progression.getOpponents();
    expect(ops[1].unlocked).toBe(true);
    expect(ops[2].unlocked).toBe(false);
  });

  it('winning unlocks next opponent', () => {
    Progression.recordDuelResult(1, true);
    expect(Progression.getOpponents()[2].unlocked).toBe(true);
  });

  it('winning increments wins counter', () => {
    Progression.recordDuelResult(1, true);
    expect(Progression.getOpponents()[1].wins).toBe(1);
  });

  it('losing increments losses counter', () => {
    Progression.recordDuelResult(1, false);
    expect(Progression.getOpponents()[1].losses).toBe(1);
  });

  it('isOpponentUnlocked returns true for unlocked id', () => {
    expect(Progression.isOpponentUnlocked(1)).toBe(true);
  });

  it('isOpponentUnlocked returns false for locked id', () => {
    expect(Progression.isOpponentUnlocked(2)).toBe(false);
  });
});
