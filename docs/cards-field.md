# Cards & Field — Echoes of Sanguo

**Date**: 2026-04-16  
**Group**: G4  
**Dependencies**: — (Foundation for G2, G1, G8, G11)

---

## Overview

This documentation describes the data structures for **cards** (CardData) and their representation **on the field** (FieldCard, FieldSpellTrap). All cards are loaded at runtime from the `.tcg` archive and registered in `CARD_DB`.

**Core Components**:
- `CardData` — Static card data (name, ATK, DEF, effect)
- `FieldCard` — Runtime instance of a monster on the field (with bonuses, flags, state)
- `FieldSpellTrap` — Runtime instance of a Spell/Trap card
- `CARD_DB` — Global card database
- Fusion System — Recipes and formulas for fusions

---

## Architecture

### Data Flow

```
.tcg Archive (ZIP)
       ↓
loadAndApplyTcg() (tcg-bridge.ts)
       ↓
CARD_DB [string → CardData]
       ↓
makeDeck(ids: string[]) → CardData[]
       ↓
summonMonster() → new FieldCard(card, position, faceDown)
       ↓
Battle / Effects modify FieldCard
```

### Layers

| Layer | File | Responsibility |
|-------|------|----------------|
| **Data** | `src/types.ts` | `CardData` interface, types |
| **Instances** | `src/field.ts` | `FieldCard`, `FieldSpellTrap` classes |
| **Database** | `src/cards.ts` | `CARD_DB`, fusion logic, decks |
| **Metadata** | `src/type-metadata.ts` | Race, Attribute, Rarity, CardType meta |
| **Enums** | `src/enums.ts` | Int ↔ Enum converters |

---

## Key Types & Interfaces

### CardData

Static card data — created when loading from `.tcg`.

```typescript
interface CardData {
  id:           string;         // Unique ID (e.g., "kurama", "1", "mod:dragon_01")
  name:         string;         // Display name (from locale)
  type:         CardType;       // Monster=1, Fusion=2, Spell=3, Trap=4, Equipment=5
  attribute?:   Attribute;      // Attribute ID (Light, Dark, Fire, etc.)
  race?:        Race;           // Race ID (Warrior, Dragon, Spellcaster, etc.)
  rarity?:      Rarity;         // Rarity (Common, Rare, SR, UR)
  level?:       number;         // Level 1–9 (for monsters)
  atk?:         number;         // Attack points (monsters)
  def?:         number;         // Defense points (monsters)
  description:  string;         // Card description (from locale)
  effect?:      CardEffectBlock; // Single effect block
  effects?:     CardEffectBlock[]; // Multiple effect blocks
  spirit?:      boolean;        // Spirit monster (returns to deck when destroyed)
  trapTrigger?: TrapTrigger;    // Trap trigger type (for traps)
  target?:      string;         // Target specification (for targeted spells)
  atkBonus?:    number;         // ATK bonus (equip cards)
  defBonus?:    number;         // DEF bonus (equip cards)
  equipRequirement?: EquipRequirement; // Requirement for equipment
}
```

**Note**: `effect` (singular) and `effects` (plural) are **mutually exclusive**. A card has either one effect block or multiple, never both.

### CardType Enum

```typescript
enum CardType {
  Monster   = 1,    // Normal and effect monsters
  Fusion    = 2,    // Fusion monsters
  Spell     = 3,    // Spell cards
  Trap      = 4,    // Trap cards
  Equipment = 5,    // Equipment spells
}
```

### FieldCard (Class)

Runtime representation of a monster **on the field**. Contains bonuses, flags, and state tracking.

```typescript
class FieldCard {
  // ——— Core Properties ———
  card:             CardData;                              // Reference to static card data
  position:         Position;                              // 'atk' | 'def'
  faceDown:         boolean;                               // Face-down?
  hasAttacked:      boolean;                               // Attacked this turn
  hasFlipSummoned:  boolean;                               // Flip summon performed
  summonedThisTurn: boolean;                               // Summoning sickness
  phoenixRevivalUsed: boolean;                             // Phoenix revival used
  
  // ——— Temporary Bonuses (reset per turn) ———
  tempATKBonus:     number;
  tempDEFBonus:     number;
  
  // ——— Permanent Bonuses (until card leaves field) ———
  permATKBonus:     number;
  permDEFBonus:     number;
  
  // ——— Field Spell Bonuses ———
  fieldSpellATKBonus: number;
  fieldSpellDEFBonus: number;
  
  // ——— Passive Flags (extracted from effects) ———
  piercing:         boolean;         // piercing damage vs DEF
  cannotBeTargeted: boolean;         // cannot be targeted by effects/attacks
  canDirectAttack:  boolean;         // can attack player directly
  phoenixRevival:   boolean;         // revive when destroyed
  indestructible:   boolean;         // cannot be destroyed
  effectImmune:     boolean;         // immune to card effects
  cantBeAttacked:   boolean;         // cannot be attacked
  
  // ——— Equipment ———
  equippedCards:    Array<{ zone: number; card: CardData }>;
  originalOwner?:   Owner;           // Original owner (for stolen cards)
  
  // ——— Methods ———
  _getPassiveBlocks(): CardEffectBlock[];  // Extract passive effect blocks
  effectiveATK():   number;            // Calculate: base + temp + perm + fieldSpell
  effectiveDEF():   number;            // Calculate: base + temp + perm + fieldSpell
  combatValue():    number;            // Returns ATK (if 'atk') or DEF (if 'def')
}
```

