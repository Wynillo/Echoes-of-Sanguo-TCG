# Echoes of Sanguo — Documentation Index

Welcome to the central documentation for **Echoes of Sanguo** — a browser-based TCG inspired by Yu-Gi-Oh! Forbidden Memories.

---

## Quickstart for New Developers

**First Steps:**
1. Read [Architecture overview](../.claude/architecture.md)
2. Understand [Cards & Field](./cards-field.md) (Foundation)
3. Learn [Effect System](./effect-system.md) (data-driven)
4. Study [Engine-Core](./engine-core.md) for Game-Flow

**Development Environment:**
```bash
npm install
npm run dev              # Dev server at localhost:5173
npm test                 # Vitest tests
```

---

## Documentation Overview

### Core Documentation (Prioritized)

| Doc | Group | Status | Time | Dependencies |
|-----|-------|--------|------|--------------|
| [Cards & Field](./cards-field.md) | G4 | ✅ Complete | 2–3h | — |
| [Effect System](./effect-system.md) | G2 | ✅ Complete | 4–5h | G4 |
| [Engine-Core](./engine-core.md) | G1 | ✅ Complete | 3–4h | G2, G4 |
| [TCG Format](./tcg-format.md) | G11 | ✅ Complete | 2–3h | G4 |
| [Mod API](./mod-api.md) | G10 | ✅ Complete | 2h | G1, G2 |
| [AI System](./ai-system.md) | G3 | ✅ Complete | 2–3h | G1, G4 |
| [Opponents & Decks](./opponents-decks.md) | G5 | ✅ Complete | 1–2h | G11 |
| [Shop & Progression](./shop-progression.md) | G7 | ✅ Complete | 2h | G11 |
| [Campaign](./campaign.md) | G6 | ✅ Complete | 2h | G11, G5, G7 |
| [UI Architecture](./ui-architecture.md) | G9 | ✅ Complete | 3–4h | G1 |

### External Documentation

| Doc | Location | Description |
|-----|----------|-------------|
| [Architecture](../.claude/architecture.md) | `.claude/` | Layers, Directory Map, UICallbacks |
| [Conventions](../.claude/conventions.md) | `.claude/` | Code Style, Commits, Testing |
| [CI/CD](../.claude/cicd.md) | `.claude/` | Workflows, Deploy |
| [Engine State Reference](../.claude/agents/engine-state-reference.md) | `.claude/agents/` | State Structure for Agents |
| [Controller Support](./CONTROLLER_SUPPORT.md) | `docs/` | Gamepad API, Button Mapping |

---

## By Topic

### Game Mechanics

- **Cards & Field** → [cards-field.md](./cards-field.md)
- **Effects** → [effect-system.md](./effect-system.md)
- **Fusion** → In [cards-field.md](./cards-field.md) § Fusion
- **Battle** → In [engine-core.md](./engine-core.md) § Battle Resolution
- **Rules** → In [engine-core.md](./engine-core.md) § GAME_RULES

### System Architecture

- **Engine** → [engine-core.md](./engine-core.md)
- **TCG Format** → [tcg-format.md](./tcg-format.md)
- **Modding** → [mod-api.md](./mod-api.md)
- **AI System** → [ai-system.md](./ai-system.md) ✅
- **UI Architecture** → [ui-architecture.md](./ui-architecture.md) ✅

### Content & Progression

- **Opponents** → [opponents-decks.md](./opponents-decks.md) ✅
- **Campaign** → [campaign.md](./campaign.md) ✅
- **Shop** → [shop-progression.md](./shop-progression.md) ✅

---

## File Structure

```
docs/
├── README.md                    # This file (Index)
├── INVENTORY.md                 # Complete game element inventory
├── cards-field.md               # G4: Cards & Field ✅
├── effect-system.md             # G2: Effect System ✅
├── engine-core.md               # G1: Engine-Core ✅
├── tcg-format.md                # G11: TCG Format ✅
├── mod-api.md                   # G10: Mod API ✅
├── ai-system.md                 # G3: AI System ✅
├── opponents-decks.md           # G5: Opponents ✅
├── shop-progression.md          # G7: Shop & Progression ✅
├── campaign.md                  # G6: Campaign ✅
├── ui-architecture.md           # G9: UI Architecture ✅
└── CONTROLLER_SUPPORT.md        # Controller API
```

---

## Glossary

| Term | Meaning |
|------|---------|
| **FieldCard** | Runtime instance of a monster on the field |
| **CardData** | Static card data from `.tcg` |
| **EffectTrigger** | When an effect fires (onSummon, onBattle, etc.) |
| **EffectSignal** | Return value from Effect handler (cancelAttack, etc.) |
| **UICallbacks** | Interface for Engine→UI communication |
| **TCG** | `.tcg` ZIP archive with card data |
| **GY** | Graveyard (where cards go when destroyed) |
| **LP** | Life Points (start at 8000, lose at 0) |

---

## Resources

### External Packages

- **[@wynillo/tcg-format](https://github.com/Wynillo/Echoes-of-Sanguo-TCG)** — TCG loading/validation
- **[@wynillo/echoes-mod-base](https://github.com/Wynillo/Echoes-of-Sanguo-MOD-base)** — Base card set

### Internal Resources

- **[.claude/architecture.md](../.claude/architecture.md)** — Architecture overview
- **[src/types.ts](../src/types.ts)** — All TypeScript interfaces
- **[src/engine.ts](../src/engine.ts)** — GameEngine implementation

---

## Contributing to Documentation

**Missing documentation?**
1. Create issue on GitHub
2. Or: PR with documentation extension

**Doc Template:**
```markdown
# Title — Echoes of Sanguo

**Date:** YYYY-MM-DD
**Group:** G#
**Dependencies:** ...

## Overview
## Architecture
## API / Methods
## Examples
## Dependencies
## Notes / Gotchas
```

---

**Last Updated:** 2026-04-16  
**Completed Docs:** 10/11 Core Documentation (91%) ✅
