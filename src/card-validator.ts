import type { ValidationResult } from './types.js';
import { TCG_TYPES, TCG_TYPE_SPELL, TCG_TYPE_TRAP, TCG_TYPE_MONSTER, TCG_TYPE_FUSION, TCG_TYPE_EQUIPMENT, TCG_TRAP_TRIGGERS, TCG_TRAP_TRIGGER_NAME_TO_ID } from './types.js';
import { isValidTcgEffectString } from './effect-serializer.js';
const VALID_TYPES       = new Set(TCG_TYPES);
const VALID_TRAP_TRIGGERS = new Set(TCG_TRAP_TRIGGERS);

function validateSingleCard(card: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `cards[${index}]`;

  if (typeof card !== 'object' || card === null) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const c = card as Record<string, unknown>;

  // id: required int > 0
  if (typeof c.id !== 'number' || !Number.isInteger(c.id) || c.id <= 0) {
    errors.push(`${prefix}.id: must be a positive integer, got ${c.id}`);
  }

  // level: required positive int (extensible) monsters/fusions, optional (ignored) for spells/traps
  const needsLevel = c.type === TCG_TYPE_MONSTER || c.type === TCG_TYPE_FUSION;
  if (needsLevel) {
    if (typeof c.level !== 'number' || !Number.isInteger(c.level)) {
      errors.push(`${prefix}.level: must be a positive integer, got ${c.level}`);
    }
  }

  // race: required positive int (extensible) msonsters/fusions, optional (ignored) for spells/traps
  const needsRace = c.type === TCG_TYPE_MONSTER || c.type === TCG_TYPE_FUSION;
  if (needsRace) {
    if (c.race !== undefined && c.race !== null) {
      if (typeof c.race !== 'number' || !Number.isInteger(c.race) || c.race < 1) {
        errors.push(`${prefix}.race: must be a positive integer, got ${c.race}`);
      }
    }
  }

  // type: required int in {1,2,3,4,5}
  if (typeof c.type !== 'number' || !VALID_TYPES.has(c.type as typeof TCG_TYPES[number])) {
    errors.push(`${prefix}.type: must be one of [${[...VALID_TYPES].join(',')}], got ${c.type}`);
  }

  const isSpellOrTrap = c.type === TCG_TYPE_SPELL || c.type === TCG_TYPE_TRAP;
  const isMonsterOrFusion = c.type === TCG_TYPE_MONSTER || c.type === TCG_TYPE_FUSION;

  // atk: optional, required for monsters/fusions, absent for spells/traps
  if (isMonsterOrFusion) {
    if (c.atk !== undefined && (typeof c.atk !== 'number' || !Number.isInteger(c.atk) || c.atk < 0)) {
      errors.push(`${prefix}.atk: must be a non-negative integer for monsters, got ${c.atk}`);
    }
  }
  if (isSpellOrTrap && c.atk !== undefined && c.atk !== null) {
    errors.push(`${prefix}.atk: should be absent for spells/traps`);
  }

  // def: same rules as atk
  if (isMonsterOrFusion) {
    if (c.def !== undefined && (typeof c.def !== 'number' || !Number.isInteger(c.def) || c.def < 0)) {
      errors.push(`${prefix}.def: must be a non-negative integer for monsters, got ${c.def}`);
    }
  }
  if (isSpellOrTrap && c.def !== undefined && c.def !== null) {
    errors.push(`${prefix}.def: should be absent for spells/traps`);
  }

  // rarity: positive int (extensible)
  if (c.rarity !== undefined && c.rarity !== null) {
    if (typeof c.rarity !== 'number' || !Number.isInteger(c.rarity) || c.rarity < 1) {
      errors.push(`${prefix}.rarity:  must be a positive integer, got ${c.rarity}`);
    }
  }

  // attribute: positive int (extensible)
  if (c.attribute !== undefined && c.attribute !== null) {
    if (typeof c.attribute !== 'number' || !Number.isInteger(c.attribute) || c.attribute < 1) {
      errors.push(`${prefix}.attribute:  must be a positive integer, got ${c.attribute}`);
    }
  }

  // effect: optional string (parsed and validated for syntax)
  if (c.effect !== undefined && c.effect !== null) {
    if (typeof c.effect !== 'string') {
      errors.push(`${prefix}.effect: must be a string, got ${typeof c.effect}`);
    } else if (!isValidTcgEffectString(c.effect)) {
      errors.push(`${prefix}.effect: invalid effect syntax`);
    }
  }

  // trapTrigger: optional int 1-9 or string name (coerced to int)
  if (c.trapTrigger !== undefined && c.trapTrigger !== null) {
    let triggerValue = c.trapTrigger;
    if (typeof triggerValue === 'string') {
      const resolved = TCG_TRAP_TRIGGER_NAME_TO_ID[triggerValue];
      if (resolved !== undefined) {
        c.trapTrigger = resolved;
        triggerValue = resolved;
      }
    }
    if (typeof triggerValue !== 'number' || !Number.isInteger(triggerValue) || !VALID_TRAP_TRIGGERS.has(triggerValue as typeof TCG_TRAP_TRIGGERS[number])) {
      errors.push(`${prefix}.trapTrigger: must be one of [${[...VALID_TRAP_TRIGGERS].join(',')}] or a valid trigger name, got ${c.trapTrigger}`);
    }
  }

  // name: optional plaintext name
  if (c.name !== undefined && c.name !== null) {
    if (typeof c.name !== 'string') {
      errors.push(`${prefix}.name: must be a string, got ${typeof c.name}`);
    }
  }

  // description: optional plaintext description
  if (c.description !== undefined && c.description !== null) {
    if (typeof c.description !== 'string') {
      errors.push(`${prefix}.description: must be a string, got ${typeof c.description}`);
    }
  }

  return errors;
}

/**
 * Validate an array of TcgCard objects from cards.json
 */
export function validateTcgCards(
  data: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['cards.json must contain a JSON array'], warnings };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['cards.json must contain at least one card'], warnings };
  }

  // Validate each card
  const seenIds = new Set<number>();
  for (let i = 0; i < data.length; i++) {
    const cardErrors = validateSingleCard(data[i], i);
    errors.push(...cardErrors);

    // Check for duplicate IDs
    const card = data[i] as Record<string, unknown>;
    if (typeof card?.id === 'number' && Number.isInteger(card.id)) {
      if (seenIds.has(card.id)) {
        errors.push(`cards[${i}].id: duplicate id ${card.id}`);
      }
      seenIds.add(card.id);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
