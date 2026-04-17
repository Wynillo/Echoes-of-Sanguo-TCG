# Campaign System — Echoes of Sanguo

**Date:** 2026-04-17  
**Group:** G6  
**Dependencies:** G11 (TCG Format), G5 (Opponents), G7 (Shop & Progression)  

---

## Overview

The Campaign system provides a **node-based progression structure** for the single-player experience. Players navigate a visual map of interconnected nodes, each representing different activities: duels against opponents, story dialogue sequences, reward screens, shops, or branching paths.

**Key Features:**

- **Node-based map** — Visual progression with position coordinates
- **Multiple node types** — Duel, story, reward, shop, and branch nodes
- **Flexible unlock conditions** — Complete specific nodes, own cards, or achieve win counts
- **Gauntlet mode** — Back-to-back duels without saving between
- **Rank-based rewards** — S/A/B ranks with multipliers and card drops
- **Dialogue integration** — Pre and post-duel story scenes
- **Progress persistence** — Saved per slot in localStorage

---

## Architecture

### Data Flow

```
.tcg Archive
├── campaign.json          # Campaign structure
├── campaign_images/       # Backgrounds, portraits, sprites
└── locales/{lang}.json    # Dialogue text keys

        ↓  (tcg-bridge.ts)

applyCampaignData()        # campaign-store.ts
        ↓
CAMPAIGN_DATA              # In-memory campaign store
        ↓
CampaignScreen             # React UI renders map
        ↓
isNodeUnlocked()           # Unlock logic checks progress
        ↓
Progression API            # localStorage persistence
```

### Core Files

| File | Purpose |
|------|---------|
| `campaign-types.ts` | TypeScript interfaces for campaign data |
| `campaign-store.ts` | State management and unlock logic |
| `campaign-duel-result.ts` | Post-duel reward calculation |
| `tcg-bridge.ts` | Loads campaign from .tcg archive |
| `progression.ts` | Campaign progress persistence |

---

## CampaignData Structure

### CampaignData

```typescript
interface CampaignData {
  chapters: Chapter[];
}
```

### Chapter

```typescript
interface Chapter {
  id: string;           // Unique chapter identifier
  nodes: CampaignNode[];
}
```

### CampaignNode

```typescript
interface CampaignNode {
  id: string;
  type: 'duel' | 'story' | 'reward' | 'shop' | 'branch';
  opponentId?: number;        // For duel nodes
  completeOnLoss?: boolean;   // Node completes even on defeat
  gauntlet?: number[];        // Ordered opponent IDs for gauntlet
  alwaysVisible?: boolean;    // Show on map when locked
  position: { x: number; y: number };  // Map coordinates
  unlockCondition: UnlockCondition | null;  // null = always unlocked
  rewards?: NodeRewards;
  rewardConfig?: DuelRewardConfig;  // Rank-based rewards
  dialogueKeys?: string[];    // i18n keys for story text
  preDialogue?: DialogueScene | null;   // Before duel
  postDialogue?: DialogueScene | null;  // After duel
  connections?: string[];     // Visual connections to other nodes
}
```

---

## Node Types

### `duel`

Standard duel against a configured opponent.

