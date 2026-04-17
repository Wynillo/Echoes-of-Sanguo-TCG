# Spielelemente-Inventar — Echoes of Sanguo

**Stand:** 2026-04-16  
**Phase:** 1 abgeschlossen — Alle Elemente inventarisiert und gruppiert.  
**Zweck:** Zentrale Referenz für die Dokumentation aller Spielelemente.

---

## Übersicht

| Gruppe | Titel | Dateien | Lines | Priority | Geschätzte Doku-Zeit |
|--------|-------|---------|-------|----------|---------------------|
| **G1** | Engine-Core | 10 | ~4.533 | Hoch | 3–4h |
| **G2** | Effekt-System | 5 | ~1.425 | Hoch | 4–5h |
| **G3** | KI-System | 3 | ~1.483 | Mittel | 2–3h |
| **G4** | Karten & Feld | 5 | ~691 | Hoch | 2–3h |
| **G5** | Gegner & Decks | 3 (TCG-intern) | n/a | Mittel | 1–2h |
| **G6** | Kampagne | 5 | ~693 | Mittel | 2h |
| **G7** | Shop & Progression | 2 | ~785 | Mittel | 2h |
| **G8** | Fusionen | (in G4, G11) | — | Niedrig | 1h |
| **G9** | UI-Architektur | 30+ (React) | ~10k+ | Mittel | 3–4h |
| **G10** | Mod API | 2 | ~80 | Hoch | 2h |
| **G11** | TCG-Format | 4 + Extern | ~560 | Hoch | 2–3h |

**Gesamt:** ~20k+ Lines Code, ~24–35h Schreibarbeit für vollständige Dokumentation.

---

## Gruppe G1: Engine-Core

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/engine.ts` | ~1218 | GameEngine: Phasen, Summoning, Battle, Fusion, Win-Check |
| `src/field.ts` | 104 | FieldCard (Monster on board), FieldSpellTrap |
| `src/rules.ts` | 28 | GAME_RULES Konstanten (LP, Hand-Limit, Zonen) |
| `src/trigger-bus.ts` | 35 | TriggerBus: Event-Emitter für extended Triggers |
| `src/effect-registry.ts` | 982 | EFFECT_REGISTRY: 60+ Effect Actions, Cost-Payment |
| `src/cards.ts` | 277 | CARD_DB, FUSION_RECIPES, makeDeck(), checkFusion() |
| `src/types.ts` | 405 | Alle TypeScript-Interfaces (GameState, CardData, UICallbacks) |
| `src/debug-logger.ts` | 101 | EchoesOfSanguo Debug-Logging |
| `src/ai-behaviors.ts` | 623 | AI-Behavior-Profile, Scoring, Targeting |
| `src/ai-orchestrator.ts` | 760 | aiTurn() Sequenz, Decision-Making |

**Wichtige Types:**
- `GameEngine` — Hauptklasse, enthält gesamten Game-State
- `GameState` — { phase, turn, activePlayer, player, opponent, log }
- `PlayerState` — { lp, deck, hand, field, graveyard, normalSummonUsed }
- `FieldCard` — Running monster with bonuses, flags, equipped cards
- `FieldSpellTrap` — Spell/Trap on field
- `UICallbacks` — Interface für Engine→UI Kommunikation

**Engine-Core Doku:** → `docs/engine-core.md`

---

## Gruppe G2: Effekt-System

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/effect-registry.ts` | 982 | Alle 60+ Effect Actions, executeEffectBlock() |
| `src/effect-serializer.ts` | 21 | Re-Export von @wynillo/tcg-format (serialize/deserialize) |
| `src/effect-text-builder.ts` | 310 | Human-readable effect text für UI |
| `src/types.ts` | 405 (Auszug) | CardEffectBlock, EffectTrigger, ValueExpr, CardFilter |
| `src/enums.ts` | 76 | TRIGGER_STRINGS, Trigger-Validation |

**Alle 7 Monster-Triggers:**
1. `onSummon` — Bei Beschwörung (Normal, Flip, Special)
2. `onDestroyByBattle` — Bei Zerstörung im Kampf
3. `onDestroyByOpponent` — Bei Zerstörung durch Gegner (Kampf oder Effekt)
4. `onFlipSummon` — Bei Flip-Summon (manuell oder durch Attack)
5. `onDealBattleDamage` — Bei Battle-Damage an Gegner
6. `onSentToGrave` — Wenn Karte ins Graveyard geht
7. `passive` — Kontinuierlicher Effekt on-field

