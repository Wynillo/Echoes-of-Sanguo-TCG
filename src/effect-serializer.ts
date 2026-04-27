import type {
  TcgCardEffectBlock,
  TcgCardEffectFilter,
  TcgEffectCost,
  TcgEffectDescriptor,
  TcgEffectTrigger,
  TcgStatTarget,
  TcgTrapTrigger,
  TcgValueExpr,
} from './types.js';
import { TCG_ALL_TRIGGERS } from './types.js';

// ── ValueExpr ────────────────────────────────────────────────

function serializeValueExpr(v: TcgValueExpr): string {
  if (typeof v === 'number') return String(v);
  const roundSuffix = v.round === 'floor' ? 'f' : 'c';
  return `${v.from}*${v.multiply}${roundSuffix}`;
}

function deserializeValueExpr(s: string): TcgValueExpr {
  const n = Number(s);
  if (!isNaN(n)) return n;

  const m = s.match(/^([\w.]+)\*([0-9.]+)([fc])$/);
  if (!m) throw new Error(`Invalid ValueExpr: ${s}`);

  const from = m[1];
  if (from !== 'attacker.effectiveATK' && from !== 'summoned.atk') {
    throw new Error(`Unknown ValueExpr source: ${from}`);
  }
  return {
    from,
    multiply: parseFloat(m[2]),
    round: m[3] === 'f' ? 'floor' : 'ceil',
  };
}

// ── CardEffectFilter ─────────────────────────────────────────

function serializeCardFilter(f: TcgCardEffectFilter): string {
  const parts: string[] = [];
  if (f.race     !== undefined) parts.push(`r=${f.race}`);
  if (f.attr     !== undefined) parts.push(`a=${f.attr}`);
  if (f.cardType !== undefined) parts.push(`ct=${f.cardType}`);
  if (f.cardId   !== undefined) parts.push(`id=${f.cardId}`);
  if (f.maxAtk   !== undefined) parts.push(`maxAtk=${f.maxAtk}`);
  if (f.minAtk   !== undefined) parts.push(`minAtk=${f.minAtk}`);
  if (f.maxDef   !== undefined) parts.push(`maxDef=${f.maxDef}`);
  if (f.maxLevel !== undefined) parts.push(`maxLevel=${f.maxLevel}`);
  if (f.minLevel !== undefined) parts.push(`minLevel=${f.minLevel}`);
  if (f.random   !== undefined) parts.push(`rnd=${f.random}`);
  return `{${parts.join(',')}}`;
}

function deserializeCardFilter(s: string): TcgCardEffectFilter {
  const inner = s.slice(1, -1);
  if (inner.trim() === '') return {};
  const filter: TcgCardEffectFilter = {};
  for (const pair of inner.split(',')) {
    const [key, val] = pair.split(/[=:]/);
    switch (key.trim()) {
      case 'r':        filter.race = parseInt(val, 10); break;
      case 'a':        filter.attr = parseInt(val, 10); break;
      case 'ct':       filter.cardType = parseInt(val, 10); break;
      case 'id':       filter.cardId = val.trim(); break;
      case 'maxAtk':   filter.maxAtk = parseInt(val, 10); break;
      case 'minAtk':   filter.minAtk = parseInt(val, 10); break;
      case 'maxDef':   filter.maxDef = parseInt(val, 10); break;
      case 'maxLevel': filter.maxLevel = parseInt(val, 10); break;
      case 'minLevel': filter.minLevel = parseInt(val, 10); break;
      case 'rnd':      filter.random = parseInt(val, 10); break;
      default: throw new Error(`Unknown CardFilter key: ${key}`);
    }
  }
  return filter;
}

function isCardFilterEmpty(f: TcgCardEffectFilter): boolean {
  return Object.keys(f).length === 0;
}

// ── StatTarget ───────────────────────────────────────────────

const STAT_TARGETS = new Set<string>(['ownMonster', 'oppMonster', 'attacker', 'defender', 'summonedFC']);