```typescript
{
  id: 'ch1_duel1',
  type: 'duel',
  opponentId: 1,
  position: { x: 100, y: 200 },
  unlockCondition: null,  // Start node
  rewards: { coins: 50 },
  rewardConfig: { /* rank-based rewards */ }
}
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `opponentId` | Yes | References opponent in opponents.json |
| `completeOnLoss` | No | If true, node completes even if player loses |
| `preDialogue` | No | Dialogue scene before duel starts |
| `postDialogue` | No | Dialogue scene after duel ends |

### `story`

Dialogue-only node with no gameplay.

```typescript
{
  id: 'ch1_story1',
  type: 'story',
  position: { x: 200, y: 200 },
  unlockCondition: { type: 'nodeComplete', nodeId: 'ch1_duel1' },
  scene: {
    background: 'bg_forest',
    dialogue: [
      { textKey: 'ch1_line1', speaker: 'hero', portrait: 'port_hero', side: 'left' }
    ]
  }
}
```

### `reward`

Grants immediate rewards without a duel.

```typescript
{
  id: 'ch1_bonus',
  type: 'reward',
  position: { x: 300, y: 300 },
  unlockCondition: { type: 'allComplete', nodeIds: ['ch1_duel1', 'ch1_duel2'] },
  rewards: { coins: 100, cards: ['rare_card_01'] }
}
```

### `shop`

Opens the shop interface with optional filtered inventory.

```typescript
{
  id: 'ch1_shop',
  type: 'shop',
  position: { x: 400, y: 200 },
  unlockCondition: { type: 'nodeComplete', nodeId: 'ch1_duel1' },
  rewards: { unlocks: ['shop_tier_2'] }  // Unlocks shop tiers
}
```

### `branch`

Presents a choice between multiple paths.

```typescript
{
  id: 'ch1_choice',
  type: 'branch',
  position: { x: 500, y: 200 },
  unlockCondition: { type: 'nodeComplete', nodeId: 'ch1_story1' },
  connections: ['ch1_path_a', 'ch1_path_b']
}
```

---

## Unlock Conditions

Unlock conditions determine when a node becomes playable. The start node must have `unlockCondition: null`.

### Condition Types

#### `nodeComplete`

Requires a specific node to be completed.

```typescript
{
  type: 'nodeComplete',
  nodeId: 'ch1_duel1'
}
```

#### `allComplete`

Requires ALL specified nodes to be completed.

```typescript
{
  type: 'allComplete',
  nodeIds: ['ch1_duel1', 'ch1_duel2', 'ch1_duel3']
}
```

#### `anyComplete`

Requires ANY of the specified nodes to be completed.

```typescript
{
  type: 'anyComplete',
  nodeIds: ['side_quest_a', 'side_quest_b']
}
```

#### `cardOwned`

Requires the player to own a specific card.

```typescript
{
  type: 'cardOwned',
  cardId: 'legendary_dragon'
}
```

#### `winsCount`

Requires a minimum number of total duel wins.

```typescript
{
  type: 'winsCount',
  count: 10
}
```

---

## Unlock Logic

The `isNodeUnlocked()` function in `campaign-store.ts` evaluates unlock conditions against the player's `CampaignProgress`.

```typescript
export function isNodeUnlocked(
  nodeId: string,
  progress: CampaignProgress
): boolean {
  const node = getNode(nodeId);
  if (!node) return false;

  // No unlock condition means always unlocked (start node)
  if (node.unlockCondition === null) return true;

  const cond = node.unlockCondition;
  switch (cond.type) {
    case 'nodeComplete':
      return progress.completedNodes.includes(cond.nodeId);
    
    case 'allComplete':
      return cond.nodeIds.every(id => 
        progress.completedNodes.includes(id)
      );
    
    case 'anyComplete':
      return cond.nodeIds.some(id => 
        progress.completedNodes.includes(id)
      );
    
    case 'cardOwned':
      return Progression.ownsCard(cond.cardId);
    
    case 'winsCount': {
      const opponents = Progression.getOpponents();
      const totalWins = Object.values(opponents)
        .reduce((sum, o) => sum + o.wins, 0);
      return totalWins >= cond.count;
    }
    
    default:
      return false;
  }
}
```

---

## Rewards

### NodeRewards (Direct Rewards)

Immediate rewards granted when a node is completed.

```typescript
interface NodeRewards {
  coins?: number;           // Base coin amount
  currencyId?: string;      // Alternative currency (default: 'coins')
  cards?: string[];         // Specific card IDs to grant
  unlocks?: string[];       // Unlock keys (shop tiers, chapters, etc.)
}
```

### DuelRewardConfig (Rank-Based Rewards)

Rank-based rewards with S/A/B multipliers and card drops.

```typescript
interface DuelRewardConfig {
  mode?: 'campaign' | 'free' | 'both';
  ranks: Record<BadgeRank, RankRewardEffect>;
  dropPool?: DropPoolEntry[];  // Weighted card drops
}

