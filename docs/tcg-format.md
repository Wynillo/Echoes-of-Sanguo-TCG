# TCG-Format — Echoes of Sanguo

**Stand:** 2026-04-16  
**Gruppe:** G11  
**Dependencies:** G4 (Karten & Feld) ✅  
**Geschätzte Zeit:** 2–3h  

---

## Übersicht

Das `.tcg`-Format ist ein **ZIP-Archiv** mit JSON-Dateien und Kartenbildern. Es enthält alle Kartendaten, Gegner, Kampagnen, Shops und Lokalisierungen.

**Library:** `@wynillo/tcg-format` (externes Package)  
**Bridge:** `src/tcg-bridge.ts` (verbindet TCG mit Game-Stores)

---

## Archiv-Struktur

```
base.tcg (ZIP)
├── manifest.json              # Metadaten (Name, Version, Autor)
├── cards.json                 # Alle Karten (TcgCard[])
├── opponents.json             # Gegner-Konfigurationen
├── starterDecks.json          # Starter-Decks pro Race
├── fusion_recipes.json        # Explizite Fusion-Rezepte
├── tcg-src/
│   ├── opponents/             # Opponent-Deck-Dateien
│   └── ...
├── locales/
│   ├── en.json                # Englische Übersetzungen
│   └── de.json                # Deutsche Übersetzungen
└── images/                    # Kartenbilder (optional)
```

---

## manifest.json

```json
{
  "id": "base",
  "name": "Echoes of Sanguo - Base Set",
  "version": "1.0.0",
  "author": "Wynillo",
  "description": "Base card set for Echoes of Sanguo",
  "cardCount": 250,
  "formatVersion": "2.0"
}
```

**Felder:**
- `id` — Eindeutige Mod-ID (für `unloadModCards()`)
- `formatVersion` — TCG-Format-Version (kompatibel mit `@wynillo/tcg-format`)
- `cardCount` — Anzahl der Karten im Set

---

## cards.json

### TcgCard Struktur

```typescript
interface TcgCard {
  id: string;
  name: string;
  type: number;           // 1=Monster, 2=Fusion, 3=Spell, 4=Trap, 5=Equipment
  race?: number;
  attribute?: number;
  rarity?: number;
  level?: number;
  atk?: number;
  def?: number;
  description: string;
  effect?: string;        // Effect string (serialized)
  trapTrigger?: number;   // Trap trigger ID
  target?: string;
  atkBonus?: number;
  defBonus?: number;
  equipRequirement?: {
    race?: number;
    attr?: number;
  };
}
```

**Effect String Format:**
Siehe `docs/effect-system.md` für Syntax.

**Beispiel:**
```json
{
  "id": "kurama",
  "name": "Nine-Tailed Fox",
  "type": 1,
  "race": 4,
  "attribute": 3,
  "rarity": 4,
  "level": 4,
  "atk": 1500,
  "def": 1200,
  "description": "A cunning fox spirit.",
  "effect": "onSummon: draw 1"
}
```

---

## opponents.json

```typescript
interface TcgOpponentDeck {
  id: number;
  name: string;
  title: string;
  race: number;
  flavor: string;
  coinsWin: number;
  coinsLoss: number;
  currencyId?: string;
  deckIds: number[];
  behaviorId: 'default' | 'aggressive' | 'defensive' | 'smart' | 'cheating';
  rewardConfig?: DuelRewardConfig;
}
```

**Lokalisierung:** Name, Title, Flavor werden aus `locales/{lang}.json` geladen.

---

## starterDecks.json

```json
{
  "1": [1, 2, 3, 4, 5],
  "2": [6, 7, 8, 9, 10],
  "3": [11, 12, 13, 14, 15],
  "4": [16, 17, 18, 19, 20]
}
```

- **Key:** Race ID (number as string)
- **Value:** Array of card IDs (numbers)

---

## fusion_recipes.json

```json
[
  {
    "materials": ["kurama", "dragon_piper"],
    "result": "dragon_kitsune"
  }
]
```

**Hinweis:** Formeln (race+race, etc.) werden separat in `FUSION_FORMULAS[]` definiert.

---

## locales/{lang}.json

```json
{
  "cards": {
    "kurama": {
      "name": "Nine-Tailed Fox",
      "description": "A cunning fox spirit."
    }
  },
  "opponents": {
    "1": {
      "name": "Apprentice Duelist",
      "title": "Novice",
      "flavor": "Just starting out."
    }
  },
  "types": {
    "Monster": "Monster",
    "Spell": "Spell",
    "Trap": "Trap"
  },
  "races": {
    "Dragon": "Dragon",
    "Warrior": "Warrior"
  },
  "attributes": {
    "Light": "Light",
    "Dark": "Dark"
  }
}
```

---

## Load-Pipeline

### tcg-bridge.ts Flow

```typescript
// 1. loadAndApplyTcg(url: string | ArrayBuffer)
↓
// 2. ZIP extrahieren (jszip)
↓
// 3. locales/{lang}.json extrahieren
↓
// 4. loadTcgFile() von @wynillo/tcg-format aufrufen
↓
// 5. TcgCard[] → CardData[] konvertieren
//    - Enum conversion (int → Race, Attribute)
//    - Effect string parsing
//    - Warnings für unknown values
↓
// 6. applyOpponents(), applyStarterDecks(), etc.
↓
// 7. CARD_DB, FUSION_RECIPES füllen
↓
// 8. Mod-Tracking (für unload)
```

