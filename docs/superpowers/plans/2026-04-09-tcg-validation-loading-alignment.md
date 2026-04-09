# TCG Validation & Loading Alignment with MOD-base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `@wynillo/tcg-format` to align with MOD-base changes: optional `value` fields in metadata JSON, deprecate TcgModJson, update validation logic.

**Architecture:** Make metadata types backward-compatible by making `value` optional. Keep validation flexible to accept both old and new formats. Mark deprecated types appropriately.

**Tech Stack:** TypeScript, JSZip, Vitest

---

### Task 1: Update TcgRaceEntry type (make value optional)

**Files:**
- Modify: `src/types.ts:141-148`

- [ ] **Step 1: Write the failing test**

Create `tests/metadata-types.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/metadata-types.test.ts`
Expected: FAIL - current types require `value` field

- [ ] **Step 3: Make value optional in types**

Modify `src/types.ts` lines 141-148:

```typescript
export interface TcgRaceEntry {
  id:     number;
  key:    string;
  value?: string;  // Optional - values may come from locales instead
  color:  string;
  icon?:  string;
}
export type TcgRacesJson = TcgRaceEntry[];
```

Modify `src/types.ts` lines 170-176:

```typescript
export interface TcgRarityEntry {
  id:    number;
  key:   string;
  value?: string;  // Optional - values may come from locales instead
  color: string;
}
export type TcgRaritiesJson = TcgRarityEntry[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/metadata-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts tests/metadata-types.test.ts
git commit -m "feat: make value optional in TcgRaceEntry and TcgRarityEntry"
```

---

### Task 2: Update tcg-validator.ts to allow metadata without value field

**Files:**
- Modify: `src/tcg-validator.ts:131-156`

- [ ] **Step 1: Write the failing test**

Add to `tests/metadata-types.test.ts`:

```typescript
import { validateTcgArchive } from '../src/tcg-validator.js';

describe('validateTcgArchive with metadata', () => {
  it('should accept rarities.json without value field', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Add minimal cards.json
    zip.file('cards.json', JSON.stringify([{ id: 1, level: 1, type: 1, rarity: 1 }]));
    zip.file('img/1.png', Buffer.alloc(1));
    
    // Add rarities.json without value field (new format)
    zip.file('rarities.json', JSON.stringify([
      { id: 1, key: 'common', color: '#cccccc' }
    ]));
    
    const result = await validateTcgArchive(zip);
    expect(result.valid).toBe(true);
    expect(result.warnings).not.toContain(expect.stringContaining('missing required field'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/metadata-types.test.ts`
Expected: FAIL - validator requires 'value' field

- [ ] **Step 3: Update validation to not require value**

Modify `src/tcg-validator.ts` lines 146-148:

```typescript
for (const field of ['id', 'key', 'color']) {
  if (!(field in item)) warnings.push(`${metaFile}[${i}] missing required field '${field}'`);
}
// value is optional - values may come from locales
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/metadata-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tcg-validator.ts tests/metadata-types.test.ts
git commit -m "feat: allow optional value field in metadata validation"
```

---

### Task 3: Check and deprecate TcgModJson

**Files:**
- Modify: `src/types.ts:178-195`
- Modify: `src/index.ts`

- [ ] **Step 1: Check if TcgModJson is used anywhere**

Run: `grep -r "TcgModJson\|modMeta" src/`

- [ ] **Step 2: Add deprecation comment**

If unused or only in types, add JSDoc deprecation to `src/types.ts`:

```typescript
// ── Mod Metadata (mod.json) ─────────────────────────────────
/** @deprecated mod.json is no longer used - manifest.json provides format versioning */
export interface TcgModJson {
  // ... existing code
}
```

- [ ] **Step 3: Remove from exports if unused**

If `modMeta` is not used in loader output, remove from `TcgLoadResult` in `src/types.ts`:

```typescript
// Remove or comment out modMeta?: TcgModJson;
```

And remove from exports in `src/index.ts`:

```typescript
// Remove: TcgModJson from exports
```

- [ ] **Step 4: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/index.ts
git commit -m "deprecate: mark TcgModJson as deprecated"
```

---

### Task 4: Verify tcg-loader.ts opponents loading

**Files:**
- Modify: `src/tcg-loader.ts` (if needed)

- [ ] **Step 1: Check current opponents loading logic**

Look at how opponents are loaded in `src/tcg-loader.ts`. Check for any assumptions about deck IDs.

- [ ] **Step 2: Run existing tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: If issues found, fix them**

Make any necessary changes to handle simplified opponents.json format.

- [ ] **Step 4: Commit**

```bash
git add src/tcg-loader.ts
git commit -m "fix: update opponents loading for simplified format"
```

---

### Task 5: Build and verify

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All PASS

- [ ] **Step 2: Build the package**

Run: `npm run build`
Expected: No errors, dist/ folder created

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: build and release"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Make `value` optional in TcgRaceEntry | Task 1 |
| Make `value` optional in TcgRarityEntry | Task 1 |
| Update validation for optional value | Task 2 |
| Deprecate TcgModJson | Task 3 |
| Verify opponents loading | Task 4 |
| Shop currency already supported | Verified - no changes needed |

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-tcg-validation-loading-alignment.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?