function asStatTarget(s: string): TcgStatTarget {
  if (!STAT_TARGETS.has(s)) throw new Error(`Invalid StatTarget: ${s}`);
  return s as TcgStatTarget;
}

// ── Action serialization ─────────────────────────────────────

function isFilterArg(s: string): boolean {
  return s.startsWith('{') && s.endsWith('}');
}

/** Serialize optional filter parameter */
function serializeFilterIfExists(filter?: TcgCardEffectFilter): string {
  return filter && !isCardFilterEmpty(filter) ? `,${serializeCardFilter(filter)}` : '';
}

/**
 * Registry of action serializers organized by category.
 * Each serializer handles converting a typed EffectDescriptor to string format.
 * This replaces the 106-line switch statement with a more maintainable registry pattern.
 */
const ACTION_SERIALIZERS: Record<string, (a: TcgEffectDescriptor) => string> = {
  // ── Damage & Healing ──────────────────────────────────
  dealDamage: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'dealDamage' }>;
    return `dealDamage(${desc.target},${serializeValueExpr(desc.value)})`;
  },
  gainLP: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'gainLP' }>;
    return `gainLP(${desc.target},${serializeValueExpr(desc.value)})`;
  },

  // ── Card Draw ─────────────────────────────────────────
  draw: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'draw' }>;
    return `draw(${desc.target},${desc.count})`;
  },
  drawThenDiscard: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'drawThenDiscard' }>;
    return `drawThenDiscard(${desc.drawCount},${desc.discardCount})`;
  },
  peekTopCard: () => 'peekTopCard()',

  // ── Field Buffs/Debuffs ───────────────────────────────
  buffField: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'buffField' }>;
    return `buffField(${desc.value}${serializeFilterIfExists(desc.filter)})`;
  },
  tempBuffField: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'tempBuffField' }>;
    return `tempBuffField(${desc.value}${serializeFilterIfExists(desc.filter)})`;
  },
  debuffField: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'debuffField' }>;
    return `debuffField(${desc.atkD},${desc.defD})`;
  },
  tempDebuffField: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'tempDebuffField' }>;
    return `tempDebuffField(${desc.atkD}${desc.defD !== undefined ? `,${desc.defD}` : ''})`;
  },

  // ── Stat Bonuses ──────────────────────────────────────
  tempAtkBonus: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'tempAtkBonus' }>;
    return `tempAtkBonus(${desc.target},${desc.value})`;
  },
  permAtkBonus: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'permAtkBonus' }>;
    return `permAtkBonus(${desc.target},${desc.value}${serializeFilterIfExists(desc.filter)})`;
  },
  tempDefBonus: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'tempDefBonus' }>;
    return `tempDefBonus(${desc.target},${desc.value})`;
  },
  permDefBonus: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'permDefBonus' }>;
    return `permDefBonus(${desc.target},${desc.value})`;
  },
  halveAtk: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'halveAtk' }>;
    return `halveAtk(${desc.target})`;
  },
  doubleAtk: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'doubleAtk' }>;
    return `doubleAtk(${desc.target})`;
  },
  swapAtkDef: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'swapAtkDef' }>;
    return `swapAtkDef(${desc.side})`;
  },

  // ── Bounce / Return to Hand ───────────────────────────
  bounceStrongestOpp: () => 'bounceStrongestOpp()',
  bounceAttacker: () => 'bounceAttacker()',
  bounceAllOppMonsters: () => 'bounceAllOppMonsters()',
  bounceOppHandToDeck: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'bounceOppHandToDeck' }>;
    return `bounceOppHandToDeck(${desc.count})`;
  },

  // ── Search / Add to Hand ──────────────────────────────
  searchDeckToHand: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'searchDeckToHand' }>;
    return `searchDeckToHand(${serializeCardFilter(desc.filter)})`;
  },

  // ── Destruction / Removal ─────────────────────────────
  destroyAttacker: () => 'destroyAttacker()',
  destroySummonedIf: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'destroySummonedIf' }>;
    return `destroySummonedIf(${desc.minAtk})`;
  },
  destroyAllOpp: () => 'destroyAllOpp()',
  destroyAll: () => 'destroyAll()',
  destroyWeakestOpp: () => 'destroyWeakestOpp()',
  destroyStrongestOpp: () => 'destroyStrongestOpp()',
  destroyByFilter: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'destroyByFilter' }>;
    return `destroyByFilter(${desc.mode}${desc.side ? `,${desc.side}` : ''}${desc.filter ? `,${serializeCardFilter(desc.filter)}` : ''})`;
  },
  destroyAndDamageBoth: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'destroyAndDamageBoth' }>;
    return `destroyAndDamageBoth(${desc.side})`;
  },
  destroyOppSpellTrap: () => 'destroyOppSpellTrap()',
  destroyAllOppSpellTraps: () => 'destroyAllOppSpellTraps()',
  destroyAllSpellTraps: () => 'destroyAllSpellTraps()',
  destroyOppFieldSpell: () => 'destroyOppFieldSpell()',

  // ── Graveyard ─────────────────────────────────────────
  sendTopCardsToGrave: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'sendTopCardsToGrave' }>;
    return `sendTopCardsToGrave(${desc.count})`;
  },
  sendTopCardsToGraveOpp: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'sendTopCardsToGraveOpp' }>;
    return `sendTopCardsToGraveOpp(${desc.count})`;
  },
  salvageFromGrave: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'salvageFromGrave' }>;
    return `salvageFromGrave(${serializeCardFilter(desc.filter)})`;
  },
  recycleFromGraveToDeck: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'recycleFromGraveToDeck' }>;
    return `recycleFromGraveToDeck(${serializeCardFilter(desc.filter)})`;
  },
  shuffleGraveIntoDeck: () => 'shuffleGraveIntoDeck()',
  reviveFromGrave: () => 'reviveFromGrave()',
  reviveFromEitherGrave: () => 'reviveFromEitherGrave()',

  // ── Summon / Hand Management ──────────────────────────
  specialSummonFromHand: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'specialSummonFromHand' }>;
    return `specialSummonFromHand(${desc.filter ? serializeCardFilter(desc.filter) : ''})`;
  },
  specialSummonFromDeck: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'specialSummonFromDeck' }>;
    let s = `specialSummonFromDeck(${serializeCardFilter(desc.filter)}`;
    if (desc.faceDown) s += ',faceDown';
    if (desc.position && desc.position !== 'atk') s += `,${desc.position}`;
    return s + ')';
  },
  createTokens: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'createTokens' }>;
    return `createTokens(${desc.tokenId},${desc.count},${desc.position})`;
  },
  excavateAndSummon: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'excavateAndSummon' }>;
    return `excavateAndSummon(${desc.count},${desc.maxLevel})`;
  },
  discardFromHand: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'discardFromHand' }>;
    return `discardFromHand(${desc.count})`;
  },
  discardOppHand: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'discardOppHand' }>;
    return `discardOppHand(${desc.count})`;
  },
  discardEntireHand: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'discardEntireHand' }>;
    return `discardEntireHand(${desc.target})`;
  },

  // ── Deck Manipulation ─────────────────────────────────
  shuffleDeck: () => 'shuffleDeck()',
  millOpp: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'millOpp' }>;
    return `millOpp(${desc.count})`;
  },
  banishOppGy: () => 'banishOppGy()',

  // ── Position / State Changes ──────────────────────────
  changePositionOpp: () => 'changePositionOpp()',
  setFaceDown: () => 'setFaceDown()',
  flipAllOppFaceDown: () => 'flipAllOppFaceDown()',
  tributeSelf: () => 'tributeSelf()',
  preventAttacks: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'preventAttacks' }>;
    return `preventAttacks(${desc.turns})`;
  },

  // ── Control / Negation ────────────────────────────────
  cancelAttack: () => 'cancelAttack()',
  cancelEffect: () => 'cancelEffect()',
  preventBattleDamage: () => 'preventBattleDamage()',
  skipOppDraw: () => 'skipOppDraw()',
    negateAttack: () => 'negateAttack()',
    negate: () => 'negate()',
  reflectBattleDamage: () => 'reflectBattleDamage()',
  reflectDamage: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'reflectDamage' }>;
    return `reflectDamage(${desc.multiplier})`;
  },
  stealMonster: () => 'stealMonster()',
  stealMonsterTemp: () => 'stealMonsterTemp()',

  // ── Passive Abilities ─────────────────────────────────
  passive_piercing: () => 'passive_piercing()',
  passive_untargetable: () => 'passive_untargetable()',
  passive_directAttack: () => 'passive_directAttack()',
  passive_vsAttrBonus: (a) => {
    const desc = a as Extract<TcgEffectDescriptor, { type: 'passive_vsAttrBonus' }>;
    return `passive_vsAttrBonus(${desc.attr},${desc.atk})`;
  },
  passive_phoenixRevival: () => 'passive_phoenixRevival()',
  passive_indestructible: () => 'passive_indestructible()',
  passive_effectImmune: () => 'passive_effectImmune()',
  passive_cantBeAttacked: () => 'passive_cantBeAttacked()',
  passive_negateTraps: () => 'passive_negateTraps()',
  passive_negateSpells: () => 'passive_negateSpells()',
  passive_negateMonsterEffects: () => 'passive_negateMonsterEffects()',

  // ── Special / Utility ─────────────────────────────────
  gameReset: () => 'gameReset()',
};

