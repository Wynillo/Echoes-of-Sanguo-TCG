# Opponents & Decks — Echoes of Sanguo

**Date:** 2026-04-17  
**Group:** G5  
**Dependencies:** G11 (TCG Format)  
**Estimated Time:** 1–2h

---

## Overview

Echoes of Sanguo defines opponents and their decks inside `.tcg` archives. The base set includes **39 opponents** split across two categories:

| Category | ID Range | Unlock Method | Currency |
|----------|----------|---------------|----------|
| Standard Opponents | 1–10 | Sequential wins | coins |
| Campaign Opponents | 11–39 | Campaign progression | moderncoins, ancientcoins |

Each opponent has a **behavior profile** that controls AI decision-making, a **deck** (11–34 cards), and **reward configuration** that scales with duel performance.

---

## OpponentConfig Structure

```typescript
interface OpponentConfig {
  id:          number;           // Unique opponent ID
  name:        string;           // Display name (from locale)
  title:       string;           // Honorific/title (from locale)
  race:        Race;             // Race ID for theming
  flavor:      string;           // Flavor text (from locale)
  coinsWin:    number;           // Base coins awarded on win
  coinsLoss:   number;           // Base coins awarded on loss
  currencyId?: string;           // Currency type (default: 'coins')
  deckIds:     string[];         // Array of card IDs in deck
  behaviorId?: string;           // AI profile ID
  rewardConfig?: DuelRewardConfig;  // Rank-based rewards
}
```

**Field Details:**

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Numeric ID. Base set uses 1–39. Mods should use ≥100. |
| `name` | Yes | Display name. Overridden by locale if available. |
| `title` | No | Honorific like "Novice" or "Grandmaster". |
| `race` | Yes | Race ID for visual theming (border color, icon). |
| `flavor` | No | Short description shown on hover. |
| `coinsWin` | Yes | Base reward for winning. |
| `coinsLoss` | Yes | Base reward for losing (usually 0 or small). |
| `currencyId` | No | Currency type. Options: `coins`, `moderncoins`, `ancientcoins`. |
| `deckIds` | Yes | Array of card ID strings (11–34 cards). |
| `behaviorId` | No | AI profile: `default`, `aggressive`, `defensive`, `smart`, `cheating`. |
| `rewardConfig` | No | Rank multipliers and drop pools. |

---

## Localization

Opponent names, titles, and flavor text load from `locales/{lang}.json`:

```json
{
  "opponents": {
    "1": {
      "name": "Apprentice Duelist",
      "title": "Novice",
      "flavor": "Just starting out."
    },
    "2": {
      "name": "Village Guard",
      "title": "Defender",
      "flavor": "Protects the village from stray monsters."
    }
  }
}
```

**Loading Flow:**

1. `tcg-bridge.ts` extracts `locales/en.json` (or requested language) from the `.tcg` archive
2. `applyOpponents()` maps `TcgOpponentDeck[]` to `OpponentConfig[]`
3. Locale strings override hardcoded values from `opponents.json`
4. Fallback to first available locale if requested language is missing