### FieldSpellTrap (Class)

Runtime representation of a Spell/Trap card on the field.

```typescript
class FieldSpellTrap {
  card:               CardData;        // Reference to static card data
  faceDown:           boolean;         // Face-down?
  used:               boolean;         // Already activated (for traps)
  equippedMonsterZone?: number;        // Target monster zone (for equipment)
  equippedOwner?:     Owner;           // Target owner (for equipment)
}
```

### Type Metadata

```typescript
interface RaceMeta {
  id:     number;      // Numeric ID
  key:    string;      // PascalCase identifier (e.g., 'Dragon', 'Warrior')
  value:  string;      // Localized display name
  color:  string;      // Hex color code
  icon?:  string;      // react-icons/gi identifier (e.g., 'GiDragonHead')
}

interface AttributeMeta {
  id:     number;      // Numeric ID
  key:    string;      // PascalCase (e.g., 'Light', 'Fire', 'Dark')
  value:  string;      // Localized name
  color:  string;      // Orb color
  symbol?: string;     // Symbol character
}

interface RarityMeta {
  id:     number;      // Numeric ID
  key:    string;      // PascalCase (e.g., 'Common', 'UltraRare')
  value:  string;      // Display name
  color:  string;      // Display color
}
```

**Note**: Metadata is loaded at runtime from the `.tcg` archive. Default values can be set in `type-metadata.ts:initDefaults()`.

---

## API / Methods

### Card Database (`src/cards.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `makeDeck()` | `(ids: string[]) => CardData[]` | Creates deck from card IDs. Unknown IDs are skipped. |
| `checkFusion()` | `(id1: string, id2: string) => FusionRecipe \| null` | Checks 2-card fusion (recipe or formula). |
| `resolveFusionChain()` | `(cardIds: string[]) => FusionChainResult` | Multi-card fusion (sequential processing). |
| `getFusionHints()` | `(cardId: string) => FusionHint[]` | How to obtain this card? (recipes/formulas). |

### Fusion Types

```typescript
interface FusionRecipe {
  materials: [string, string];  // Two material card IDs
  result:    string;             // Result card ID
}

interface FusionFormula {
  id:         string;            // Formula ID
  comboType:  FusionComboType;   // 'race+race' | 'race+attr' | 'attr+attr'
  operand1:   number;            // Race or Attribute ID
  operand2:   number;            // Race or Attribute ID
  priority:   number;            // Higher = checked first
  resultPool: string[];          // Possible fusion results
}

type FusionComboType = 'race+race' | 'race+attr' | 'attr+attr';

interface FusionChainResult {
  finalCardId: string;           // Final card ID
  steps: FusionChainStep[];      // Each step of the chain
  consumedIds: string[];         // All consumed card IDs
}
```

### Fusion Logic (Rules)

**2-Card Fusion **(`checkFusion`)

1. **Explicit recipe** has priority (if in `FUSION_RECIPES`)
2. **Type-based formula** (fallback):
   - Both cards must be monsters
   - `comboType` checks Race/Attribute combination
   - `priority` determines order (higher first)

**Result Selection**:
- Result ATK ≥ max(Material ATK)
- Among all matching: **lowest** ATK is chosen

**Multi-Card Fusion **(`resolveFusionChain`)

```
Cards: [A, B, C, D]
Step 1: A + B → Fusion (both consumed) → Result R1
Step 2: R1 + C → No fusion, C is monster → Keep C, discard R1
Step 3: C + D → Fusion → Final Result
```

**Fallback Rules **(when no fusion)
- If exactly one card is monster → Keep monster, discard other
- If both/neither are monsters → discard inputA, keep inputB

---

## Examples

### Get card from `CARD_DB`

```typescript
const card = CARD_DB['kurama'];
if (!card) {
  console.warn('Card not found!');
}
```

### Create deck