function serializeAction(a: TcgEffectDescriptor): string {
  const serializer = ACTION_SERIALIZERS[a.type];
  if (!serializer) {
    const unknown = a as { type: string };
    throw new Error(`Unknown effect action type: ${unknown.type}`);
  }
  return serializer(a);
}

// ── Action deserialization ────────────────────────────────────

/** Parse comma-separated args, respecting {} blocks */
function parseArgs(argsStr: string): string[] {
  if (argsStr.trim() === '') return [];
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < argsStr.length; i++) {
    if (argsStr[i] === '{') depth++;
    else if (argsStr[i] === '}') depth--;
    else if (argsStr[i] === ',' && depth === 0) {
      args.push(argsStr.substring(start, i).trim());
      start = i + 1;
    }
  }
  if (start < argsStr.length) args.push(argsStr.substring(start).trim());
  return args;
}

function deserializeAction(actionStr: string): TcgEffectDescriptor {
  const m = actionStr.match(/^(\w+)\((.*)\)$/);
  if (!m) {
    const bare = actionStr.trim();
    if (bare === 'negate') return { type: 'negate' } as TcgEffectDescriptor;
    throw new Error(`Invalid action syntax: ${actionStr}`);
  }
  const type = m[1];
  const args = parseArgs(m[2]);

  switch (type) {
    case 'dealDamage':
      return { type: 'dealDamage', target: args[0] as 'opponent' | 'self', value: deserializeValueExpr(args[1]) };
    case 'gainLP':
      return { type: 'gainLP', target: args[0] as 'opponent' | 'self', value: deserializeValueExpr(args[1]) };
    case 'draw':
      return { type: 'draw', target: args[0] as 'self' | 'opponent', count: parseInt(args[1], 10) };
    case 'buffField': {
      const desc: TcgEffectDescriptor = { type: 'buffField', value: parseInt(args[0], 10) } as TcgEffectDescriptor & { value: number };
      if (args.length > 1 && isFilterArg(args[1])) (desc as TcgEffectDescriptor & { filter?: TcgCardEffectFilter }).filter = deserializeCardFilter(args[1]);
      return desc;
    }
    case 'tempBuffField': {
      const desc: TcgEffectDescriptor = { type: 'tempBuffField', value: parseInt(args[0], 10) } as TcgEffectDescriptor & { value: number };
      if (args.length > 1 && isFilterArg(args[1])) (desc as TcgEffectDescriptor & { filter?: TcgCardEffectFilter }).filter = deserializeCardFilter(args[1]);
      return desc;
    }
    case 'debuffField':
      return { type: 'debuffField', atkD: parseInt(args[0], 10), defD: parseInt(args[1], 10) };
    case 'tempDebuffField': {
      const desc = { type: 'tempDebuffField' as const, atkD: parseInt(args[0], 10) } as { type: 'tempDebuffField'; atkD: number; defD?: number };
      if (args.length > 1) desc.defD = parseInt(args[1], 10);
      return desc;
    }
    case 'bounceStrongestOpp':      return { type: 'bounceStrongestOpp' };
    case 'bounceAttacker':          return { type: 'bounceAttacker' };
    case 'bounceAllOppMonsters':    return { type: 'bounceAllOppMonsters' };
    case 'searchDeckToHand':
      return { type: 'searchDeckToHand', filter: args.length > 0 && args[0] !== '' && isFilterArg(args[0]) ? deserializeCardFilter(args[0]) : {} };
    case 'tempAtkBonus':
      return { type: 'tempAtkBonus', target: asStatTarget(args[0]), value: parseInt(args[1], 10) };
    case 'permAtkBonus': {
      const desc = { type: 'permAtkBonus' as const, target: asStatTarget(args[0]) as TcgStatTarget, value: parseInt(args[1], 10) } as { type: 'permAtkBonus'; target: TcgStatTarget; value: number; filter?: TcgCardEffectFilter };
      if (args.length > 2 && isFilterArg(args[2])) desc.filter = deserializeCardFilter(args[2]);
      return desc;
    }
    case 'tempDefBonus':
      return { type: 'tempDefBonus', target: asStatTarget(args[0]), value: parseInt(args[1], 10) };
    case 'permDefBonus':
      return { type: 'permDefBonus', target: asStatTarget(args[0]), value: parseInt(args[1], 10) };
    case 'reviveFromGrave':         return { type: 'reviveFromGrave' };
    case 'cancelAttack':            return { type: 'cancelAttack' };
    case 'cancelEffect':            return { type: 'cancelEffect' };
    case 'destroyAttacker':         return { type: 'destroyAttacker' };
    case 'destroySummonedIf':       return { type: 'destroySummonedIf', minAtk: parseInt(args[0], 10) };
    case 'destroyAllOpp':           return { type: 'destroyAllOpp' };
    case 'destroyAll':              return { type: 'destroyAll' };
    case 'destroyWeakestOpp':       return { type: 'destroyWeakestOpp' };
    case 'destroyStrongestOpp':     return { type: 'destroyStrongestOpp' };
    case 'sendTopCardsToGrave':     return { type: 'sendTopCardsToGrave', count: parseInt(args[0], 10) };
    case 'sendTopCardsToGraveOpp':  return { type: 'sendTopCardsToGraveOpp', count: parseInt(args[0], 10) };
    case 'salvageFromGrave':        return { type: 'salvageFromGrave', filter: args.length > 0 && args[0] !== '' && isFilterArg(args[0]) ? deserializeCardFilter(args[0]) : {} };
    case 'recycleFromGraveToDeck':  return { type: 'recycleFromGraveToDeck', filter: args.length > 0 && args[0] !== '' && isFilterArg(args[0]) ? deserializeCardFilter(args[0]) : {} };
    case 'shuffleGraveIntoDeck':    return { type: 'shuffleGraveIntoDeck' };
    case 'shuffleDeck':             return { type: 'shuffleDeck' };
    case 'peekTopCard':             return { type: 'peekTopCard' };
    case 'specialSummonFromHand': {
      const desc = { type: 'specialSummonFromHand' as const } as { type: 'specialSummonFromHand'; filter?: TcgCardEffectFilter };
      if (args.length > 0 && args[0] !== '' && isFilterArg(args[0])) desc.filter = deserializeCardFilter(args[0]);
      return desc;
    }
    case 'discardFromHand':         return { type: 'discardFromHand', count: parseInt(args[0], 10) };
    case 'discardOppHand':          return { type: 'discardOppHand', count: parseInt(args[0], 10) };
    case 'passive_piercing':        return { type: 'passive_piercing' };
    case 'passive_untargetable':    return { type: 'passive_untargetable' };
    case 'passive_directAttack':    return { type: 'passive_directAttack' };
    case 'passive_vsAttrBonus':
      return { type: 'passive_vsAttrBonus', attr: parseInt(args[0], 10), atk: parseInt(args[1], 10) };
    case 'passive_phoenixRevival':  return { type: 'passive_phoenixRevival' };
    case 'passive_indestructible':  return { type: 'passive_indestructible' };
    case 'passive_effectImmune':    return { type: 'passive_effectImmune' };
    case 'passive_cantBeAttacked':  return { type: 'passive_cantBeAttacked' };
    case 'destroyOppSpellTrap':     return { type: 'destroyOppSpellTrap' };
    case 'destroyAllOppSpellTraps': return { type: 'destroyAllOppSpellTraps' };
    case 'destroyAllSpellTraps':    return { type: 'destroyAllSpellTraps' };
    case 'destroyOppFieldSpell':    return { type: 'destroyOppFieldSpell' };
    case 'changePositionOpp':       return { type: 'changePositionOpp' };
    case 'setFaceDown':             return { type: 'setFaceDown' };
    case 'flipAllOppFaceDown':      return { type: 'flipAllOppFaceDown' };
    case 'destroyByFilter': {
      const desc = { type: 'destroyByFilter' as const, mode: args[0] as 'weakest' | 'strongest' | 'highestDef' | 'first' } as { type: 'destroyByFilter'; mode: 'weakest' | 'strongest' | 'highestDef' | 'first'; side?: 'opponent' | 'self'; filter?: TcgCardEffectFilter };
      let argIdx = 1;
      if (args.length > argIdx && !isFilterArg(args[argIdx])) { desc.side = args[argIdx] as 'opponent' | 'self'; argIdx++; }
      if (args.length > argIdx && isFilterArg(args[argIdx])) desc.filter = deserializeCardFilter(args[argIdx]);
      return desc;
    }
    case 'halveAtk':                return { type: 'halveAtk', target: asStatTarget(args[0]) };
    case 'doubleAtk':               return { type: 'doubleAtk', target: asStatTarget(args[0]) };
    case 'swapAtkDef':              return { type: 'swapAtkDef', side: args[0] as 'self' | 'opponent' | 'all' };
    case 'specialSummonFromDeck': {
      const desc = { type: 'specialSummonFromDeck' as const, filter: deserializeCardFilter(args[0]) } as { type: 'specialSummonFromDeck'; filter: TcgCardEffectFilter; faceDown?: boolean; position?: 'atk' | 'def' };
      for (let i = 1; i < args.length; i++) {
        if (args[i] === 'faceDown') desc.faceDown = true;
        else if (args[i] === 'def' || args[i] === 'atk') desc.position = args[i] as 'atk' | 'def';
      }
      return desc;
    }
    case 'reflectBattleDamage':     return { type: 'reflectBattleDamage' };
    case 'stealMonster':            return { type: 'stealMonster' };
    case 'skipOppDraw':             return { type: 'skipOppDraw' };
    case 'discardEntireHand':       return { type: 'discardEntireHand', target: args[0] as 'self' | 'opponent' | 'both' };
    case 'destroyAndDamageBoth':    return { type: 'destroyAndDamageBoth', side: args[0] as 'opponent' | 'self' };
    case 'preventBattleDamage':     return { type: 'preventBattleDamage' };
    case 'passive_negateTraps':     return { type: 'passive_negateTraps' };
    case 'passive_negateSpells':    return { type: 'passive_negateSpells' };
    case 'passive_negateMonsterEffects': return { type: 'passive_negateMonsterEffects' };
    case 'stealMonsterTemp':        return { type: 'stealMonsterTemp' };
    case 'reviveFromEitherGrave':   return { type: 'reviveFromEitherGrave' };
    case 'drawThenDiscard':         return { type: 'drawThenDiscard', drawCount: parseInt(args[0], 10), discardCount: parseInt(args[1], 10) };
    case 'bounceOppHandToDeck':     return { type: 'bounceOppHandToDeck', count: parseInt(args[0], 10) };
    case 'tributeSelf':             return { type: 'tributeSelf' };
    case 'preventAttacks':          return { type: 'preventAttacks', turns: parseInt(args[0], 10) };
    case 'createTokens':            return { type: 'createTokens', tokenId: args[0], count: parseInt(args[1], 10), position: args[2] as 'atk' | 'def' };
    case 'gameReset':               return { type: 'gameReset' };
    case 'excavateAndSummon':       return { type: 'excavateAndSummon', count: parseInt(args[0], 10), maxLevel: parseInt(args[1], 10) };
    case 'millOpp':                 return { type: 'millOpp', count: parseInt(args[0], 10) };
    case 'banishOppGy':             return { type: 'banishOppGy' };
    case 'negateAttack':            return { type: 'negateAttack' };
    case 'reflectDamage':           return { type: 'reflectDamage', multiplier: parseInt(args[0], 10) };
    case 'negate':                  return { type: 'negate' };
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

// ── Cost serialization ───────────────────────────────────────

function serializeCost(cost: TcgEffectCost): string {
  const parts: string[] = [];
  if (cost.lp !== undefined) parts.push(`lp=${cost.lp}`);
  if (cost.discard !== undefined) parts.push(`discard=${cost.discard}`);
  if (cost.tributeSelf) parts.push('tributeSelf');
  if (cost.lpHalf) parts.push('lpHalf');
  return `[cost:${parts.join(',')}]`;
}

function deserializeCost(costStr: string): TcgEffectCost {
  const inner = costStr.slice(6, -1);
  const cost: TcgEffectCost = {};
  for (const pair of inner.split(',')) {
    const [key, val] = pair.split('=');
    switch (key.trim()) {
      case 'lp':          cost.lp = parseInt(val, 10); break;
      case 'discard':     cost.discard = parseInt(val, 10); break;
      case 'tributeSelf': cost.tributeSelf = true; break;
      case 'lpHalf':      cost.lpHalf = true; break;
    }
  }
  return cost;
}

// ── Split helpers ────────────────────────────────────────────

/** Split action string on ';' while respecting parentheses and braces */
function splitActions(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(' || s[i] === '{') depth++;
    else if (s[i] === ')' || s[i] === '}') depth--;
    else if (s[i] === ';' && depth === 0) {
      parts.push(s.substring(start, i));
      start = i + 1;
    }
  }
  if (start < s.length) parts.push(s.substring(start));
  return parts.filter(p => p.length > 0);
}

function isValidTrigger(s: string): boolean {
  return TCG_ALL_TRIGGERS.has(s);
}

/** Split a block on ;trigger: boundaries into separate trigger:actions strings */
function expandEmbeddedTriggers(block: string): string[] {
  const colonIdx = block.indexOf(':');
  if (colonIdx === -1) return [block];
  const parts = splitActions(block.substring(colonIdx + 1));
  if (parts.length <= 1) return [block];

  const triggerPart = block.substring(0, colonIdx);
  const result: string[] = [];
  let currentActions: string[] = [];

  let currentTrigger = triggerPart;
  for (const part of parts) {
    const triggerMatch = part.match(/^(\w+):/);
    if (triggerMatch && isValidTrigger(triggerMatch[1])) {
      if (currentActions.length > 0) {
        result.push(`${currentTrigger}:${currentActions.join(';')}`);
      }
      currentTrigger = triggerMatch[1];
      currentActions = [part.substring(triggerMatch[0].length)];
    } else {
      currentActions.push(part);
    }
  }
  if (currentActions.length > 0) {
    result.push(`${currentTrigger}:${currentActions.join(';')}`);
  }
  return result;
}

// ── Public API ───────────────────────────────────────────────

/** Serialize a single effect block to string form. */
export function serializeTcgEffect(block: TcgCardEffectBlock): string {
  const actions = block.actions.map(serializeAction).join(';');
  const costPart = block.cost ? serializeCost(block.cost) : '';
  return `${block.trigger}${costPart}:${actions}`;
}

/** Deserialize a single effect block from string form. */
export function deserializeTcgEffect(str: string): TcgCardEffectBlock {
  const costPrefixMatch = str.match(/^(\[cost:[^\]]+\])/);
  let costFromPrefix: TcgEffectCost | undefined;
  if (costPrefixMatch) {
    costFromPrefix = deserializeCost(costPrefixMatch[1]);
    str = str.substring(costPrefixMatch[1].length);
  }

  let colonIdx = -1;
  let bracketDepth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '[') bracketDepth++;
    else if (str[i] === ']') bracketDepth--;
    else if (str[i] === ':' && bracketDepth === 0) { colonIdx = i; break; }
  }
  if (colonIdx === -1) throw new Error(`Invalid effect string (no trigger separator): ${str}`);

  let triggerStr = str.substring(0, colonIdx);
  let cost: TcgEffectCost | undefined = costFromPrefix;

  const costMatch = triggerStr.match(/^(.+?)(\[cost:[^\]]+\])$/);
  if (costMatch) {
    triggerStr = costMatch[1];
    cost = deserializeCost(costMatch[2]);
  }

  if (!isValidTrigger(triggerStr)) throw new Error(`Invalid trigger: ${triggerStr}`);

  let actionsStr = str.substring(colonIdx + 1);

  const trailingCostMatch = actionsStr.match(/;?\[cost:([^\]]+)\]$/);
  if (trailingCostMatch) {
    if (!cost) cost = deserializeCost(`[cost:${trailingCostMatch[1]}]`);
    actionsStr = actionsStr.substring(0, actionsStr.length - trailingCostMatch[0].length);
  }

  const actionParts = splitActions(actionsStr);
  const actions = actionParts.map(deserializeAction);

  const block: TcgCardEffectBlock = { trigger: triggerStr as TcgEffectTrigger | TcgTrapTrigger, actions };
  if (cost) block.cost = cost;
  return block;
}