```typescript
// In tcg-bridge.ts:applyOpponents()
const desc = oppDescMap.get(o.id);
return {
  id: o.id,
  name: desc?.name ?? o.name ?? `Opponent #${o.id}`,
  title: desc?.title ?? o.title ?? '',
  flavor: desc?.flavor ?? o.flavor ?? '',
  // ...
};
```

---

## Base Set Opponents

### ID Ranges

| Range | Type | Count | Unlock Logic |
|-------|------|-------|--------------|
| 1–10 | Standard | 10 | Sequential (beat #1 to unlock #2) |
| 11–39 | Campaign | 29 | Campaign node completion |

### Currencies by Opponent

| Opponent IDs | Currency | Description |
|--------------|----------|-------------|
| 1–10 | `coins` | Standard Jade Coins |
| 11–25 | `moderncoins` | Modern-era campaign currency |
| 26–39 | `ancientcoins` | Ancient-era campaign currency |

**Example opponent definitions:**

```json
// opponents.json (excerpt)
[
  {
    "id": 1,
    "name": "Apprentice Duelist",
    "title": "Novice",
    "race": 1,
    "flavor": "Just starting out.",
    "coinsWin": 100,
    "coinsLoss": 10,
    "currencyId": "coins",
    "deckIds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    "behaviorId": "default"
  },
  {
    "id": 11,
    "name": "Warlord Zhang",
    "title": "Commander",
    "race": 2,
    "flavor": "Leads the northern armies.",
    "coinsWin": 500,
    "coinsLoss": 50,
    "currencyId": "moderncoins",
    "deckIds": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
    "behaviorId": "aggressive",
    "rewardConfig": {
      "mode": "campaign",
      "ranks": {
        "S": { "coinMultiplier": 3.0, "cardDropCount": 5 },
        "A": { "coinMultiplier": 1.5, "cardDropCount": 2 },
        "B": { "coinMultiplier": 1.0, "cardDropCount": 0 }
      }
    }
  }
]
```

---

## Starter Decks

Starter decks are defined in `starterDecks.json` within the `.tcg` archive:

```json
{
  "1": [1, 2, 3, 4, 5],
  "2": [6, 7, 8, 9, 10],
  "3": [11, 12, 13, 14, 15],
  "4": [16, 17, 18, 19, 20]
}
```

**Structure:**

| Key | Value | Description |
|-----|-------|-------------|
| Race ID (string) | Card ID array (numbers) | 5 starter cards for that race |

**Race Mapping (Base Set):**

| Race ID | Race | Starter Cards |
|---------|------|---------------|
| 1 | Warrior | Cards 1–5 |
| 2 | Dragon | Cards 6–10 |
| 3 | Spellcaster | Cards 11–15 |
| 4 | Beast | Cards 16–20 |

**Loading:** `tcg-bridge.ts:extractExtraDataFromZip()` reads `starterDecks.json` and calls `applyStarterDecks()`, which converts numeric IDs to strings and populates `STARTER_DECKS[raceId]`.

---

## Opponent Decks

Opponent decks are stored in the `tcg-src/opponents/` directory within the `.tcg` archive. Each deck is a JSON file containing an array of card IDs.

**File Structure:**

```
base.tcg (ZIP)
├── tcg-src/
│   └── opponents/
│       ├── opponent_01.json    // Apprentice Duelist
│       ├── opponent_02.json    // Village Guard
│       └── ...
```

**Deck Size Guidelines:**

| Difficulty | Card Count | Description |
|------------|------------|-------------|
| Easy | 11–15 cards | Early opponents, simple strategies |
| Medium | 16–25 cards | Mid-game opponents |
| Hard | 26–34 cards | Late-game and boss opponents |

**Example deck file:**

```json
// tcg-src/opponents/opponent_01.json
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
```

The `deckIds` field in `opponents.json` references these card IDs directly.

---

## Unlock Conditions

### Sequential Unlock (Standard Opponents 1–10)

Standard opponents unlock in sequence. Beating opponent #1 unlocks #2, and so on.

**Implementation in `progression.ts`:**

```typescript
function recordDuelResult(opponentId: number | string, won: boolean): void {
  const id = parseInt(opponentId as string, 10);
  const ops = getOpponents();
  if (!ops[id]) return;

  if (won) {
    ops[id].wins++;
    // Sequential unlock: winning unlocks the next opponent
    if (id < OPPONENT_COUNT && ops[id + 1] && !ops[id + 1].unlocked) {
      ops[id + 1].unlocked = true;
    }
  } else {
    ops[id].losses++;
  }
  _save(_key(SLOT_KEY_NAMES.opponents), ops);
}
```

**Initial State:**

```typescript
function _defaultOpponents(): Record<number, OpponentRecord> {
  const ops: Record<number, OpponentRecord> = {};
  for (let i = 1; i <= OPPONENT_COUNT; i++) {
    ops[i] = { unlocked: i === 1, wins: 0, losses: 0 };  // Only #1 unlocked
  }
  return ops;
}
```

### Campaign Unlock (Opponents 11–39)

Campaign opponents are unlocked by completing campaign nodes, not by sequential wins. See `docs/campaign.md` for details.

**Key Difference:** Campaign opponents do NOT use `recordDuelResult()` for unlocking. Their availability is determined by `CampaignProgress.completedNodes`.

---

## Reward Config

The `DuelRewardConfig` interface defines rank-based multipliers and card drops:

```typescript
interface DuelRewardConfig {
  mode?: 'campaign' | 'free' | 'both';  // When this config applies
  ranks: {
    S: RankRewardEffect;
    A: RankRewardEffect;
    B: RankRewardEffect;
  };
  dropPool?: DropPoolEntry[];  // Weighted card drop table
}

