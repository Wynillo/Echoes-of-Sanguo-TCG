// ── Default Card Types ───────────────────────────────────────────
export const TCG_TYPE_MONSTER   = 1;
export const TCG_TYPE_FUSION    = 2;
export const TCG_TYPE_SPELL     = 3;
export const TCG_TYPE_TRAP      = 4;
export const TCG_TYPE_EQUIPMENT = 5;
export const TCG_TYPES = [TCG_TYPE_MONSTER, TCG_TYPE_FUSION, TCG_TYPE_SPELL, TCG_TYPE_TRAP, TCG_TYPE_EQUIPMENT] as const;

// ── Trap Trigger ─────────────────────────────────────────────
export const TCG_TRAP_ON_ATTACK               = 1;
export const TCG_TRAP_ON_OWN_MONSTER_ATTACKED = 2;
export const TCG_TRAP_ON_OPPONENT_SUMMON      = 3;
export const TCG_TRAP_MANUAL                  = 4;
export const TCG_TRAP_ON_OPPONENT_SPELL       = 5;
export const TCG_TRAP_ON_ANY_SUMMON           = 6;
export const TCG_TRAP_ON_OPPONENT_TRAP        = 7;
export const TCG_TRAP_ON_OPP_CARD_EFFECT     = 8;
export const TCG_TRAP_ON_OPPONENT_DRAW       = 9;
export const TCG_TRAP_TRIGGERS = [
  TCG_TRAP_ON_ATTACK,
  TCG_TRAP_ON_OWN_MONSTER_ATTACKED,
  TCG_TRAP_ON_OPPONENT_SUMMON,
  TCG_TRAP_MANUAL,
  TCG_TRAP_ON_OPPONENT_SPELL,
  TCG_TRAP_ON_ANY_SUMMON,
  TCG_TRAP_ON_OPPONENT_TRAP,
  TCG_TRAP_ON_OPP_CARD_EFFECT,
  TCG_TRAP_ON_OPPONENT_DRAW,
] as const;

/** Maps string trap-trigger names to their numeric IDs. */
export const TCG_TRAP_TRIGGER_NAME_TO_ID: Record<string, number> = {
  onAttack:              TCG_TRAP_ON_ATTACK,
  onOwnMonsterAttacked:  TCG_TRAP_ON_OWN_MONSTER_ATTACKED,
  onOpponentSummon:      TCG_TRAP_ON_OPPONENT_SUMMON,
  manual:                TCG_TRAP_MANUAL,
  onOpponentSpell:       TCG_TRAP_ON_OPPONENT_SPELL,
  onAnySummon:           TCG_TRAP_ON_ANY_SUMMON,
  onOpponentTrap:        TCG_TRAP_ON_OPPONENT_TRAP,
  onOppCardEffect:       TCG_TRAP_ON_OPP_CARD_EFFECT,
  onOpponentDraw:        TCG_TRAP_ON_OPPONENT_DRAW,
};

export const DEFAULT_GAME_RULES: TcgGameRules = {
  startingLP:        8000,
  maxLP:             99999,
  handLimitDraw:     10,
  handLimitEnd:      8,
  fieldZones:        5,
  maxDeckSize:       40,
  maxCardCopies:     3,
  drawPerTurn:       1,
  handRefillSize:    5,
  refillHandEnabled: true,
};

// ── Card Schema ──────────────────────────────────────────────
export interface TcgCard {
  id:         number;
  level:      number;       
  atk?:       number;       
  def?:       number;       
  rarity:     number;       
  type:       number;       
  attribute?: number;      
  race?:      number;
  effect?:    string;
  spirit?:    boolean;
  spellType?:   number;
  trapTrigger?: number;
  target?:      string;
  atkBonus?:    number;
  defBonus?:    number;
  equipReqRace?: number;
  equipReqAttr?: number;
  name?:        string;
  description?: string;
}

// ── Card Definition (localized) ──────────────────────────────
export interface TcgCardDefinition {
  id:          number;
  name:        string;
  description: string;
}