**Effect Actions (60+):**
Siehe Effekt-System Inventar unten.

**Effekt-System Doku:** → `docs/effect-system.md`

---

## Gruppe G3: KI-System

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/ai-behaviors.ts` | 623 | Behavior-Profile, Scoring, Targeting-Logik |
| `src/ai-orchestrator.ts` | 760 | aiTurn() Hauptsequenz, Phasen-Exekution |
| `src/ai-threat.ts` | 100 | BoardSnapshot, ThreatScoring, GoalAlignment |

**AI-Behavior-Profile:**
| Profil | Strategie |
|--------|-----------|
| `default` | Balanced — Summon highest ATK, smart positioning |
| `aggressive` | Swarm Aggro — Fusion first, always attack |
| `defensive` | Stall/Drain — DEF position, conservative |
| `smart` | Control — Effect monsters first, board-aware |
| `cheating` | OTK Fusion — Full info access, aggressive |

**AI-Turn-Sequenz:**
```
1. Draw Phase → Hand refill
2. Main Phase → Fusion → Summon → Spells
3. Trap Phase → Set traps face-down
4. Equip Phase → Equip buffs/debuffs
5. Battle Phase → Lethal check → Plan attacks → Execute
6. End Phase → Reset flags, increment turn
```

**KI-System Doku:** → `docs/ai-system.md`

---

## Gruppe G4: Karten & Feld

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/types.ts` | 405 | CardData, FieldCard, FieldSpellTrap Interfaces |
| `src/field.ts` | 104 | FieldCard Klasse (Boni, Flags, Methoden) |
| `src/cards.ts` | 277 | CARD_DB, FUSION_RECIPES, OPPONENT_CONFIGS |
| `src/enums.ts` | 76 | CardType Enum, Trigger-Converter |
| `src/type-metadata.ts` | 93 | Race, Attribute, Rarity Meta-Daten |

**CardType Enum:**
```typescript
Monster = 1, Fusion = 2, Spell = 3, Trap = 4, Equipment = 5
```

**FieldCard Properties:**
- **Boni:** tempATKBonus, tempDEFBonus, permATKBonus, permDEFBonus, fieldSpellATKBonus, fieldSpellDEFBonus
- **Flags:** piercing, cannotBeTargeted, canDirectAttack, phoenixRevival, indestructible, effectImmune, cantBeAttacked
- **State:** hasAttacked, hasFlipSummoned, summonedThisTurn, equippedCards[]

**Karten & Feld Doku:** → `docs/cards-field.md`

---

## Gruppe G5: Gegner & Decks

**Datenquelle:** Inside `base.tcg` (`opponents.json`, `starterDecks.json`)

**OpponentConfig Struktur:**
```typescript
interface OpponentConfig {
  id:          number;
  name:        string;
  title:       string;
  race:        Race;
  flavor:      string;
  coinsWin:    number;
  coinsLoss:   number;
  currencyId?: string;
  deckIds:     string[];
  behaviorId?: string;
  rewardConfig?: DuelRewardConfig;
}
```

**Starter Decks:**
- Key: Race ID (number)
- Value: Array of card IDs
- 4 Decks (e.g., Warrior, Dragon, Spellcaster, Fiend)

**Gegner Doku:** → `docs/opponents-decks.md`

---

## Gruppe G6: Kampagne

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/campaign-types.ts` | 58 | CampaignData, Chapter, CampaignNode Types |
| `src/campaign-store.ts` | 88 | Query-Funktionen (isNodeUnlocked, getNode) |
| `src/campaign-duel-result.ts` | 139 | Duel-Result-Verarbeitung mit Rewards |
| `src/reward-config.ts` | 48 | Reward-Configs, Rank-Multiplikatoren |
| `src/progression.ts` | 696 (Auszug) | Progress-Persistence |

**Node-Typen:**
- `'duel'` — Duel mit Opponent
- `'story'` — Dialogue/Story
- `'reward'` — Reward-Node
- `'shop'` — Shop-Zugang
- `'branch'` — Verzweigung
- `'gauntlet'` — Back-to-back Duels (im CampaignNode)

**UnlockConditions:**
- `{ type: 'nodeComplete', nodeId }`
- `{ type: 'allComplete', nodeIds }`
- `{ type: 'anyComplete', nodeIds }`
- `{ type: 'cardOwned', cardId }`
- `{ type: 'winsCount', count }`

**Kampagne Doku:** → `docs/campaign.md`

---

## Gruppe G7: Shop & Progression

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/shop-data.ts` | 90 | PackDef, CardPoolDef, Shop-Tiers |
| `src/progression.ts` | 696 | localStorage, Coins, Collection, Deck |