interface RankRewardEffect {
  coinMultiplier: number;      // Multiplier for base coins
  cardDropCount: number;       // Number of card drops
  rarityRates?: Partial<Record<Rarity, number>>;  // Drop rate modifiers
  currencyId?: string;         // Override currency for this rank
}

interface DropPoolEntry {
  cardId: string;
  weight: number;  // Higher = more likely
}
```

### Default Multipliers

| Rank | Coin Multiplier | Card Drops | Description |
|------|-----------------|------------|-------------|
| S | 2.5x | 3 cards | Excellent performance |
| A | 1.0x | 0 cards | Standard win |
| B | 0.8x | 0 cards | Barely won |

**Default config:**

```typescript
export const DEFAULT_REWARD_CONFIG: DuelRewardConfig = {
  mode: 'both',
  ranks: {
    S: { coinMultiplier: 2.5, cardDropCount: 3 },
    A: { coinMultiplier: 1.0, cardDropCount: 0 },
    B: { coinMultiplier: 0.8, cardDropCount: 0 },
  },
};
```

**Custom reward config example:**

```json
{
  "rewardConfig": {
    "mode": "campaign",
    "ranks": {
      "S": { "coinMultiplier": 3.0, "cardDropCount": 5, "currencyId": "moderncoins" },
      "A": { "coinMultiplier": 1.5, "cardDropCount": 2 },
      "B": { "coinMultiplier": 1.0, "cardDropCount": 0 }
    },
    "dropPool": [
      { "cardId": "rare_dragon_01", "weight": 10 },
      { "cardId": "common_warrior_01", "weight": 50 }
    ]
  }
}
```

---

## AI Behavior Profiles

Each opponent can be assigned one of 5 AI behavior profiles. These are defined in `ai-behaviors.ts` and control decision-making.

| Profile ID | Strategy | Position | Battle | Special Features |
|------------|----------|----------|--------|------------------|
| `default` | Balanced | Smart | Smart | Standard behavior |
| `aggressive` | Swarm aggro | Always ATK | Always attack | Fusion first, no caution |
| `defensive` | Stall/drain | Always DEF | Conservative | Fusion only at 2000+ ATK |
| `smart` | Control | Smart | Smart | Holds fusion pieces, evaluates board |
| `cheating` | OTK fusion | Always ATK | Always attack | Peeks deck, knows player hand |

**Profile Details:**

```typescript
// Default - balanced play
const DEFAULT: AIBehavior = {
  fusionFirst: true,
  summonPriority: 'highestATK',
  positionStrategy: 'smart',
  battleStrategy: 'smart',
};

// Aggressive - always attacking
const AGGRESSIVE: AIBehavior = {
  fusionFirst: true,
  summonPriority: 'highestATK',
  positionStrategy: 'aggressive',  // Always ATK
  battleStrategy: 'aggressive',    // Always attack
  goal: { id: 'swarm_aggro', alignmentBonus: 800 },
};

// Smart - evaluates board state
const SMART: AIBehavior = {
  fusionFirst: true,
  summonPriority: 'effectFirst',   // Prioritize effect monsters
  positionStrategy: 'smart',
  battleStrategy: 'smart',
  goal: { id: 'control', alignmentBonus: 600 },
  holdFusionPiece: true,           // Save fusion materials
};

// Cheating - has hidden information
const CHEATING: AIBehavior = {
  fusionFirst: true,
  summonPriority: 'highestATK',
  positionStrategy: 'aggressive',
  battleStrategy: 'aggressive',
  knowsPlayerHand: true,           // Sees player hand
  peekDeckCards: 5,                // Peeks top 5 cards
  peekPlayerDeck: 1,               // Peeks player deck
};
```

See `docs/ai-system.md` for complete AI documentation.

---

## Opponent Loading Flow

The `tcg-bridge.ts` module handles loading opponents from `.tcg` archives:

```
1. loadAndApplyTcg(source)
   ↓