### Code-Beispiel

```typescript
async function loadAndApplyTcg(
  source: string | ArrayBuffer,
  onProgress?: (percent: number) => void
): Promise<void> {
  // Extract ZIP
  const zip = await JSZip.loadAsync(source);
  
  // Extract locale
  const localeFile = zip.file(`locales/${lang}.json`);
  const locale = JSON.parse(await localeFile.async('text'));
  
  // Load TCG via library
  const result = await loadTcgFile({
    zipContent: zip,
    locale,
    onProgress
  });
  
  // Apply opponents
  if (result.opponents) {
    applyOpponents(result.opponents, locale.opponents);
  }
  
  // Apply cards
  for (const card of result.cards) {
    CARD_DB[card.id] = convertCardData(card);
  }
  
  // Track mod
  loadedMods.push({
    source: typeof source === 'string' ? source : 'arraybuffer',
    cardIds: result.cards.map(c => c.id),
    timestamp: Date.now()
  });
}
```

---

## Effect Serialization

### Library API (`@wynillo/tcg-format`)

```typescript
// Re-exported in src/effect-serializer.ts
import {
  isValidEffectString,
  parseEffectString,
  serializeEffect,
  deserializeEffect,
  isMultiBlockEffect
} from '@wynillo/tcg-format';
```

### Usage

```typescript
// Parse string → CardEffectBlock
const block = parseEffectString('onSummon: draw 2', 'monster');

// Serialize Block → string
const str = serializeEffect({
  trigger: 'onSummon',
  actions: [{ type: 'draw', count: 2 }]
});
// Result: "onSummon: draw 2"

// Validation
if (!isValidEffectString(effectString)) {
  console.warn('Invalid effect string!');
}
```

---

## Mod-System

### Loaded Mod Tracking

```typescript
interface LoadedMod {
  source: string;       // URL or 'arraybuffer'
  cardIds: string[];    // All card IDs from this mod
  opponentIds: number[];
  timestamp: number;
}

const loadedMods: LoadedMod[] = [];
```

### Partial Unload

```typescript
function unloadModCards(source: string): boolean {
  const modIndex = loadedMods.findIndex(m => m.source === source);
  if (modIndex === -1) return false;
  
  const mod = loadedMods[modIndex];
  
  // Remove cards
  for (const cardId of mod.cardIds) {
    delete CARD_DB[cardId];
  }
  
  // Remove opponents
  const oppIds = new Set(mod.opponentIds);
  OPPONENT_CONFIGS.splice(
    OPPONENT_CONFIGS.findIndex(o => oppIds.has(o.id)),
    mod.opponentIds.length
  );
  
  loadedMods.splice(modIndex, 1);
  return true;
}
```

**Hinweis:** Fusion recipes, shop data, campaign data werden NICHT reverted.

---

## Type Metadata

Wird aus `.tcg` geladen via `applyTypeMeta()`:

```typescript
interface TypeMetaData {
  races?: RaceMeta[];
  attributes?: AttributeMeta[];
  rarities?: RarityMeta[];
  cardTypes?: CardTypeMeta[];
}

function applyTypeMeta(data: TypeMetaData): void {
  TYPE_META.races = data.races ?? [];
  TYPE_META.attributes = data.attributes ?? [];
  // ...
  rebuildIndices();
}
```

**Default-Werte** können in `type-metadata.ts:initDefaults()` gesetzt werden.

---

## Validation & Errors

###Card Conversion Warnings

```typescript
// In tcg-bridge.ts
if (!getRaceById(card.race)) {
  console.warn(`Unknown race ${card.race} for card ${card.id}`);
}

if (CARD_DB[card.id]) {
  console.warn(`Card ID collision: ${card.id} (overwriting)`);
}
```

###Effect Validation

```typescript
if (card.effect && !isValidEffectString(card.effect)) {
  console.warn(`Invalid effect string for card ${card.id}: "${card.effect}"`);
}
```

---

## Dependencies

| Abhängigkeit | Beschreibung |
|--------------|--------------|
| `@wynillo/tcg-format` | TCG loading, validation, packing |
| `jszip` | ZIP extraction |
| `src/cards.ts` | CARD_DB store |
| `src/tcg-builder.ts` | CardData → TcgCard conversion |
| `src/effect-serializer.ts` | Effect parsing |
| `src/enums.ts` | Int → Enum conversion |

---

## Notes / Gotchas

### 1. Card IDs sind Strings

Auch wenn die Base-Set IDs Zahlen sind (`"1"`, `"2"`), sind alle IDs **Strings**. Mods sollten namhafte IDs verwenden (`"mod:dragon_01"`).

### 2. Effect Strings sind optional

Karten ohne Effekt haben `effect: undefined` oder `effect: ""`.

### 3. Locale Fallback

Wenn Locale nicht gefunden:
```typescript
const locale = result.locales.get(lang) 
            ?? result.locales.values().next().value;  // Fallback to first
```

### 4. Mod Loading Order

Mods werden in Ladereihenfolge verarbeitet. Bei ID-Kollisionen **überschreibt** später geladener Mod frühere.

### 5. TCG-Format Version

`formatVersion` in manifest.json bestimmt Kompatibilität mit `@wynillo/tcg-format`.

---

## Verweise

- **Karten & Feld** → `docs/cards-field.md` (G4)
- **Effekt-System** → `docs/effect-system.md` (G2)
- **Mod API** → `docs/mod-api.md` (G10)

---

**Status:** ✅ Vollständig
