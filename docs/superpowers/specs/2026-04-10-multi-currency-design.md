# Multi-Currency Support

**Date:** 2026-04-10
**Status:** Approved

## Problem

The current shop and progression system supports exactly one currency ("Jade Coins"). Modders cannot define additional currencies, and rewards cannot vary by currency type. The `shop.json` in Echoes-of-sanguo-MOD-base introduces a `currencies[]` array and per-pack `currency` fields, but the engine ignores them.

## Solution

Extend the engine, data schema, and UI to support multiple named currencies with sparse per-slot storage. Rewards can specify which currency they pay out. The shop shows currency-gated sections.

---

## 1 — Data Schema

### `src/shop-data.ts`

`ShopData` gains a `currencies` array. The existing `currency` field (singleton display info) is replaced.

```typescript
interface CurrencyDef {
  id: string;        // "coins" | "moderncoins" | "ancientcoins"; derived from nameKey if absent
  nameKey: string;   // i18n key: "common.coins"
  icon: string;      // "◈"
}
```

`SHOP_DATA.currencies` defaults to `[{ id: 'coins', nameKey: 'common.coins', icon: '\u25c8' }]`.

`applyShopData` merges incoming `currencies` into `SHOP_DATA.currencies` by `id` (upsert), replacing conflicting entries.

**ID inference:** If a currency entry has no `id` field, derive it as `nameKey.split('.')[1]` (e.g., `"common.ancientcoins"` → `"ancientcoins"`). This handles both explicit-ID and nameKey-derived currencies.

### Back-compat for existing shop.json

Packs with `price` as a plain number use currency `"coins"`. The mod's `tier_6_warlord` has `"currency": ""` (empty string) — treated as invalid and ignored; pack falls back to `price` as number or `"coins"`.

---

## 2 — Storage & Engine API

### Storage keys

Per-slot per-currency: `tcg_s{slot}_currency_{id}` (e.g., `tcg_s1_currency_ancientcoins`).

### `src/currencies.ts` (new file)

```typescript
export function getCurrency(slot: SlotId, currencyId: string): number
export function addCurrency(slot: SlotId, currencyId: string, amount: number): number
export function spendCurrency(slot: SlotId, currencyId: string, amount: number): boolean
```

- `getCurrency` returns `0` if the localStorage key is absent — zero-code auto-migration for old saves.
- `addCurrency` creates the key on first addition.
- `spendCurrency` returns `false` if insufficient balance; otherwise deducts and returns `true`.

### `src/progression.ts` — legacy aliases

```typescript
function getCoins(): number   // → getCurrency(slot, "coins")
function addCoins(amt): number
function spendCoins(amt): boolean
```

Existing code (e.g., `ShopScreen.buyPack`) continues to use these unchanged. The `SLOT_KEY_NAMES.coins` key `tcg_s{slot}_jade_coins` is the canonical storage for the `"coins"` currency.

`getSlotMeta()` reads `coins` from `SHOP_DATA.currencies[0].id` via `getCurrency(slot, "coins")` to keep the slot meta consistent.

`updateSlotMeta()` is unchanged — it persists `coins` to `tcg_slot_meta`, which is display-only.

---

## 3 — Reward Configs

### `src/types.ts` — `OpponentConfig`

```typescript
interface OpponentConfig {
  id: number;
  name: string;
  title: string;
  race: Race;
  flavor: string;
  coinsWin: number;        // legacy — rewards currency "coins"
  coinsLoss: number;
  currencyId?: string;     // optional override
  deckIds: string[];
  behaviorId?: string;
  rewardConfig?: DuelRewardConfig;
}
```

`currencyId` defaults to `"coins"` when absent.

### `src/campaign-types.ts` — `NodeRewards`

```typescript
interface NodeRewards {
  coins?: number;          // legacy — rewards currency "coins"
  currencyId?: string;      // optional override
  cards?: string[];
  unlocks?: string[];
}
```

### `src/reward-config.ts` — `RankRewardEffect`

```typescript
interface RankRewardEffect {
  coinMultiplier: number;   // applied to the reward currency amount
  cardDropCount: number;
  rarityRates?: Partial<Record<Rarity, number>>;
  currencyId?: string;      // optional override (default: inherited from parent)
}
```

---

## 4 — React State

### `ProgressionContext.tsx`