2. Extract ZIP (jszip)
   ↓
3. Extract locales/{lang}.json
   ↓
4. Call loadTcgFile() from @wynillo/tcg-format
   ↓
5. Extract opponentDescriptions from result
   ↓
6. applyOpponents(result.opponents, locale.opponents)
   ↓
7. Map TcgOpponentDeck[] → OpponentConfig[]
   ↓
8. Push to OPPONENT_CONFIGS array
   ↓
9. Track loaded opponent IDs for unload support
```

**Key Code:**

```typescript
// In tcg-bridge.ts
function applyOpponents(
  tcgOpponents: TcgOpponentDeck[],
  oppDescs?: TcgOpponentDescription[],
): number[] {
  const addedOpponentIds: number[] = [];
  const oppDescMap = new Map<number, TcgOpponentDescription>();
  if (oppDescs) {
    for (const d of oppDescs) oppDescMap.set(d.id, d);
  }
  const configs: OpponentConfig[] = tcgOpponents.map(o => {
    const desc = oppDescMap.get(o.id);
    addedOpponentIds.push(o.id);
    return {
      id: o.id,
      name: desc?.name ?? o.name ?? `Opponent #${o.id}`,
      title: desc?.title ?? o.title ?? '',
      race: o.race,
      flavor: desc?.flavor ?? o.flavor ?? '',
      coinsWin: o.coinsWin,
      coinsLoss: o.coinsLoss,
      deckIds: o.deckIds.map(id => String(id)),
      behaviorId: o.behaviorId,
      currencyId: o.currencyId,
      rewardConfig: o.rewardConfig as any,
    };
  });
  OPPONENT_CONFIGS.push(...configs);
  return addedOpponentIds;
}
```

---

## OpponentScreen Filter

The `OpponentScreen` component (free duel mode) only shows opponents that have been beaten in the campaign:

```typescript
// In OpponentScreen.tsx
const beatenInCampaign = useMemo(() => {
  const ids = new Set<number>();
  for (const chapter of campaignData.chapters) {
    for (const node of chapter.nodes) {
      if (node.type === 'duel' && node.opponentId !== undefined 
          && progress.completedNodes.includes(node.id)) {
        ids.add(node.opponentId);
      }
    }
  }
  return ids;
}, [campaignData, progress.completedNodes]);

// Filter displayed opponents
OPPONENT_CONFIGS.filter(cfg => beatenInCampaign.has(cfg.id))
```

**Key Points:**

- Free duel opponents must be beaten in campaign first
- Sequential unlock (1–10) is separate from campaign unlock (11–39)
- The screen shows win/loss records from `Progression.getOpponents()`

---

## Examples

### Adding a Custom Opponent via Mod API

```typescript
// Access the mod API
const mod = window.EchoesOfSanguoMod;

// Define opponent config
const myOpponent: OpponentConfig = {
  id: 100,  // Use >= 100 for mods
  name: "Mod Duelist",
  title: "Custom",
  race: 1,
  flavor: "A challenger from the modding community.",
  coinsWin: 200,
  coinsLoss: 20,
  currencyId: "coins",
  deckIds: ["mod_card_01", "mod_card_02", "mod_card_03"],
  behaviorId: "smart",
  rewardConfig: {
    ranks: {
      S: { coinMultiplier: 2.0, cardDropCount: 2 },
      A: { coinMultiplier: 1.0, cardDropCount: 0 },
      B: { coinMultiplier: 0.8, cardDropCount: 0 }
    }
  }
};

// Register the opponent
mod.OPPONENT_CONFIGS.push(myOpponent);

// Now the opponent appears in free duel (if campaign-beaten logic is bypassed)
// or can be referenced in custom campaign nodes
```

### Reading Opponent Records

```typescript
import { Progression } from './progression.js';

// Get all opponent records
const opponents = Progression.getOpponents();

// Check if opponent is unlocked
const isUnlocked = Progression.isOpponentUnlocked(5);

// Get specific opponent data
const opp5 = opponents[5];
console.log(`Wins: ${opp5.wins}, Losses: ${opp5.losses}`);

