import { describe, it, expect } from 'vitest';
import type { TcgRaceEntry, TcgRarityEntry } from '../src/types.js';

describe('TcgRaceEntry', () => {
  it('should accept entry with value field (old format)', () => {
    const entry: TcgRaceEntry = {
      id: 1,
      key: 'dragon',
      value: 'Dragon',
      color: '#ff0000',
    };
    expect(entry.value).toBe('Dragon');
  });

  it('should accept entry without value field (new format)', () => {
    const entry: TcgRaceEntry = {
      id: 1,
      key: 'dragon',
      color: '#ff0000',
    };
    expect(entry.value).toBeUndefined();
  });
});

describe('TcgRarityEntry', () => {
  it('should accept entry with value field (old format)', () => {
    const entry: TcgRarityEntry = {
      id: 1,
      key: 'common',
      value: 'Common',
      color: '#cccccc',
    };
    expect(entry.value).toBe('Common');
  });

  it('should accept entry without value field (new format)', () => {
    const entry: TcgRarityEntry = {
      id: 1,
      key: 'common',
      color: '#cccccc',
    };
    expect(entry.value).toBeUndefined();
  });
});