interface RankRewardEffect {
  coinMultiplier: number;   // Applied to base coins
  cardDropCount: number;    // Number of cards to drop
  rarityRates?: Partial<Record<Rarity, number>>;
  currencyId?: string;
}
```

**Default Configuration:**

```typescript
const DEFAULT_REWARD_CONFIG: DuelRewardConfig = {
  mode: 'both',
  ranks: {
    S: { coinMultiplier: 2.5, cardDropCount: 3 },
    A: { coinMultiplier: 1.0, cardDropCount: 0 },
    B: { coinMultiplier: 0.8, cardDropCount: 0 },
  },
};
```

---

## Rank Calculation

Battle badges are calculated based on duel performance. Two categories are evaluated: **POW** (Power) and **TEC** (Technique).

### POW (Power) Scoring

| Factor | Impact |
|--------|--------|
| Win by LP zero | +2 points |
| Win by other means | -20 points |
| Turns taken | 4 turns: +14, 8: +8, 12: +2, 20: -4, 28: -10, 28+: -14 |
| Fusions performed | 0: -4, 1: +4, 3: +6, 5: +2, 5+: 0 |
| LP remaining | 999: -6, 3999: 0, 5999: +2, 7999: +6, 8000: +10 |
| Opponent LP at end | 0: +4, 1-999: 0, 1000+: -6 |
| Cards drawn | 5: +6, 10: +2, 15: 0, 25: -4, 25+: -8 |
| Monsters played | 3: +2, 6: 0, 10: -2, 10+: -6 |

### TEC (Technique) Scoring

| Factor | Impact |
|--------|--------|
| Win by LP zero | +2 points |
| Win by other means | -10 points |
| Spells activated | 0: -6, 1: +2, 3: +8, 5: +4, 8: 0, 8+: -6 |
| Traps activated | 0: -4, 1: +4, 3: +8, 5: +2, 5+: -4 |
| Fusions performed | 0: -4, 1: +2, 3: +6, 5: +2, 5+: -2 |
| LP remaining | 999: -4, 3999: 0, 5999: +2, 7999: +4, 8000: +6 |
| Turns taken | 4: +2, 8: +4, 12: +6, 16: +2, 24: -2, 24+: -6 |
| Graveyard size | 4: -2, 8: +2, 14: +4, 20: 0, 20+: -4 |

### Rank Thresholds

| Score | Rank |
|-------|------|
| 80+ | S |
| 60-79 | A |
| Below 60 | B |

The **best** of POW and TEC ranks determines the final reward tier.

---

## Gauntlet System

Gauntlets are sequences of back-to-back duels with **no saving between matches**.

### Configuration

```typescript
{
  id: 'ch2_gauntlet',
  type: 'duel',
  gauntlet: [5, 6, 7],  // Three consecutive opponents
  position: { x: 200, y: 300 },
  unlockCondition: { type: 'nodeComplete', nodeId: 'ch2_start' },
  rewards: { coins: 500, cards: ['gauntlet_reward'] }
}
```

### Behavior

1. Player faces opponents in order (5 → 6 → 7)
2. No checkpoint saves between duels
3. Losing at any point fails the entire gauntlet
4. Winning all duels grants the full reward
5. Pre-dialogue plays before the first duel
6. Post-dialogue plays after the final duel

### GauntletTransitionModal

Between gauntlet duels, a transition screen displays:
- Current opponent defeated
- Next opponent preview
- Player's current LP (carries over if configured)
- Option to continue or abandon

---

## Dialogue Integration

### DialogueScene Format

```typescript
interface DialogueScene {
  background: string;           // Background image key
  dialogue: DialogueLine[];
}

interface DialogueLine {
  textKey: string;              // i18n key for text
  speaker: string;              // Speaker name or i18n key
  portrait?: string;            // Portrait image key
  side?: 'left' | 'right';      // Portrait position
  foregrounds?: ForegroundSprite[] | null;  // Character sprites
}

interface ForegroundSprite {
  sprite: string;               // Sprite image path
  position: 'far-left' | 'left' | 'center' | 'right' | 'far-right';
  flipX?: boolean;              // Mirror horizontally
  active?: boolean;             // Full opacity vs dimmed
}
```

### Node Configuration

```typescript
{
  id: 'ch1_boss',
  type: 'duel',
  opponentId: 10,
  preDialogue: {
    background: 'bg_castle',
    dialogue: [
      {
        textKey: 'boss_intro_line1',
        speaker: 'Warlord',
        portrait: 'port_warlord',
        side: 'right',
        foregrounds: [
          { sprite: 'chars/warlord', position: 'right', active: true },
          { sprite: 'chars/hero', position: 'left', active: false }
        ]
      }
    ]
  },
  postDialogue: {
    background: 'bg_castle',
    dialogue: [
      { textKey: 'boss_defeat_line1', speaker: 'Warlord', side: 'right' }
    ]
  }
}
```

### Legacy dialogueKeys Support

For backward compatibility, `dialogueKeys` array is supported and auto-converted from `scene.dialogue`:

```typescript
// In applyCampaignData()
if (scene?.dialogue && !node.dialogueKeys?.length) {
  node.dialogueKeys = scene.dialogue
    .map(d => d.textKey)
    .filter((k): k is string => !!k);
}
```

---

## Campaign Progress Persistence

### Storage Structure

Campaign progress is saved per slot in localStorage:

```
tcg_s{slot}_campaign_progress
```

### CampaignProgress Interface

```typescript
interface CampaignProgress {
  completedNodes: string[];  // IDs of completed nodes
  currentChapter: string;    // Active chapter ID
}
```

### Progression API Methods

```typescript
// Get current progress
Progression.getCampaignProgress(): CampaignProgress