**Shop-Datenstruktur:**
```typescript
interface PackDef {
  id: string;
  name, desc: string;
  price: number | PackPrice;
  icon, color: string;
  slots: PackSlotDef[];
  cardPool?: CardPoolDef;
  unlockCondition?: UnlockCondition;
}
```

**Progression Keys (localStorage):**
- `tcg_s{slot}_coins` — Jade Coins
- `tcg_s{slot}_collection` — [{id, count}]
- `tcg_s{slot}_deck` — 40-card deck
- `tcg_s{slot}_opponents` — {id: {unlocked, wins, losses}}
- `tcg_s{slot}_campaign_progress` — {completedNodes, currentChapter}

**Shop & Progression Doku:** → `docs/shop-progression.md`

---

## Gruppe G8: Fusionen

**Doku:** Siehe G4 (Karten & Feld) und G11 (TCG-Format)

**Typen:**
- `FusionRecipe` — Explizite Material-Paare → Result
- `FusionFormula` — Type-based (Race+Race, Race+Attr, Attr+Attr)
- `FusionChainResult` — Multi-card fusion chain

**Funktionen:**
- `checkFusion(id1, id2)` — 2-card fusion check
- `resolveFusionChain(cardIds[])` — Multi-card chain
- `getFusionHints(cardId)` — Wie erhalte ich diese Karte?

---

## Gruppe G9: UI-Architektur

**Struktur:** `src/react/`

| Ordner | Dateien | Verantwortung |
|--------|---------|---------------|
| `screens/` | 12+ | PressStart, Title, Campaign, Game, Shop, Collection, Deckbuilder |
| `components/` | 10+ | Card, HandCard, FieldCard, HoverPreview, VFXOverlay |
| `contexts/` | 6 | GameContext, ProgressionContext, ModalContext, ScreenContext, SelectionContext, CampaignContext |
| `hooks/` | 8+ | useAttackAnimation, useLongPress, useAudio, useGamepad |
| `modals/` | 8+ | BattleLog, CardDetail, Options, Result, TrapPrompt |

**UI Doku:** → `docs/ui-architecture.md`

---