```typescript
interface ProgressionCtx {
  coins: number;                      // legacy alias: currencies['coins'] ?? 0
  currencies: Record<string, number>;  // all balances (sparse)
  refresh: () => void;
  // ...existing fields...
}
```

`refresh()` re-reads all currency keys via `getCurrency(slot, id)` for every currency in `SHOP_DATA.currencies`, building `currencies`. The `coins` field is kept for backward compatibility with existing UI bindings that read `coins` directly.

---

## 5 — Shop Screen UI

### Layout

The shop displays one **section per currency** from `SHOP_DATA.currencies`. Sections are ordered as they appear in the array.

Each section has a header showing `{icon} {name} — {balance}`. Below it, a grid of pack tiles filtered to that currency.

### Currency gating by chapter

Sections are gated by chapter progress. The gate config is defined as a constant in `ShopScreen.tsx`:

```typescript
const CURRENCY_GATE: Record<string, number> = {
  coins: 1,
  moderncoins: 3,
  ancientcoins: 6,
};
```

If `currentChapter` number < required chapter, the section is hidden. Modders can override this by providing a `requiredChapter` field on `CurrencyDef`, falling back to the constant map, then to chapter 1.

### Pack tile

Price display shows the currency icon + amount. The buy button is disabled with tooltip `"Not enough {currencyName}"` when `balance < price.amount`. If the pack's `currencyId` is not in `currencies`, it falls back to showing the pack as unaffordable.

### `ShopScreen.buyPack`

```typescript
function buyPack(packId: string) {
  const pkg = SHOP_DATA.packs.find(p => p.id === packId);
  if (!pkg) return;
  const { currencyId, amount } = normalisePackPrice(pkg.price);
  if (!Progression.spendCurrency(currencyId, amount)) return;
  // ...existing: open pack, add cards, refresh, navigate
}
```

`normalisePackPrice` handles both legacy `number` and new `{ currencyId, amount }` price shapes.

---

## 6 — Duel Result & Node Reward Flow

When awarding currency after a duel or node completion, resolve `currencyId` from `rewardConfig` → `opponentConfig` → `NodeRewards` → default `"coins"`. Call `addCurrency(slot, currencyId, amount)`.

---

## 7 — Slot Meta Display

`SavePointScreen` shows `coins` from `ProgressionContext` (already wired). If a mod adds currencies, their balances are not shown in the slot meta — only the `coins` balance is stored there. This is intentional; full multi-currency display in save slots is a follow-up concern.

---

## 8 — i18n Keys

Modders adding currencies must provide i18n keys for `common.{currencyId}`. If a `nameKey` resolves to a missing key, the currency `id` is displayed as fallback.

Initial keys needed in `locales/en.json`:

```json
{
  "common": {
    "coins": "Jade Coins",
    "moderncoins": "Modern Coins",
    "ancientcoins": "Ancient Coins"
  }
}
```

---

## Critical Files

| File | Change |
|---|---|
| `src/currencies.ts` | **New** — engine currency API |
| `src/shop-data.ts` | Add `CurrencyDef`, `PackPrice`, update `ShopData` and `PackDef`, update `applyShopData` |
| `src/types.ts` | Add `currencyId?: string` to `OpponentConfig` |
| `src/campaign-types.ts` | Add `currencyId?: string` to `NodeRewards` |
| `src/reward-config.ts` | Add `currencyId?: string` to `RankRewardEffect` |
| `src/progression.ts` | Update `getCoins`/`addCoins`/`spendCoins` to delegate to `getCurrency`/`addCurrency`/`spendCurrency`; update `getSlotMeta` |
| `src/react/contexts/ProgressionContext.tsx` | Add `currencies` map to context, update `refresh` |
| `src/react/screens/ShopScreen.tsx` | Currency sections, gated by chapter, per-currency price display, disabled-state tooltip |
| `locales/en.json` | Add `moderncoins`, `ancientcoins` keys |

---

## Verification

1. Load any existing save — no errors, `coins` balance unchanged
2. Load a `.tcg` pack with `currencies[]` — `SHOP_DATA.currencies` has multiple entries
3. Buy a pack priced in a non-default currency — balance deducted, pack opened
4. Buy a pack with insufficient balance — button disabled, no purchase
5. Complete a campaign node that awards a non-coins currency — balance increases
6. Shop shows sections only for currencies whose chapter requirement is met
7. Duel result shows correct currency earned
8. `npm test` — no regressions
9. `npm run build` — clean build