// Save progress
Progression.saveCampaignProgress(progress: CampaignProgress): void

// Mark a node complete (auto-saves)
Progression.markNodeComplete(nodeId: string): CampaignProgress

// Check if node is complete
Progression.isNodeComplete(nodeId: string): boolean
```

### Example Progress Object

```json
{
  "completedNodes": ["ch1_duel1", "ch1_story1", "ch1_duel2"],
  "currentChapter": "chapter1"
}
```

---

## Campaign Loading

### tcg-bridge.ts Flow

When a .tcg archive is loaded, campaign data is extracted and applied:

```typescript
export async function loadAndApplyTcg(
  source: string | ArrayBuffer,
  options?: { lang?: string; onProgress?: (percent: number) => void }
): Promise<BridgeLoadResult> {
  // 1. Extract ZIP contents
  const result = await loadTcgFile(buffer, { lang, onProgress });
  
  // 2. Apply campaign data if present
  if (result.campaignData) {
    applyCampaignData(result.campaignData as unknown as CampaignData);
  }
  
  // 3. Extract campaign images to blob URLs
  // 4. Extract campaign i18n strings
  
  return result;
}
```

### applyCampaignData()

The `applyCampaignData()` function in `campaign-store.ts`:

1. Normalizes legacy `scene.dialogue` to `dialogueKeys`
2. Preserves `preDialogue` and `postDialogue` scenes
3. Replaces `CAMPAIGN_DATA.chapters` with new data

```typescript
export function applyCampaignData(data: CampaignData): void {
  for (const chapter of data.chapters) {
    for (const node of chapter.nodes) {
      // Convert legacy scene format
      const raw = node as unknown as Record<string, unknown>;
      const scene = raw['scene'] as { dialogue?: { textKey?: string }[] } | undefined;
      if (scene?.dialogue && !node.dialogueKeys?.length) {
        node.dialogueKeys = scene.dialogue
          .map(d => d.textKey)
          .filter((k): k is string => !!k);
      }
      
      // Preserve pre/post dialogue scenes
      const pre = raw['preDialogue'] as DialogueScene | null | undefined;
      const post = raw['postDialogue'] as DialogueScene | null | undefined;
      if (pre) node.preDialogue = pre;
      if (post) node.postDialogue = post;
    }
  }
  CAMPAIGN_DATA.chapters = data.chapters;
}
```

---

## Examples

### Simple Duel Node

```json
{
  "id": "ch1_training",
  "type": "duel",
  "position": { "x": 100, "y": 200 },
  "unlockCondition": null,
  "opponentId": 1,
  "rewards": { "coins": 50 }
}
```

### Story Node with Unlock Condition

```json
{
  "id": "ch1_arrival",
  "type": "story",
  "position": { "x": 200, "y": 200 },
  "unlockCondition": { "type": "nodeComplete", "nodeId": "ch1_training" },
  "scene": {
    "background": "bg_village",
    "dialogue": [
      {
        "textKey": "ch1_arrival_line1",
        "speaker": "Elder",
        "portrait": "port_elder",
        "side": "left"
      },
      {
        "textKey": "ch1_arrival_line2",
        "speaker": "Hero",
        "portrait": "port_hero",
        "side": "right"
      }
    ]
  }
}
```

### Gauntlet Node

```json
{
  "id": "ch2_tournament",
  "type": "duel",
  "position": { "x": 300, "y": 300 },
  "unlockCondition": { "type": "nodeComplete", "nodeId": "ch2_start" },
  "gauntlet": [10, 11, 12, 13],
  "rewards": { "coins": 300, "cards": ["trophy_card"] },
  "rewardConfig": {
    "ranks": {
      "S": { "coinMultiplier": 3.0, "cardDropCount": 5 },
      "A": { "coinMultiplier": 1.5, "cardDropCount": 2 },
      "B": { "coinMultiplier": 1.0, "cardDropCount": 0 }
    }
  },
  "postDialogue": {
    "background": "bg_arena",
    "dialogue": [
      { "textKey": "tournament_victory", "speaker": "Announcer", "side": "center" }
    ]
  }
}
```

### Branch Node

```json
{
  "id": "ch3_choice",
  "type": "branch",
  "position": { "x": 400, "y": 200 },
  "unlockCondition": { "type": "nodeComplete", "nodeId": "ch3_preparation" },
  "connections": ["ch3_alliance_path", "ch3_conquest_path"]
}
```

### Boss Node with Pre-Dialogue

```json
{
  "id": "ch1_boss",
  "type": "duel",
  "position": { "x": 500, "y": 200 },
  "unlockCondition": { "type": "allComplete", "nodeIds": ["ch1_duel1", "ch1_duel2"] },
  "opponentId": 99,
  "rewards": { "coins": 200, "cards": ["boss_card"], "unlocks": ["chapter2"] },
  "preDialogue": {
    "background": "bg_throne",
    "dialogue": [
      {
        "textKey": "boss_confrontation",
        "speaker": "Dark Lord",
        "portrait": "port_darklord",
        "side": "right",
        "foregrounds": [
          { "sprite": "chars/darklord", "position": "right", "active": true }
        ]
      }
    ]
  }
}
```

---

## Dependencies

### campaign-types.ts

Core type definitions:
- `CampaignData`
- `Chapter`
- `CampaignNode`
- `UnlockCondition`
- `NodeRewards`
- `CampaignProgress`
- `PendingDuel`

### campaign-store.ts

State management:
- `CAMPAIGN_DATA` — In-memory store
- `applyCampaignData()` — Load campaign from .tcg
- `isNodeUnlocked()` — Unlock evaluation
- `getChapter()` / `getNode()` — Lookup functions

### campaign-duel-result.ts

Post-duel processing:
- `computeCampaignDuelNav()` — Result handling
- Reward calculation with badge multipliers
- Card drop rolling
- Navigation decision (result screen, dialogue, campaign)

### reward-config.ts

Rank-based reward configuration:
- `DuelRewardConfig` interface
- `RankRewardEffect` interface
- `resolveRewardConfig()` — Config resolution
- `getRankEffect()` — Get effects for rank

### progression.ts

Persistence layer:
- `getCampaignProgress()` — Load from localStorage
- `saveCampaignProgress()` — Save to localStorage
- `markNodeComplete()` — Mark and persist completion

---

## Notes / Gotchas

### Start Node Must Have Null Unlock

The first node in a campaign **must** have `unlockCondition: null`. This is how the system identifies the entry point.

```typescript
// CORRECT
{
  id: 'start',
  type: 'duel',
  unlockCondition: null  // Always available
}

