import { describe, it, expect } from 'vitest';
import {
  serializeTcgEffect,
  deserializeTcgEffect,
  serializeTcgEffects,
  deserializeTcgEffects,
  parseTcgEffectString,
  isValidTcgEffectString,
  isMultiBlockTcgEffect,
} from '../src/effect-serializer.js';
import type { TcgCardEffectBlock } from '../src/types.js';

describe('effect-serializer', () => {
  describe('serializeTcgEffect / deserializeTcgEffect', () => {
    it('round-trips a simple draw effect', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'draw', target: 'self', count: 2 }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:draw(self,2)');
      const parsed = deserializeTcgEffect(str);
      expect(parsed.trigger).toBe('onSummon');
      expect(parsed.actions).toEqual([{ type: 'draw', target: 'self', count: 2 }]);
    });

    it('round-trips a dealDamage effect with numeric ValueExpr', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'dealDamage', target: 'opponent', value: 500 }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:dealDamage(opponent,500)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips a dealDamage effect with dynamic ValueExpr', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'dealDamage', target: 'opponent', value: { from: 'attacker.effectiveATK', multiply: 1.5, round: 'floor' } }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:dealDamage(opponent,attacker.effectiveATK*1.5f)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips a gainLP with ceil ValueExpr', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'passive',
        actions: [{ type: 'gainLP', target: 'self', value: { from: 'summoned.atk', multiply: 2, round: 'ceil' } }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('passive:gainLP(self,summoned.atk*2c)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips buffField with filter', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'buffField', value: 500, filter: { race: 1, attr: 2 } }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:buffField(500,{r=1,a=2})');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips buffField without filter', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'buffField', value: 300 }],
      };
      expect(serializeTcgEffect(block)).toBe('onSummon:buffField(300)');
    });

    it('round-trips searchDeckToHand with filter', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'searchDeckToHand', filter: { cardType: 1, maxLevel: 4 } }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:searchDeckToHand({ct=1,maxLevel=4})');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips destroyByFilter with side and filter', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'destroyByFilter', mode: 'weakest', side: 'opponent', filter: { race: 3 } }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:destroyByFilter(weakest,opponent,{r=3})');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips specialSummonFromDeck with faceDown and position', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'specialSummonFromDeck', filter: { race: 1 }, faceDown: true, position: 'def' }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:specialSummonFromDeck({r=1},faceDown,def)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips passive_vsAttrBonus', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'passive',
        actions: [{ type: 'passive_vsAttrBonus', attr: 3, atk: 500 }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('passive:passive_vsAttrBonus(3,500)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips createTokens', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'createTokens', tokenId: 'token_dragon', count: 2, position: 'atk' }],
      };
      expect(serializeTcgEffect(block)).toBe('onSummon:createTokens(token_dragon,2,atk)');
    });

    it('round-trips negate (bare keyword)', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onAttack',
        actions: [{ type: 'negate' }],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onAttack:negate');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips multi-action blocks', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [
          { type: 'draw', target: 'self', count: 1 },
          { type: 'buffField', value: 500 },
        ],
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon:draw(self,1);buffField(500)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips cost (lp)', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'draw', target: 'self', count: 1 }],
        cost: { lp: 1000 },
      };
      const str = serializeTcgEffect(block);
      expect(str).toBe('onSummon[cost:lp=1000]:draw(self,1)');
      expect(deserializeTcgEffect(str)).toEqual(block);
    });

    it('round-trips cost (discard + tributeSelf)', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'draw', target: 'self', count: 2 }],
        cost: { discard: 1, tributeSelf: true },
      };
      const str = serializeTcgEffect(block);
      const parsed = deserializeTcgEffect(str);
      expect(parsed.cost).toEqual({ discard: 1, tributeSelf: true });
    });

    it('round-trips cost (lpHalf)', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{ type: 'gainLP', target: 'self', value: 2000 }],
        cost: { lpHalf: true },
      };
      const str = serializeTcgEffect(block);
      const parsed = deserializeTcgEffect(str);
      expect(parsed.cost).toEqual({ lpHalf: true });
    });
  });

  describe('multi-block effects', () => {
    it('round-trips pipe-delimited multi-block', () => {
      const blocks: TcgCardEffectBlock[] = [
        { trigger: 'passive', actions: [{ type: 'passive_piercing' }] },
        { trigger: 'onDealBattleDamage', actions: [{ type: 'draw', target: 'self', count: 1 }] },
      ];
      const str = serializeTcgEffects(blocks);
      expect(str).toBe('passive:passive_piercing()|onDealBattleDamage:draw(self,1)');
      expect(deserializeTcgEffects(str)).toEqual(blocks);
    });

    it('infers trigger from previous block when omitted', () => {
      const str = 'onSummon:draw(self,1)|buffField(500)';
      const blocks = deserializeTcgEffects(str);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].trigger).toBe('onSummon');
      expect(blocks[1].trigger).toBe('onSummon');
    });
  });

  describe('parseTcgEffectString', () => {
    it('sets effect only for single-block', () => {
      const target: { effect?: TcgCardEffectBlock; effects?: TcgCardEffectBlock[] } = {};
      parseTcgEffectString('onSummon:draw(self,2)', target);
      expect(target.effect).toBeDefined();
      expect(target.effect!.trigger).toBe('onSummon');
      expect(target.effects).toBeUndefined();
    });

    it('sets both effect and effects for multi-block', () => {
      const target: { effect?: TcgCardEffectBlock; effects?: TcgCardEffectBlock[] } = {};
      parseTcgEffectString('passive:passive_piercing()|onDealBattleDamage:draw(self,1)', target);
      expect(target.effect).toBeDefined();
      expect(target.effects).toHaveLength(2);
      expect(target.effect).toEqual(target.effects![0]);
    });
  });

  describe('isValidTcgEffectString', () => {
    it('returns true for valid effect', () => {
      expect(isValidTcgEffectString('onSummon:draw(self,2)')).toBe(true);
    });

    it('returns true for valid multi-block', () => {
      expect(isValidTcgEffectString('passive:passive_piercing()|onDealBattleDamage:draw(self,1)')).toBe(true);
    });

    it('returns false for invalid trigger', () => {
      expect(isValidTcgEffectString('badTrigger:draw(self,2)')).toBe(false);
    });

    it('returns false for invalid action', () => {
      expect(isValidTcgEffectString('onSummon:unknownAction(1,2)')).toBe(false);
    });

    it('returns false for malformed string', () => {
      expect(isValidTcgEffectString('')).toBe(false);
    });
  });

  describe('isMultiBlockTcgEffect', () => {
    it('returns true for pipe-delimited', () => {
      expect(isMultiBlockTcgEffect('onSummon:draw(self,1)|onSummon:draw(self,1)')).toBe(true);
    });

    it('returns false for single block', () => {
      expect(isMultiBlockTcgEffect('onSummon:draw(self,1)')).toBe(false);
    });
  });

  describe('CardFilter serialization', () => {
    it('round-trips all filter fields', () => {
      const block: TcgCardEffectBlock = {
        trigger: 'onSummon',
        actions: [{
          type: 'searchDeckToHand',
          filter: {
            race: 1, attr: 2, cardType: 3, cardId: 'card_42',
            maxAtk: 2000, minAtk: 500, maxDef: 1500,
            maxLevel: 6, minLevel: 2, random: 75,
          },
        }],
      };
      const str = serializeTcgEffect(block);
      const parsed = deserializeTcgEffect(str);
      expect(parsed.actions[0]).toEqual(block.actions[0]);
    });
  });

  describe('no-arg actions', () => {
    const noArgActions: Array<{ type: string; serialized: string }> = [
      { type: 'bounceStrongestOpp', serialized: 'bounceStrongestOpp()' },
      { type: 'cancelAttack', serialized: 'cancelAttack()' },
      { type: 'destroyAllOpp', serialized: 'destroyAllOpp()' },
      { type: 'passive_piercing', serialized: 'passive_piercing()' },
      { type: 'reflectBattleDamage', serialized: 'reflectBattleDamage()' },
      { type: 'stealMonster', serialized: 'stealMonster()' },
      { type: 'tributeSelf', serialized: 'tributeSelf()' },
      { type: 'gameReset', serialized: 'gameReset()' },
      { type: 'banishOppGy', serialized: 'banishOppGy()' },
      { type: 'negateAttack', serialized: 'negateAttack()' },
    ];

    for (const { type, serialized } of noArgActions) {
      it(`round-trips ${type}`, () => {
        const block: TcgCardEffectBlock = {
          trigger: 'onSummon',
          actions: [{ type } as any],
        };
        const str = serializeTcgEffect(block);
        expect(str).toBe(`onSummon:${serialized}`);
        const parsed = deserializeTcgEffect(str);
        expect(parsed.actions[0].type).toBe(type);
      });
    }
  });
});
