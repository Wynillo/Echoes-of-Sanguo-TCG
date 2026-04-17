# Dokumentation: Alle Spielelemente

**Ziel:** Umfassende, konsistente Dokumentation aller Spielelemente für Entwickler, Modder undContributors.

**Scope:**
- Engine (GameEngine, Effekt-System, KI, Regeln)
- Daten (Karten, Gegner, Kampagne, Shop, Progression)
- UI (Screens, Components, Contexts, Hooks)
- Mod API (window.EchoesOfSanguoMod, TriggerBus)
- TCG-Format (.tcg Struktur, Schemas)

---

## Phase 1: Spielelemente finden & gruppierten

**Ziel:** Vollständige Inventur aller dokumentationswürdigen Elemente. Strukturierte Gruppierung nach logischen Domänen.

### 1.1 Bestehende Docs inventarisieren

**Files lesen:**
- `docs/*.md` — vorhandene Dokumentation
- `.claude/*.md` — Architektur, Konventionen, CI/CD
- `README.md` — Overview
- `.claude/agents/*.md` — Agent-Kontexte (bereits Docs für bestimmte Domänen)

**Output:** Liste der existierenden Docs, Lücken identifizieren.

### 1.2 Codebase scannen nach Dokumentationspunkten

**Explore-Agent fires (parallel):**

| Agent | Search Scope |
|---|---|
| Engine-Core | `src/engine.ts`, `src/field.ts`, `src/rules.ts`, `src/effect-registry.ts`, `src/ai-orchestrator.ts` |
| Effect-System | Alle Effect Actions, Trigger, Serializer |
| Data-Layer | `src/types.ts`, `src/cards.ts`, `src/enums.ts`, `src/progression.ts`, `src/campaign.ts`, `src/shop-data.ts` |
| UI-Layer | `src/react/screens/`, `src/react/components/`, `src/react/contexts/`, `src/react/hooks/` |
| Mod-API | `src/mod-api.ts`, `src/trigger-bus.ts` |
| TCG-Bridge | `src/tcg-bridge.ts`, `src/tcg-builder.ts`, `src/effect-serializer.ts`, `src/enums.ts` |

**Output pro Bereich:**
- Datei-Liste mit Pfaden
- Wichtige Types/Interfaces/Klassen
- Exportierte Funktionen/Methoden
- Unklare Stellen (Kommentar-Bedarf)

### 1.3 Gruppendefinition finalisieren

**Vorgeschlagene Gruppen:**

| Gruppe | Enthält | Priority |
|---|---|---|
| **G1: Engine-Core** | GameEngine, Phasen, Battle, Fusion, Checkpoints | Hoch |
| **G2: Effekt-System** | EFFECT_REGISTRY, 60+ Actions, 7 Trigger, Serializer | Hoch |
| **G3: KI-System** | AI_BEHAVIOR_REGISTRY, Orchestrator, Decision-Making | Mittel |
| **G4: Karten & Feld** | CardData, FieldCard, FieldSpellTrap, Positionen, Boni | Hoch |
| **G5: Gegner & Decks** | Opponent-Configs, Starter-Decks, KI-Profile | Mittel |
| **G6: Kampagne** | Nodes, Dialogue, Gauntlets, Unlock-Bedingungen | Mittel |
| **G7: Shop & Progression** | Shop-Tiers, Packages, Jade Coins, Collection, Deck | Mittel |
| **G8: Fusionen** | Rezepte, Formeln, Special-Summon-Logik | Niedrig |
| **G9: UI-Architektur** | Screens, Components, Contexts, State-Flow | Mittel |
| **G10: Mod API** | window.EchoesOfSanguoMod, TriggerBus, Hooks | Hoch |
| **G11: TCG-Format** | .tcg ZIP-Struktur, JSON-Schemas, Validation | Hoch |

**Output:** Finale Gruppen-Liste mit Dateien, Types, Prioritäten.

### 1.4 Deliverable Phase 1

**Datei:** `docs/INVENTORY.md`

**Inhalt:**
- Tabelle aller Gruppen mit Dateien, Types, Funktionen
- Priorisierung (Hoch/Mittel/Niedrig)
- Geschätzter Aufwand pro Gruppe (Schreibzeit)
- Abhängigkeiten (z.B. "Effekt-System braucht Karten-Doku first")