// WRONG - will never be unlocked
{
  id: 'start',
  type: 'duel',
  unlockCondition: { type: 'nodeComplete', nodeId: 'nonexistent' }
}
```

### Gauntlets Have No Checkpoints

Gauntlet duels run back-to-back without saving. If the player refreshes the page mid-gauntlet, progress is lost. Design gauntlets to be completable in a single session.

### dialogueKeys vs DialogueScene

- `dialogueKeys` — Legacy array of i18n keys for simple story nodes
- `DialogueScene` — Full structured dialogue with backgrounds, portraits, sprites

Modern campaigns should use `preDialogue` and `postDialogue` with full `DialogueScene` objects.

### Node Completion Is Persisted

Once a node is marked complete via `markNodeComplete()`, it stays complete. There is no "uncomplete" function. Design campaigns with this permanence in mind.

### Map Rendering Is UI Responsibility

The campaign system provides:
- Node positions (`position: { x, y }`)
- Connection lines (`connections: string[]`)
- Unlock status (`isNodeUnlocked()`)

The actual rendering (SVG, Canvas, HTML) is handled by `CampaignScreen.tsx` in the React layer.

### alwaysVisible Option

By default, locked nodes are hidden from the map. Set `alwaysVisible: true` to show locked nodes (dimmed or with a lock icon).

```typescript
{
  id: 'secret_boss',
  type: 'duel',
  alwaysVisible: true,  // Shows on map even when locked
  unlockCondition: { type: 'cardOwned', cardId: 'secret_key' }
}
```

### completeOnLoss for Scripted Defeats

Some story moments require the player to lose. Set `completeOnLoss: true` to advance the campaign even on defeat.

```typescript
{
  id: 'ch1_inevitable_defeat',
  type: 'duel',
  opponentId: 999,  // Overpowered boss
  completeOnLoss: true,  // Story continues after losing
  postDialogue: {
    dialogue: [
      { textKey: 'rescue_scene', speaker: 'Ally', side: 'left' }
    ]
  }
}
```

---

## References

- **TCG Format** → `docs/tcg-format.md` (G11)
- **Opponents & Decks** → `docs/opponents-decks.md` (G5)
- **Shop & Progression** → `docs/shop-progression.md` (G7)
- **Effect System** → `docs/effect-system.md` (G2)
- **UI Architecture** → `docs/ui-architecture.md` (G9)

---

**Status:** Complete