// ── Parsed Card (flat merge of TcgCard + TcgCardDefinition) ──
// Wire-format ints are left as-is; the engine bridge handles int→enum/string conversion.
export interface TcgParsedCard {
  id:            number;
  name:          string;
  description:   string;
  type:          number;
  level:         number;
  rarity:        number;
  atk?:          number;
  def?:          number;
  attribute?:    number;
  race?:         number;
  effect?:       string;
  spirit?:       boolean;
  spellType?:    number;
  trapTrigger?:  number;
  target?:       string;
  atkBonus?:     number;
  defBonus?:     number;
  equipReqRace?: number;
  equipReqAttr?: number;
}

// ── Opponent Deck (opponents/opponent_deck_N.json inside base.tcg) ──
export interface TcgOpponentDeck {
  id:        number;
  name:      string;
  title:     string;
  race:      number;
  flavor:    string;
  coinsWin:  number;
  coinsLoss: number;
  deckIds:   number[];
  behavior?: string;
}

// ── Opponent Description (localized) ────────────────────────────
export interface TcgOpponentDescription {
  id:     number;
  name:   string;
  title:  string;
  flavor: string;
}

// ── Manifest (format versioning & feature flags) ────────────────
export interface TcgManifest {
  formatVersion: number;
  name?: string;
  author?: string;
  features?: string[];
  minEngineVersion?: string;
}

// ── Races JSON ───────────────────────────────────────────────
export interface TcgRaceEntry {
  id:     number;
  key:    string;
  value?: string;
  color:  string;
  icon?:  string;
}
export type TcgRacesJson = TcgRaceEntry[];

// ── Attributes JSON ──────────────────────────────────────────
export interface TcgAttributeEntry {
  id:      number;
  key:     string;
  value:   string;
  color:   string;
  symbol?: string;
}
export type TcgAttributesJson = TcgAttributeEntry[];

// ── Card Types JSON ──────────────────────────────────────────
export interface TcgCardTypeEntry {
  id:    number;
  key:   string;
  value: string;
  color: string;
}
export type TcgCardTypesJson = TcgCardTypeEntry[];

// ── Rarities JSON ────────────────────────────────────────────
export interface TcgRarityEntry {
  id:    number;
  key:   string;
  value?: string;
  color: string;
}
export type TcgRaritiesJson = TcgRarityEntry[];

// ── Locale overrides ─────────────────────────────────────────
export type TcgLocaleOverrides = Record<string, string>;

// ── Fusion Formulas ──────────────────────────────────────────
export interface TcgFusionFormula {
  id:         string;
  comboType:  string;
  operand1:   number;
  operand2:   number;
  priority:   number;
  resultPool: number[];
}

export interface TcgMeta {
  fusionRecipes?: Array<{ materials: [number, number]; result: number }>;
  opponentConfigs?: TcgOpponentDeck[];
  starterDecks?: Record<string, number[]>;
}

// ── Validation result ────────────────────────────────────────
export interface ValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

// ── Shop JSON schema ─────────────────────────────────────────
export interface TcgPackSlot {
  count: number;
  rarity?: number;
  pool?: string;
  distribution?: Record<string, number>;
}

export interface TcgCardPoolFilter {
  races?: number[];
  attributes?: number[];
  types?: number[];
  spellTypes?: number[];
  ids?: number[];
  maxRarity?: number;
  minRarity?: number;
  maxAtk?: number;
  maxLevel?: number;
}

export interface TcgCardPool {
  include?: TcgCardPoolFilter;
  exclude?: TcgCardPoolFilter;
}

export interface TcgPackDef {
  id: string;
  name?: string;
  desc?: string;
  nameKey?: string;
  descKey?: string;
  price: number;
  icon: string;
  color: string;
  slots: TcgPackSlot[];
  filter?: string;
  cardPool?: TcgCardPool;
  unlockCondition?: { type: string; nodeId?: string; count?: number } | null;
}

