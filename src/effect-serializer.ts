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
      case 'r':        filter.race = parseInt(val); break;
      case 'a':        filter.attr = parseInt(val); break;
      case 'ct':       filter.cardType = parseInt(val); break;
      case 'id':       filter.cardId = val.trim(); break;
      case 'maxAtk':   filter.maxAtk = parseInt(val); break;
      case 'minAtk':   filter.minAtk = parseInt(val); break;
      case 'maxDef':   filter.maxDef = parseInt(val); break;
      case 'maxLevel': filter.maxLevel = parseInt(val); break;
      case 'minLevel': filter.minLevel = parseInt(val); break;
      case 'rnd':      filter.random = parseInt(val); break;
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

function serializeAction(a: TcgEffectDescriptor): string {
  switch (a.type) {
    case 'dealDamage':              return `dealDamage(${a.target},${serializeValueExpr(a.value)})`;
    case 'gainLP':                  return `gainLP(${a.target},${serializeValueExpr(a.value)})`;
    case 'draw':                    return `draw(${a.target},${a.count})`;
    case 'buffField':               return `buffField(${a.value}${a.filter && !isCardFilterEmpty(a.filter) ? `,${serializeCardFilter(a.filter)}` : ''})`;
    case 'tempBuffField':           return `tempBuffField(${a.value}${a.filter && !isCardFilterEmpty(a.filter) ? `,${serializeCardFilter(a.filter)}` : ''})`;
    case 'debuffField':             return `debuffField(${a.atkD},${a.defD})`;
    case 'tempDebuffField':         return `tempDebuffField(${a.atkD}${a.defD !== undefined ? `,${a.defD}` : ''})`;
    case 'bounceStrongestOpp':      return 'bounceStrongestOpp()';
    case 'bounceAttacker':          return 'bounceAttacker()';
    case 'bounceAllOppMonsters':    return 'bounceAllOppMonsters()';
    case 'searchDeckToHand':        return `searchDeckToHand(${serializeCardFilter(a.filter)})`;
    case 'tempAtkBonus':            return `tempAtkBonus(${a.target},${a.value})`;
    case 'permAtkBonus':            return `permAtkBonus(${a.target},${a.value}${a.filter && !isCardFilterEmpty(a.filter) ? `,${serializeCardFilter(a.filter)}` : ''})`;
    case 'tempDefBonus':            return `tempDefBonus(${a.target},${a.value})`;
    case 'permDefBonus':            return `permDefBonus(${a.target},${a.value})`;
    case 'reviveFromGrave':         return 'reviveFromGrave()';
    case 'cancelAttack':            return 'cancelAttack()';
    case 'cancelEffect':            return 'cancelEffect()';
    case 'destroyAttacker':         return 'destroyAttacker()';
    case 'destroySummonedIf':       return `destroySummonedIf(${a.minAtk})`;
    case 'destroyAllOpp':           return 'destroyAllOpp()';
    case 'destroyAll':              return 'destroyAll()';
    case 'destroyWeakestOpp':       return 'destroyWeakestOpp()';
    case 'destroyStrongestOpp':     return 'destroyStrongestOpp()';
    case 'sendTopCardsToGrave':     return `sendTopCardsToGrave(${a.count})`;
    case 'sendTopCardsToGraveOpp':  return `sendTopCardsToGraveOpp(${a.count})`;
    case 'salvageFromGrave':        return `salvageFromGrave(${serializeCardFilter(a.filter)})`;
    case 'recycleFromGraveToDeck':  return `recycleFromGraveToDeck(${serializeCardFilter(a.filter)})`;
    case 'shuffleGraveIntoDeck':    return 'shuffleGraveIntoDeck()';
    case 'shuffleDeck':             return 'shuffleDeck()';
    case 'peekTopCard':             return 'peekTopCard()';
    case 'specialSummonFromHand':   return `specialSummonFromHand(${a.filter ? serializeCardFilter(a.filter) : ''})`;
    case 'discardFromHand':         return `discardFromHand(${a.count})`;
    case 'discardOppHand':          return `discardOppHand(${a.count})`;
    case 'passive_piercing':        return 'passive_piercing()';
    case 'passive_untargetable':    return 'passive_untargetable()';
    case 'passive_directAttack':    return 'passive_directAttack()';
    case 'passive_vsAttrBonus':     return `passive_vsAttrBonus(${a.attr},${a.atk})`;
    case 'passive_phoenixRevival':  return 'passive_phoenixRevival()';
    case 'passive_indestructible':  return 'passive_indestructible()';
    case 'passive_effectImmune':    return 'passive_effectImmune()';
    case 'passive_cantBeAttacked':  return 'passive_cantBeAttacked()';
    case 'destroyOppSpellTrap':     return 'destroyOppSpellTrap()';
    case 'destroyAllOppSpellTraps': return 'destroyAllOppSpellTraps()';
    case 'destroyAllSpellTraps':    return 'destroyAllSpellTraps()';
    case 'destroyOppFieldSpell':    return 'destroyOppFieldSpell()';
    case 'changePositionOpp':       return 'changePositionOpp()';
    case 'setFaceDown':             return 'setFaceDown()';
    case 'flipAllOppFaceDown':      return 'flipAllOppFaceDown()';
    case 'destroyByFilter':         return `destroyByFilter(${a.mode}${a.side ? `,${a.side}` : ''}${a.filter ? `,${serializeCardFilter(a.filter)}` : ''})`;
    case 'halveAtk':                return `halveAtk(${a.target})`;
    case 'doubleAtk':               return `doubleAtk(${a.target})`;
    case 'swapAtkDef':              return `swapAtkDef(${a.side})`;
    case 'specialSummonFromDeck': {
      let s = `specialSummonFromDeck(${serializeCardFilter(a.filter)}`;
      if (a.faceDown) s += ',faceDown';
      if (a.position && a.position !== 'atk') s += `,${a.position}`;
      return s + ')';
    }
    case 'reflectBattleDamage':     return 'reflectBattleDamage()';
    case 'stealMonster':            return 'stealMonster()';
    case 'skipOppDraw':             return 'skipOppDraw()';
    case 'discardEntireHand':       return `discardEntireHand(${a.target})`;
    case 'destroyAndDamageBoth':    return `destroyAndDamageBoth(${a.side})`;
    case 'preventBattleDamage':     return 'preventBattleDamage()';
    case 'passive_negateTraps':     return 'passive_negateTraps()';
    case 'passive_negateSpells':    return 'passive_negateSpells()';
    case 'passive_negateMonsterEffects': return 'passive_negateMonsterEffects()';
    case 'stealMonsterTemp':        return 'stealMonsterTemp()';
    case 'reviveFromEitherGrave':   return 'reviveFromEitherGrave()';
    case 'drawThenDiscard':         return `drawThenDiscard(${a.drawCount},${a.discardCount})`;
    case 'bounceOppHandToDeck':     return `bounceOppHandToDeck(${a.count})`;
    case 'tributeSelf':             return 'tributeSelf()';
    case 'preventAttacks':          return `preventAttacks(${a.turns})`;
    case 'createTokens':            return `createTokens(${a.tokenId},${a.count},${a.position})`;
    case 'gameReset':               return 'gameReset()';
    case 'excavateAndSummon':       return `excavateAndSummon(${a.count},${a.maxLevel})`;
    case 'millOpp':                 return `millOpp(${a.count})`;
    case 'banishOppGy':             return 'banishOppGy()';
    case 'negateAttack':            return 'negateAttack()';
    case 'reflectDamage':           return `reflectDamage(${a.multiplier})`;
    case 'negate':                  return 'negate';
    default: {
      const unknown = a as { type: string };
      throw new Error(`Unknown effect action type: ${unknown.type}`);
    }
  }
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
      return { type: 'draw', target: args[0] as 'self' | 'opponent', count: parseInt(args[1]) };
    case 'buffField': {
      const desc: TcgEffectDescriptor = { type: 'buffField', value: parseInt(args[0]) } as TcgEffectDescriptor & { value: number };
      if (args.length > 1 && isFilterArg(args[1])) (desc as TcgEffectDescriptor & { filter?: TcgCardEffectFilter }).filter = deserializeCardFilter(args[1]);
      return desc;
    }
    case 'tempBuffField': {
      const desc: TcgEffectDescriptor = { type: 'tempBuffField', value: parseInt(args[0]) } as TcgEffectDescriptor & { value: number };
      if (args.length > 1 && isFilterArg(args[1])) (desc as TcgEffectDescriptor & { filter?: TcgCardEffectFilter }).filter = deserializeCardFilter(args[1]);
      return desc;
    }
    case 'debuffField':
      return { type: 'debuffField', atkD: parseInt(args[0]), defD: parseInt(args[1]) };
    case 'tempDebuffField': {
      const desc = { type: 'tempDebuffField' as const, atkD: parseInt(args[0]) } as { type: 'tempDebuffField'; atkD: number; defD?: number };
      if (args.length > 1) desc.defD = parseInt(args[1]);
      return desc;
    }
    case 'bounceStrongestOpp':      return { type: 'bounceStrongestOpp' };
    case 'bounceAttacker':          return { type: 'bounceAttacker' };
    case 'bounceAllOppMonsters':    return { type: 'bounceAllOppMonsters' };
    case 'searchDeckToHand':
      return { type: 'searchDeckToHand', filter: args.length > 0 && args[0] !== '' && isFilterArg(args[0]) ? deserializeCardFilter(args[0]) : {} };
    case 'tempAtkBonus':
      return { type: 'tempAtkBonus', target: asStatTarget(args[0]), value: parseInt(args[1]) };
    case 'permAtkBonus': {
      const desc = { type: 'permAtkBonus' as const, target: asStatTarget(args[0]) as TcgStatTarget, value: parseInt(args[1]) } as { type: 'permAtkBonus'; target: TcgStatTarget; value: number; filter?: TcgCardEffectFilter };
      if (args.length > 2 && isFilterArg(args[2])) desc.filter = deserializeCardFilter(args[2]);
      return desc;
    }
    case 'tempDefBonus':
      return { type: 'tempDefBonus', target: asStatTarget(args[0]), value: parseInt(args[1]) };
    case 'permDefBonus':
      return { type: 'permDefBonus', target: asStatTarget(args[0]), value: parseInt(args[1]) };
    case 'reviveFromGrave':         return { type: 'reviveFromGrave' };
    case 'cancelAttack':            return { type: 'cancelAttack' };
    case 'cancelEffect':            return { type: 'cancelEffect' };
    case 'destroyAttacker':         return { type: 'destroyAttacker' };
    case 'destroySummonedIf':       return { type: 'destroySummonedIf', minAtk: parseInt(args[0]) };
    case 'destroyAllOpp':           return { type: 'destroyAllOpp' };
    case 'destroyAll':              return { type: 'destroyAll' };
    case 'destroyWeakestOpp':       return { type: 'destroyWeakestOpp' };
    case 'destroyStrongestOpp':     return { type: 'destroyStrongestOpp' };
    case 'sendTopCardsToGrave':     return { type: 'sendTopCardsToGrave', count: parseInt(args[0]) };
    case 'sendTopCardsToGraveOpp':  return { type: 'sendTopCardsToGraveOpp', count: parseInt(args[0]) };
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
    case 'discardFromHand':         return { type: 'discardFromHand', count: parseInt(args[0]) };
    case 'discardOppHand':          return { type: 'discardOppHand', count: parseInt(args[0]) };
    case 'passive_piercing':        return { type: 'passive_piercing' };
    case 'passive_untargetable':    return { type: 'passive_untargetable' };
    case 'passive_directAttack':    return { type: 'passive_directAttack' };
    case 'passive_vsAttrBonus':
      return { type: 'passive_vsAttrBonus', attr: parseInt(args[0]), atk: parseInt(args[1]) };
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
    case 'drawThenDiscard':         return { type: 'drawThenDiscard', drawCount: parseInt(args[0]), discardCount: parseInt(args[1]) };
    case 'bounceOppHandToDeck':     return { type: 'bounceOppHandToDeck', count: parseInt(args[0]) };
    case 'tributeSelf':             return { type: 'tributeSelf' };
    case 'preventAttacks':          return { type: 'preventAttacks', turns: parseInt(args[0]) };
    case 'createTokens':            return { type: 'createTokens', tokenId: args[0], count: parseInt(args[1]), position: args[2] as 'atk' | 'def' };
    case 'gameReset':               return { type: 'gameReset' };
    case 'excavateAndSummon':       return { type: 'excavateAndSummon', count: parseInt(args[0]), maxLevel: parseInt(args[1]) };
    case 'millOpp':                 return { type: 'millOpp', count: parseInt(args[0]) };
    case 'banishOppGy':             return { type: 'banishOppGy' };
    case 'negateAttack':            return { type: 'negateAttack' };
    case 'reflectDamage':           return { type: 'reflectDamage', multiplier: parseInt(args[0]) };
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
      case 'lp':          cost.lp = parseInt(val); break;
      case 'discard':     cost.discard = parseInt(val); break;
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
