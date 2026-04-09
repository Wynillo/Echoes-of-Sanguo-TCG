import { describe, it, expect } from 'vitest';
import type { TcgRaceEntry, TcgRarityEntry } from '../src/types.js';
import { validateTcgArchive } from '../src/tcg-validator.js';
import JSZip from 'jszip';

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

describe('validateTcgArchive with metadata', () => {
  it('should accept rarities.json without value field', async () => {
    const zip = new JSZip();
    
    zip.file('cards.json', JSON.stringify([{ id: 1, level: 1, type: 1, rarity: 1 }]));
    zip.file('img/1.png', Buffer.alloc(1));
    
    zip.file('rarities.json', JSON.stringify([
      { id: 1, key: 'common', color: '#cccccc' }
    ]));
    
    const result = await validateTcgArchive(zip);
    expect(result.valid).toBe(true);
    expect(result.warnings).not.toContain(expect.stringContaining('missing required field'));
  });
});