# Mod API — Echoes of Sanguo

**Stand:** 2026-04-16  
**Gruppe:** G10  
**Dependencies:** G1 (Engine-Core) ✅, G2 (Effekt-System) ✅  
**Geschätzte Zeit:** 2h  

---

## Übersicht

Die Mod API ermöglicht **Runtime-Modding** via `window.EchoesOfSanguoMod`. Modder können Karten, Gegner, Effekte und ganze `.tcg`-Archive laden.

**Zugriff:**
```javascript
const mod = window.EchoesOfSanguoMod;
```

---

## API Reference

### Live Stores

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `CARD_DB` | `Record<string, CardData>` | Live-Kartendatenbank — direkt mutate |
| `FUSION_RECIPES` | `FusionRecipe[]` | Fusion-Rezepte — `push()` zum hinzufügen |
| `OPPONENT_CONFIGS` | `OpponentConfig[]` | Gegner-Konfigurationen — `push()` |
| `STARTER_DECKS` | `Record<number, string[]>` | Starter-Decks — Keys = Race IDs |
| `EFFECT_REGISTRY` | `Map<string, EffectImpl>` | Read-only — alle registrierten Effects |

### Methods

| Method | Signatur | Beschreibung |
|--------|----------|--------------|
| `registerEffect` | `(type, impl) => void` | Custom Effect-Handler registrieren |
| `loadModTcg` | `(source, onProgress) => Promise` | `.tcg` Archiv laden |
| `unloadModCards` | `(source) => boolean` | Mod-Karten entfernen (partial) |
| `getLoadedMods` | `() => LoadedMod[]` | Alle geladenen Mods auflisten |
| `getCurrentManifest` | `() => Manifest \| null` | Aktuelles Manifest |
| `emitTrigger` | `(event, ctx) => void` | Custom Trigger feuern |
| `addTriggerHook` | `(event, handler) => () => void` | Trigger subscriben |

---

## Karten hinzufügen

### Direkt zu CARD_DB

```javascript
window.EchoesOfSanguoMod.CARD_DB['mod:dragon_01'] = {
  id: 'mod:dragon_01',
  name: 'Mod Dragon',
  type: 1, // Monster
  race: 1, // Warrior
  attribute: 3, // Fire
  rarity: 4, // Rare
  level: 7,
  atk: 2500,
  def: 2000,
  description: 'A powerful modded dragon.',
  effect: {
    trigger: 'onSummon',
    actions: [{ type: 'dealDamage', target: 'opponent', value: 500 }]
  }
};
```

**Wichtig:** ID sollte Prefix haben (`mod:`) um Kollisionen zu vermeiden.

---

## Custom Effect Handler

### Registrieren

```javascript
window.EchoesOfSanguoMod.registerEffect('myCustomEffect', (action, ctx) => {
  ctx.log('Custom effect fired!');
  
  // Custom logic
  ctx.draw(ctx.owner, action.count ?? 1);
  
  // Optional: Signal zurückgeben
  return {};
});
```

### Verwendung in .tcg

```
onSummon: myCustomEffect 2
```

---

## TCG Mod laden

### Von URL

```javascript
try {
  await window.EchoesOfSanguoMod.loadModTcg('https://example.com/mymod.tcg');
  console.log('Mod loaded!');
} catch (e) {
  console.error('Failed to load mod:', e);
}
```

### Von ArrayBuffer (File Upload)

```javascript
const file = document.getElementById('mod-upload').files[0];
const buffer = await file.arrayBuffer();
await window.EchoesOfSanguoMod.loadModTcg(buffer, (pct) => {
  console.log(`Loading: ${pct}%`);
});
```

---

## Trigger subscriben

### Built-in Trigger

```javascript
// Subscribe
const unsubscribe = window.EchoesOfSanguoMod.addTriggerHook('onSummon', (ctx) => {
  if (ctx.card?.id === 'mod:dragon_01') {
    console.log('Mod Dragon summoned!', ctx);
  }
});

// Später: unsubscribe()
unsubscribe();
```

### Custom Trigger feuern

```javascript
// Owner Mod
window.EchoesOfSanguoMod.emitTrigger('mod:myEvent', {
  card: myCard,
  state: gameEngine.getState(),
  owner: 'player'
});

// Subscriber
window.EchoesOfSanguoMod.addTriggerHook('mod:myEvent', (ctx) => {
  console.log('Custom event!', ctx);
});
```

---

## Fusion Recipes hinzufügen

```javascript
window.EchoesOfSanguoMod.FUSION_RECIPES.push({
  materials: ['mod:card1', 'mod:card2'],
  result: 'mod:fusion_result'
});
```

---

## Gegner hinzufügen

```javascript
window.EchoesOfSanguoMod.OPPONENT_CONFIGS.push({
  id: 999,
  name: 'Mod Boss',
  title: 'The Modder',
  race: 1,
  flavor: 'A modded opponent',
  coinsWin: 100,
  coinsLoss: 10,
  deckIds: ['mod:dragon_01', 'mod:card2', 'mod:card3'],
  behaviorId: 'smart',
  currencyId: 'coins'
});
```

