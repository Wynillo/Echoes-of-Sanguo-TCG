---
name: engine-state-reference
description: >
  Read-only reference for engine state management in src/engine/.
  Provides documentation on GameState, PlayerState, FieldCard, and FieldSpellTrap
  structures. Use for understanding state mutations, turn flow, and serialization.
  Does not execute code — read-only consultation on engine architecture.
tools:
  - Read
  - Grep
  - Glob
model: sonnet
---

# src/engine/ State Management

Dieses Verzeichnis enthält die Engine-Schicht des Spiels. Die Engine ist reines TypeScript ohne React-Abhängigkeiten und verwaltet den kompletten Spielzustand.

## Architektur

Die Engine kommuniziert ausschließlich über das `UICallbacks`-Interface mit der UI-Schicht. Die UI registriert Callbacks; die Engine ruft diese auf, um Updates zu signalisieren.

## State-Struktur

### GameState (zentrales State-Objekt)

```typescript
interface GameState {
  phase: Phase;              // 'draw' | 'main' | 'battle'
  turn: number;              // aktuelle Runde
  activePlayer: Owner;       // 'player' | 'opponent'
  player: PlayerState;
  opponent: PlayerState;
  log: string[];             // Kampflog (neueste Einträge zuerst)
  firstTurnNoAttack?: boolean;
  skipNextDraw?: Owner;
  oneMoveActionUsed?: boolean;
}
```

### PlayerState

```typescript
interface PlayerState {
  lp: number;                // Lebenspunkte
  deck: CardData[];          // verdecktes Deck
  hand: CardData[];          // Handkarten
  field: {
    monsters: Array<FieldCard | null>;      // 5 Zonen
    spellTraps: Array<FieldSpellTrap | null>; // 5 Zonen
    fieldSpell: FieldSpellTrap | null;      // Feldzauber
  };
  graveyard: CardData[];     // Friedhof
  normalSummonUsed: boolean; // Normale Beschwörung in diesem Zug verwendet
  battleProtection?: boolean; // Schutz vor Kampfschaden
  turnCounters?: TurnCounter[]; // Rundenbasierte Effekte
  fieldFlags?: {
    negateTraps?: boolean;
    negateSpells?: boolean;
    negateMonsterEffects?: boolean;
  };
}
```

### FieldCard (laufendes Monster)

```typescript
class FieldCard {
  card: CardData;           // Referenz auf Kartendaten
  position: Position;       // 'atk' | 'def'
  faceDown: boolean;        // verdeckt auf dem Feld
  hasAttacked: boolean;     // hat in diesem Zug angegriffen
  hasFlipSummoned: boolean; // Flip-Beschwörung in diesem Zug
  summonedThisTurn: boolean;
  tempATKBonus: number;     // temporäre ATK-Modifikatoren
  tempDEFBonus: number;
  permATKBonus: number;     // permanente ATK-Modifikatoren (Ausrüstung)
  permDEFBonus: number;
  fieldSpellATKBonus: number;
  fieldSpellDEFBonus: number;
  equippedCards: Array<{ zone: number; card: CardData }>;
  // Passive Flags (aus Effekten extrahiert)
  piercing: boolean;
  cannotBeTargeted: boolean;
  canDirectAttack: boolean;
  phoenixRevival: boolean;
  indestructible: boolean;
  effectImmune: boolean;
  cantBeAttacked: boolean;
}
```

### FieldSpellTrap (laufende Zauber/Fallen)

```typescript
class FieldSpellTrap {
  card: CardData;
  faceDown: boolean;
  used: boolean;            // für Fallen: wurde bereits aktiviert
  equippedMonsterZone?: number;  // für Ausrüstungen
  equippedOwner?: Owner;
}
```

## State-Änderungen

### 1. Direkte State-Mutation (synchron)

Die Engine mutiert den State direkt. Nach Änderungen wird `ui.render(state)` aufgerufen.

```typescript
this.state.player.lp -= damage;
this.ui.render(this.state);
```

### 2. Asynchrone Aktionen mit Effekt-Ausführung

Beschwörungen, Zauber und Angriffe können Effekte auslösen:

```typescript
async summonMonster(owner, handIndex, zone, position, faceDown) {
  // ... Kartenzug vom Hand aufs Feld
  await this._triggerEffect(fc, owner, 'onSummon', zone);
  TriggerBus.emit('onSummon', { engine: this, owner, card: fc.card, fieldCard: fc, zone });
  this.ui.render(this.state);
}
```

### 3. Zugwechsel

```typescript
state.activePlayer = 'opponent';
state.phase = 'draw';
state.turn++;
```

## Zugablauf (Phasen)

```
1. Draw Phase    -> refillHand()
2. Main Phase    -> summonMonster(), activateSpell(), setSpellTrap(), performFusion()
3. Battle Phase  -> attack(), attackDirect()
4. End Phase     -> resetMonsterFlags(), tickTurnCounters()
```

## State-Serialisierung (Checkpoints)

Das Spiel unterstützt Speichern/Laden über `SerializedCheckpoint`:

```typescript
interface SerializedCheckpoint {
  phase: Phase;
  turn: number;
  activePlayer: Owner;
  player: SerializedPlayerState;
  opponent: SerializedPlayerState;
  // ... (nur IDs, keine komplexen Objekte)
}
```

## WICHTIGE REGELN

- Engine darf NIEMALS direkt React-Code importieren
- State-Mutationen nur über GameEngine-Methoden
- Nach jeder Mutation `ui.render(state)` aufrufen
- Effekte werden über `executeEffectBlock()` ausgeführt
- TriggerBus für globale Event-Kommunikation