## Gruppe G10: Mod API

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/mod-api.ts` | 45 | window.EchoesOfSanguoMod Public API |
| `src/trigger-bus.ts` | 35 | Event-Emitter für custom Triggers |

**Mod API Methods:**
```typescript
window.EchoesOfSanguoMod = {
  CARD_DB,                    // Live card database
  FUSION_RECIPES,             // Fusion recipes array
  OPPONENT_CONFIGS,           // Opponent configs array
  STARTER_DECKS,              // Starter deck definitions
  EFFECT_REGISTRY,            // Read-only effect actions
  registerEffect(name, impl), // Custom effect handler
  loadModTcg(url),            // Load .tcg archive
  unloadModCards(modId),      // Remove mod cards
  getLoadedMods(),            // List loaded mods
  getCurrentManifest(),       // Get manifest
  emitTrigger(event, ctx),    // Fire custom trigger
  addTriggerHook(event, fn),  // Subscribe to trigger
}
```

**Mod API Doku:** → `docs/mod-api.md`

---

## Gruppe G11: TCG-Format

**Files:**

| Datei | Lines | Verantwortung |
|-------|-------|---------------|
| `src/tcg-bridge.ts` | 405 | @wynillo/tcg-format → game stores |
| `src/tcg-builder.ts` | 58 | CardData → TcgCard (packing) |
| `src/effect-serializer.ts` | 21 | Effect string ↔ CardEffectBlock |
| `src/enums.ts` | 76 | Int ↔ Enum Converter |

**TCG-Archiv (`base.tcg`):**
- ZIP-Format mit `.tcg` Extension
- Enthält: cards.json, opponents.json, starterDecks.json, fusion_recipes.json, locales/{lang}.json

**Lade-Pipeline:**
1. ZIP extrahieren
2. loadTcgFile() von @wynillo/tcg-format
3. applyOpponents(), applyStarterDecks(), etc.
4. CARD_DB, FUSION_RECIPES füllen

**TCG-Format Doku:** → `docs/tcg-format.md` (muss geschrieben werden!)

---

## Abhängigkeiten zwischen Gruppen

```
G4 (Karten & Feld) ← G1, G2, G8, G11
G2 (Effekt-System) ← G1, G10, G11
G1 (Engine-Core)   ← G2, G3, G4, G8
G11 (TCG-Format)   ← G4, G5, G6, G7
G10 (Mod API)      ← G1, G2
G3 (KI-System)     ← G1, G2, G4
G8 (Fusionen)      ← G4, G11
G5 (Gegner)        ← G11
G6 (Kampagne)      ← G1, G5, G11
G7 (Shop)          ← G11
G9 (UI)            ← G1, G2, G4, G6, G7
```

---

## Doku-Schreib-Reihenfolge (Priorisiert)

| # | Gruppe | Doku-File | Dauer | Dependencies |
|---|--------|-----------|-------|--------------|
| 1 | G4 | `docs/cards-field.md` | 2–3h | — |
| 2 | G2 | `docs/effect-system.md` | 4–5h | G4 |
| 3 | G1 | `docs/engine-core.md` | 3–4h | G2, G4 |
| 4 | G11 | `docs/tcg-format.md` | 2–3h | G4, G2 |
| 5 | G10 | `docs/mod-api.md` | 2h | G1, G2 |
| 6 | G3 | `docs/ai-system.md` | 2–3h | G1 |
| 7 | G5 | `docs/opponents-decks.md` | 1–2h | G11 |
| 8 | G7 | `docs/shop-progression.md` | 2h | G11 |
| 9 | G6 | `docs/campaign.md` | 2h | G11 |
| 10 | G8 | (In G4, G11 enthalten) | — | — |
| 11 | G9 | `docs/ui-architecture.md` | 3–4h | G1 |

---

## Effekte-Register (G2 — Detail)

### Damage / Heal (5)
`dealDamage`, `gainLP`, `reflectBattleDamage`, `destroyAndDamageBoth`, `preventBattleDamage`

### Draw / Search (10)
`draw`, `searchDeckToHand`, `peekTopCard`, `drawThenDiscard`, `discardFromHand`, `discardOppHand`, `discardEntireHand`, `sendTopCardsToGrave`, `sendTopCardsToGraveOpp`, `shuffleDeck`

### Stat Buffs (14)
`buffField`, `tempBuffField`, `debuffField`, `tempDebuffField`, `tempAtkBonus`, `permAtkBonus`, `tempDefBonus`, `permDefBonus`, `halveAtk`, `doubleAtk`, `swapAtkDef`

### Removal / Bounce (13)
`bounceStrongestOpp`, `bounceAttacker`, `bounceAllOppMonsters`, `bounceOppHandToDeck`, `destroyAttacker`, `destroyAllOpp`, `destroyAll`, `destroyWeakestOpp`, `destroyStrongestOpp`, `destroyByFilter`, `destroySummonedIf`, `setFaceDown`, `flipAllOppFaceDown`

### Graveyard (7)
`reviveFromGrave`, `reviveFromEitherGrave`, `salvageFromGrave`, `recycleFromGraveToDeck`, `shuffleGraveIntoDeck`

### Summon (5)
`specialSummonFromHand`, `specialSummonFromDeck`, `createTokens`, `excavateAndSummon`

### Control (6)
`stealMonster`, `stealMonsterTemp`, `cancelAttack`, `cancelEffect`, `preventAttacks`, `changePositionOpp`

### Spell/Trap Removal (4)
`destroyOppSpellTrap`, `destroyAllOppSpellTraps`, `destroyAllSpellTraps`, `destroyOppFieldSpell`

### Passive (11)
`passive_piercing`, `passive_untargetable`, `passive_directAttack`, `passive_vsAttrBonus`, `passive_phoenixRevival`, `passive_indestructible`, `passive_effectImmune`, `passive_cantBeAttacked`, `passive_negateTraps`, `passive_negateSpells`, `passive_negateMonsterEffects`

### Utility (5)
`tributeSelf`, `payCost`, `skipOppDraw`, `gameReset`, `revealTopCard`

---

## Nächste Schritte

1. **Phase 2 starten** — Erste Gruppe dokumentieren (G4: Karten & Feld)
2. **Template verwenden** — Einheitliche Struktur pro Doku-Datei
3. **Review nach jeder Doku** — Technische Korrektheit prüfen

---

**Hinweis:** Dieses Inventar wird nach jedem abgeschlossenen Doku-Teil aktualisiert. Abgeschlossen markieren, wenn Doku geschrieben und merged.