---

## Phase 2: Dokumentation schreiben (pro Gruppe)

**Ziel:** Jede Gruppe erhält eine eigenständige `.md`-Datei mit konsistenter Struktur.

### 2.1 Template festlegen

**Standard-Struktur pro Doku-Datei:**

```md
# {Gruppen-Name}

## Übersicht
(Worum geht es? Wofür zuständig?)

## Architektur
(Wie aufgebaut? Welche Schichten? Datenfluss?)

## Wichtige Types / Interfaces
(Code-Beispiele mit short explanations)

## API / Methoden
(Was kann man aufrufen? Parameter, Return-Werte, Beispiele)

## Beispiele
(Concrete Usage-Szenarien)

## Dependencies
(Wovon hängt das ab? Was hängt davon ab?)

## Notes / Gotchas
(Fallstricke, besondere Verhaltensweisen)
```

### 2.2 Schreib-Reihenfolge (abhängigkeitsbasiert)

| Reihenfolge | Gruppe | Geschätzte Zeit | Dependencies |
|---|---|---|---|
| 1 | G4: Karten & Feld | 2–3h | — |
| 2 | G2: Effekt-System | 4–5h | G4 |
| 3 | G1: Engine-Core | 3–4h | G2, G4 |
| 4 | G11: TCG-Format | 2–3h | G4, G2 |
| 5 | G10: Mod API | 2h | G1, G2 |
| 6 | G3: KI-System | 2–3h | G1 |
| 7 | G5: Gegner & Decks | 1–2h | G11 |
| 8 | G7: Shop & Progression | 2h | G11 |
| 9 | G6: Kampagne | 2h | G11 |
| 10 | G8: Fusionen | 1h | G1, G4 |
| 11 | G9: UI-Architektur | 3–4h | G1 |

**Gesamt:** ~24–35h Schreibarbeit (aufteilbar auf mehrere Sessions)

### 2.3 Qualitätssicherung

**Pro Doku-Datei:**
- [ ] Technische Korrektheit (Code-Beispiele funktionieren)
- [ ] Konsistenz mit existierenden Docs
- [ ] Keine Spoiler für Campaign-Inhalte (falls relevant)
- [ ] i18n-Keys korrekt referenziert (falls UI)
- [ ] Links zu verwandten Docs gesetzt

**Review-Prozess:**
- Nach jeder Gruppe: `npm run build` + `npm test` sicherstellen
- Nach 3 Gruppen: Kurze Pause, Konsistenz-Check
- Am Ende: Oracle-Review für Architektur-Docs

---

## Phase 3: Zusammenführung & Navigation

**Ziel:** Zentrale Index-Datei, Querverweise, README-Update.

### 3.1 docs/README.md erstellen

**Inhalt:**
- Übersichtstabelle aller Doku-Dateien
- Links pro Datei
- Quickstart für neue Entwickler
- Link zu ARCHITECTURE.md, CONVENTIONS.md

### 3.2 Haupt-README aktualisieren

**Änderungen:**
- Abschnitt "Documentation" hinzufügen
- Link zu `docs/README.md`
- Kurze Beschreibung der Doc-Struktur

### 3.3 Agent-Configs aktualisieren

**Files:** `.claude/agents/*.md`

**Änderungen:**
- Links zu neuen Docs hinzufügen (wo relevant)

---

## Erfolgskriterien

| Kriterium | Messbar an |
|---|---|
| Vollständigkeit | Alle 11 Gruppen dokumentiert |
| Konsistenz | Einheitliches Template verwendet |
| Auffindbarkeit | docs/README.md verlinkt alles |
| Korrektheit | Code-Beispiele sind valid |
| Wartbarkeit | Docs liegen nah am Code (docs/ + .claude/agents/) |

---

## Nächste Schritte

1. **Phase 1 starten** — Explore-Agenten feuern, Inventory schreiben
2. **Priorisierung bestätigen** — Reihenfolge der Gruppen finalisieren
3. **Phase 2 beginnen** — Erste Gruppe dokumentieren (Karten & Feld)

---

**Hinweis:** Dieser Plan ist bewusst iterativ. Phase 1 liefert die Grundlage — während des Inventars können neue Gruppen entdeckt oder bestehende merged werden. Phase 2 ist modular: Jede Gruppe ist ein in sich geschlossener Task.
