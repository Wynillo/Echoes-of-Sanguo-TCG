# TCG Validation & Loading Alignment with MOD-base

**Date:** 2026-04-09  
**Status:** Draft

## Overview

Align `@wynillo/tcg-format` library with recent changes in `@wynillo/echoes-mod-base`. The MOD-base repo underwent refactoring that requires updates to the tcg-format types and validation logic.

## Background

MOD-base recent commits:
- Refactored manifest and removed mod.json (redundant)
- Simplified opponents.json (no duplicate deck IDs)
- Removed `value` fields from races.json and rarities.json
- Enhanced shop.json with multi-currency support

## Changes Required (in tcg-format repo)

### 1. Remove or deprecate TcgModJson (`types.ts`)

MOD-base removed `mod.json` as redundant.

**Change:** Mark `TcgModJson` as deprecated or remove from exports if unused. Check if any loader code depends on `mod.json`.

### 2. Update metadata JSON types (`types.ts`)

MOD-base removed `value` fields from `races.json` and `rarities.json`.

**Current types:**
```typescript
export interface TcgRaceEntry {
  id:     number;
  key:    string;
  value:  string;  // <- being removed in MOD-base
  color:  string;
  icon?:  string;
}
```

**Change:** Make `value` optional to support both old and new formats:
```typescript
export interface TcgRaceEntry {
  id:     number;
  key:    string;
  value?: string;  // Optional - values may come from locales instead
  color:  string;
  icon?:  string;
}
```
Same for `TcgRarityEntry`.

### 3. Update tcg-validator.ts

The validation currently requires `id`, `key`, `color` fields. Ensure it handles both:
- Old format with `value` field
- New format without `value` field (values from locales)

### 4. tcg-loader.ts

Check if opponents loading needs updates for simplified `opponents.json` format (no duplicate deck IDs).

### 5. Shop currency (already supported)

`tems.ts` already has `currency` field in `TcgShopJson` (line 266) - verify it's properly loaded.

## Files Affected

| File | Changes |
|------|---------|
| `src/types.ts` | Make `value` optional in TcgRaceEntry, TcgRarityEntry; deprecate TcgModJson |
| `src/tcg-validator.ts` | Allow metadata without `value` field |
| `src/tcg-loader.ts` | Verify opponents loading works with new format |

## Testing

- Run existing tests: `npm test`
- Build: `npm run build`