/** Deserialize a pipe-delimited multi-block effect string. */
export function deserializeTcgEffects(str: string): TcgCardEffectBlock[] {
  const rawBlocks = str.split('|').map(s => s.trim());
  const blocks: TcgCardEffectBlock[] = [];
  let lastTrigger = '';

  for (const block of rawBlocks) {
    let hasColon = false;
    let depth = 0;
    for (let i = 0; i < block.length; i++) {
      if (block[i] === '[' || block[i] === '(') depth++;
      else if (block[i] === ']' || block[i] === ')') depth--;
      else if (block[i] === ':' && depth === 0) { hasColon = true; break; }
    }

    const effectStr = hasColon ? block : `${lastTrigger}:${block}`;
    const subBlocks = expandEmbeddedTriggers(effectStr);
    for (const sub of subBlocks) {
      const parsed = deserializeTcgEffect(sub);
      blocks.push(parsed);
      lastTrigger = parsed.trigger;
    }
  }

  return blocks;
}

/** Serialize multiple effect blocks into pipe-delimited format. */
export function serializeTcgEffects(blocks: TcgCardEffectBlock[]): string {
  return blocks.map(serializeTcgEffect).join('|');
}

/** Check if an effect string contains multiple blocks. */
export function isMultiBlockTcgEffect(str: string): boolean {
  if (str.includes('|')) return true;
  const expanded = expandEmbeddedTriggers(str);
  return expanded.length > 1;
}

/**
 * Parse an effect string and populate effect/effects on the target object.
 * Single-block strings set effect only. Multi-block strings set both.
 */
export function parseTcgEffectString(
  str: string,
  target: Partial<Pick<{ effect: TcgCardEffectBlock; effects: TcgCardEffectBlock[] }, 'effect' | 'effects'>>,
): void {
  const blocks = deserializeTcgEffects(str);
  if (blocks.length > 1) {
    target.effects = blocks;
    target.effect = blocks[0];
  } else {
    target.effect = blocks[0];
  }
}

/** Validate effect string syntax without full deserialization. */
export function isValidTcgEffectString(str: string): boolean {
  try {
    deserializeTcgEffects(str);
    return true;
  } catch {
    return false;
  }
}