---

## Starter Decks definieren

```javascript
// Key = Race ID (muss in TYPE_META.races existieren)
window.EchoesOfSanguoMod.STARTER_DECKS[99] = [
  'mod:starter_1',
  'mod:starter_2',
  'mod:starter_3',
  'mod:starter_4',
  'mod:starter_5'
];
```

---

## Mod unloaden

### Partial Unload

```javascript
const success = window.EchoesOfSanguoMod.unloadModCards('https://example.com/mymod.tcg');
if (success) {
  console.log('Mod unloaded (cards and opponents removed)');
} else {
  console.log('Mod not found');
}
```

### Limitations

**Wird NICHT reverted:**
- Fusion recipes
- Shop data
- Campaign data
- Type metadata
- Rules

**Workaround:** Page reload für vollständigen Reset.

---

## Geladene Mods auflisten

```javascript
const mods = window.EchoesOfSanguoMod.getLoadedMods();
for (const mod of mods) {
  console.log(`Mod: ${mod.source}`);
  console.log(`  Cards: ${mod.cardIds.length}`);
  console.log(`  Opponents: ${mod.opponentIds.length}`);
  console.log(`  Loaded at: ${new Date(mod.timestamp)}`);
}
```

### LoadedMod Interface

```typescript
interface LoadedMod {
  source: string;       // URL oder 'arraybuffer'
  cardIds: string[];
  opponentIds: number[];
  timestamp: number;
}
```

---

## Manifest auslesen

```javascript
const manifest = window.EchoesOfSanguoMod.getCurrentManifest();
if (manifest) {
  console.log(`Mod: ${manifest.name} v${manifest.version}`);
  console.log(`Author: ${manifest.author}`);
  console.log(`Cards: ${manifest.cardCount}`);
}
```

### Manifest Interface

```typescript
interface TcgManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  cardCount: number;
  formatVersion: string;
}
```

---

## Komplettes Mod-Beispiel

```javascript
// 1. Custom Effect registrieren
window.EchoesOfSanguoMod.registerEffect('stormDamage', (action, ctx) => {
  const damage = ctx.state[ctx.owner].field.monsters
    .filter(Boolean)
    .length * 200;
  
  ctx.damage('opponent', damage);
  ctx.log(`Storm deals ${damage} damage!`);
  
  return {};
});

// 2. Karte hinzufügen
window.EchoesOfSanguoMod.CARD_DB['mod:storm_mage'] = {
  id: 'mod:storm_mage',
  name: 'Storm Mage',
  type: 1,
  race: 5, // Spellcaster
  attribute: 4, // Wind
  level: 4,
  atk: 1500,
  def: 1200,
  description: 'Commands the storm.',
  effect: {
    trigger: 'onSummon',
    actions: [{ type: 'stormDamage' }]
  }
};

// 3. Starter Deck definieren
window.EchoesOfSanguoMod.STARTER_DECKS[99] = ['mod:storm_mage'];

// 4. Subscribe to Summon trigger
window.EchoesOfSanguoMod.addTriggerHook('onSummon', (ctx) => {
  if (ctx.card?.id === 'mod:storm_mage') {
    console.log('Storm Mage summoned!');
  }
});
```

---

## Dependencies

| Abhängigkeit | Beschreibung |
|--------------|--------------|
| `src/cards.ts` | CARD_DB, FUSION_RECIPES |
| `src/effect-registry.ts` | EFFECT_REGISTRY, registerEffect |
| `src/tcg-bridge.ts` | loadAndApplyTcg, unloadModCards |
| `src/trigger-bus.ts` | TriggerBus emit/on |

---

## Notes / Gotchas

### 1. Hot Reload nicht unterstützt

Mods können geladen werden, aber **nicht** hot-reloaded. Für vollständigen Reset: Page reload.

### 2. ID-Kollisionen

Mods sollten **namhafte IDs** verwenden:
```javascript
// Gut
'mod:dragon_01'
'mymod:custom_spell'

// Schlecht (Kollision mit Base-Set)
'1', 'kurama'
```

### 3. Effect Handler müssen synchron sein (für A-Trigger)

```javascript
// B-Trigger (async erlaubt)
registerEffect('asyncEffect', async (action, ctx) => {
  await someAsyncOperation();
  ctx.draw(ctx.owner, 1);
});
```

### 4. TriggerBus Handler-Reihenfolge

Handler werden in **Registrierungsreihenfolge** aufgerufen:
```javascript
addTriggerHook('onSummon', handler1);  // First
addTriggerHook('onSummon', handler2);  // Second
```

### 5. Partial Unload Limitation

`unloadModCards()` entfernt **nur** Karten und Gegner. Für vollständiges Unload:
- Mods sollten eigene Cleanup-Logik mitbringen
- Oder: Page reload

---

## Verweise

- **Engine-Core** → `docs/engine-core.md` (G1)
- **Effekt-System** → `docs/effect-system.md` (G2)
- **TCG-Format** → `docs/tcg-format.md` (G11)

---

**Status:** ✅ Vollständig