export interface TcgShopJson {
  packs: TcgPackDef[];
  currency?: { nameKey: string; icon: string };
  backgrounds?: Record<string, string>;
}

// ── Campaign JSON ────────────────────────────────────────────
export interface CampaignData { chapters: CampaignChapter[]; }
export type TcgCampaignJson = CampaignData;

export interface CampaignChapter { id: string; titleKey: string; nodes: CampaignNode[]; }

export type CampaignNode = DuelNode | StoryNode | RewardNode | ShopNode | BranchNode;

interface NodeBase {
  id: string;
  type: string;
  position: { x: number; y: number };
  mapIcon: string | null;
  unlockCondition: UnlockCondition | null;
  rewards: CampaignRewards | null;
}
export interface DuelNode   extends NodeBase { type: 'duel';   opponentId: number; isBoss: boolean; completeOnLoss?: boolean; preDialogue: DialogueScene | null; postDialogue: DialogueScene | null; }
export interface StoryNode  extends NodeBase { type: 'story';  scene: DialogueScene; }
export interface RewardNode extends NodeBase { type: 'reward'; }
export interface ShopNode   extends NodeBase { type: 'shop';   shopId: string; }
export interface BranchNode extends NodeBase { type: 'branch'; promptKey: string; options: { labelKey: string; unlocks: string[] }[]; }

export type UnlockCondition =
  | { type: 'nodeComplete'; nodeId: string }
  | { type: 'allComplete';  nodeIds: string[] }
  | { type: 'anyComplete';  nodeIds: string[] }
  | { type: 'cardOwned';    cardId: number }
  | { type: 'winsCount';    count: number };

export interface CampaignRewards { coins: number | null; cards: string[] | null; unlocks: string[] | null; }

export interface DialogueScene { background: string; dialogue: DialogueLine[]; }
export interface DialogueLine {
  textKey: string;
  speaker: string;
  portrait: string | null;
  side: 'left' | 'right';
  foregrounds: ForegroundSprite[] | null;
}
export interface ForegroundSprite {
  sprite: string;
  position: 'far-left' | 'left' | 'center' | 'right' | 'far-right';
  flipX: boolean;
  active: boolean;
}

// ── Game Rules ──────────────────────────────────────────
export interface TcgGameRules {
  startingLP:        number;   // life points at game start
  maxLP:             number;   // hard cap on life points
  handLimitDraw:     number;   // max hand size during draw phase
  handLimitEnd:      number;   // max hand size at end of turn
  fieldZones:        number;   // monster/spell-trap zone count per side
  maxDeckSize:       number;   // maximum cards in a deck
  maxCardCopies:     number;   // max copies of a single card per deck
  drawPerTurn:       number;   // cards drawn per draw phase
  handRefillSize:    number;   // hand size threshold for refill
  refillHandEnabled: boolean;  // whether hand-refill mechanic is active
}

// ── Load result ──────────────────────────────────────────────
export interface TcgLoadResult {
  cards:                TcgCard[];
  parsedCards:          TcgParsedCard[];
  localeOverrides:      Map<string, Record<string, string>>;
  imageGetters:         Map<number, () => Promise<ArrayBuffer>>;
  meta?:                TcgMeta;
  manifest?:            TcgManifest;
  starterDecks?:        Record<string, number[]>;
  warnings:             string[];
  opponents?:           TcgOpponentDeck[];
  opponentDescriptions?: Map<string, TcgOpponentDescription[]>;
  typeMeta?:            {
    races?:      TcgRacesJson;
    attributes?: TcgAttributesJson;
    cardTypes?:  TcgCardTypesJson;
    rarities?:   TcgRaritiesJson;
  };
  rules?:               TcgGameRules;
  shopData?:            TcgShopJson;
  rawShopBackgrounds?:  Map<string, ArrayBuffer>;
  campaignData?:        TcgCampaignJson;
  fusionFormulas?:      TcgFusionFormula[];
}