```typescript
import { makeDeck } from './cards.js';

const deckIds = ['kurama', 'harpie', 'dragon_piper'];
const deck = makeDeck(deckIds);
// deck: CardData[]
```

### Check fusion

```typescript
import { checkFusion } from './cards.js';

const recipe = checkFusion('kurama', 'dragon_piper');
if (recipe) {
  console.log(`Fusion: → ${CARD_DB[recipe.result].name}`);
}
```

### Multi-Card Fusion (Chain)

```typescript
import { resolveFusionChain } from './cards.js';

const chain = resolveFusionChain(['card1', 'card2', 'card3', 'card4']);
console.log(`Final: ${CARD_DB[chain.finalCardId].name}`);
console.log(`Consumed: ${chain.consumedIds.length} cards`);
```

### Fusion hints for a card

```typescript
import { getFusionHints } from './cards.js';

const hints = getFusionHints('dark_magician');
for (const hint of hints) {
  if (hint.type === 'recipe') {
    console.log(`Recipe: ${hint.material1?.name} + ${hint.material2?.name}`);
  } else if (hint.type === 'formula') {
    console.log(`Formula: ${hint.operand1Label} + ${hint.operand2Label}`);
  }
}
```

### Instantiate FieldCard

```typescript
import { FieldCard } from './field.js';

const card = CARD_DB['kurama'];
const fc = new FieldCard(card, 'atk', false);
// fc.position = 'atk', fc.faceDown = false

console.log(`ATK: ${fc.effectiveATK()}`); // baseATK
fc.tempATKBonus = 200;
console.log(`ATK (buffed): ${fc.effectiveATK()}`); // baseATK + 200
```

### Extract passive flags

```typescript
const passiveBlocks = fc._getPassiveBlocks();
// fc.piercing, fc.indestructible, etc. are set from passive: actions
```

---

## Dependencies

| Dependency | Description |
|------------|-------------|
| `@wynillo/tcg-format` | TCG loading library — `.tcg` parsing |
| `src/types.ts` | `CardData`, `CardEffectBlock`, all interfaces |
| `src/field.ts` | `FieldCard`, `FieldSpellTrap` classes |
| `src/type-metadata.ts` | Race, Attribute, Rarity lookup |
| `src/enums.ts` | Int ↔ Enum converters |
| `src/tcg-bridge.ts` | Loads `CARD_DB` from `.tcg` |

---

## Notes / Gotchas

### 1. `effect` vs `effects`

A card has **either** `effect` (singular) **or** `effects` (plural), never both. The engine treats both fields synonymously, but to avoid confusion only one should be set.

### 2. `makeDeck` clones cards

`makeDeck()` creates **shallow copies** of `CardData` to avoid unintended mutations. Effect arrays (`effect.actions`, `effects[].actions`) are deep copied.

```typescript
const deck = makeDeck(['kurama']);
deck[0].name = 'Modified';  // Does NOT change CARD_DB['kurama']!
```

### 3. FieldCard bonuses are accumulative

Bonuses add up:
```
effectiveATK = baseATK + tempATKBonus + permATKBonus + fieldSpellATKBonus
```

**Temporary bonuses** reset at end of turn (by engine). **Permanent bonuses** stay until the card leaves the field.

### 4. Passive flags are extracted once at summon

When a monster is summoned, the engine extracts passive effects:

```typescript
// In engine.ts:summonMonster()
fc.piercing = passiveBlocks.some(b => 
  b.actions.some(a => a.type === 'passive_piercing')
);
```

**Important**: Subsequent changes to `CardData.effect` have **no effect** on a `FieldCard` already on the field.

### 5. Fusion priority

Formulas are checked by `priority` (descending). Specific formulas should have higher priority than generic ones.

```typescript
// Specific (high priority)
{ comboType: 'race+race', operand1: Dragon, operand2: Warrior, priority: 100, resultPool: [...] }

// Generic (low priority)
{ comboType: 'race+race', operand1: Spellcaster, operand2: Spellcaster, priority: 10, resultPool: [...] }
```

### 6. Crafted cards

Cards created via crafting have IDs ≥ `100_000_000`. `makeDeck()` resolves these via `resolveCraftedCard()` automatically.

### 7. Unknown card IDs

`makeDeck()` skips unknown IDs with warning:
```typescript
console.warn(`[makeDeck] Unknown card ID "${id}" – skipping.`);
```

This is **not an error** — it allows mods to reference card IDs that are loaded later.

---

## References

- **Effect System** → `docs/effect-system.md` (G2)
- **Engine-Core** → `docs/engine-core.md` (G1)
- **TCG Format** → `docs/tcg-format.md` (G11)
- **Mod API** → `docs/mod-api.md` (G10)

---

**Status**: ✅ Complete