// Record a duel result (for custom modes)
Progression.recordDuelResult(5, true);  // Won against opponent #5
```

### Loading Opponents from a Custom .tcg

```typescript
const mod = window.EchoesOfSanguoMod;

// Load a custom TCG pack
await mod.loadModTcg('https://example.com/mymod.tcg');

// Opponents from the pack are now in OPPONENT_CONFIGS
console.log('Loaded opponents:', mod.OPPONENT_CONFIGS.length);

// Unload if needed (removes cards and opponents only)
mod.unloadModCards('https://example.com/mymod.tcg');
```

---

## Dependencies

| File | Responsibility |
|------|----------------|
| `src/tcg-bridge.ts` | Loads opponents from `.tcg`, applies locales |
| `src/progression.ts` | Tracks wins/losses, handles unlock logic |
| `src/types.ts` | `OpponentConfig`, `OpponentRecord` interfaces |
| `src/campaign-duel-result.ts` | Applies rank multipliers, card drops |
| `src/ai-behaviors.ts` | Behavior profile definitions |
| `src/reward-config.ts` | `DuelRewardConfig`, rank effects |
| `src/cards.ts` | `OPPONENT_CONFIGS` array, `STARTER_DECKS` |
| `src/mod-api.ts` | Exposes `OPPONENT_CONFIGS` to modders |

---

## Notes / Gotchas

### 1. Opponent IDs are Global

Opponent IDs must be unique across all loaded mods. The base set uses 1–39. **Mods should use IDs ≥ 100** to avoid collisions.

```typescript
// Good: Mod uses high ID
const modOpponent = { id: 101, ... };

// Bad: Mod collides with base set
const modOpponent = { id: 5, ... };  // Overwrites base opponent!
```

### 2. Campaign Opponents Do Not Use Sequential Unlock

Opponents 11–39 are campaign-locked, not sequentially unlocked. Beating opponent #11 does NOT unlock #12. Unlocking is controlled by campaign node completion.

```typescript
// This only applies to IDs 1–10
if (id < OPPONENT_COUNT && ops[id + 1]) {
  ops[id + 1].unlocked = true;  // Sequential unlock
}
```

### 3. Currency Switching Can Be Confusing

Different opponents award different currencies. The UI should clearly indicate which currency is being awarded.

| Opponent | Currency | Use Case |
|----------|----------|----------|
| 1–10 | `coins` | General shop purchases |
| 11–25 | `moderncoins` | Modern-era shop tiers |
| 26–39 | `ancientcoins` | Ancient-era shop tiers |

### 4. Starter Decks Have Exactly 5 Cards

Starter decks are intentionally small (5 cards). The player builds their full 40-card deck through the shop and campaign rewards.

```json
{
  "1": [1, 2, 3, 4, 5]  // Exactly 5 cards per race
}
```

### 5. Deck Size Limits

Opponent decks should stay within 11–34 cards. The engine enforces no hard limit, but extremely large decks may cause balance issues.

### 6. Behavior ID Fallback

If an opponent references an unknown `behaviorId`, the AI falls back to `default`:

```typescript
export function resolveAIBehavior(id?: string): Required<AIBehavior> {
  const base = (id ? AI_BEHAVIOR_REGISTRY.get(id) : undefined) ?? DEFAULT;
  // ...
}
```

### 7. Locale Override Priority

Locale strings always override hardcoded values:

```typescript
name: desc?.name ?? o.name ?? `Opponent #${o.id}`
//     ^ locale   ^ hardcoded   ^ fallback
```

### 8. Partial Unload Limitations

`unloadModCards()` only removes cards and opponents. Fusion recipes, shop data, campaign data, rules, and type metadata from the mod are NOT reverted.

```typescript
console.warn('unloadModCards: partial unload — fusion formulas, shop data, 
  campaign data, rules, and type metadata from this mod are NOT reverted.');
```

---

## References

- **TCG Format** → `docs/tcg-format.md` (G11)
- **AI System** → `docs/ai-system.md` (G3)
- **Campaign** → `docs/campaign.md` (G6)
- **Mod API** → `docs/mod-api.md` (G10)
- **Shop & Progression** → `docs/shop-progression.md` (G7)

---

**Status:** Complete
