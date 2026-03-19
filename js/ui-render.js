// ============================================================
// AETHERIAL CLASH - DOM Rendering
// ============================================================
import { TYPE, ATTR_SYMBOL, RARITY_COLOR, RARITY_NAME } from './cards.js';
import { SEL, IS_TOUCH } from './ui-state.js';
import { _attachHover, attachLongPress, setCardInnerHTMLFn } from './ui-animations.js';

// Forward declaration — event handlers are registered after this module loads.
// We use setter functions to avoid circular imports.
let _onOwnFieldCardClick = null;
let _onAttackerSelect    = null;
let _onDefenderSelect    = null;
let _onFieldSpellTrapClick = null;
let _showCardDetail      = null;

export function setEventHandlers(handlers) {
  _onOwnFieldCardClick   = handlers.onOwnFieldCardClick;
  _onAttackerSelect      = handlers.onAttackerSelect;
  _onDefenderSelect      = handlers.onDefenderSelect;
  _onFieldSpellTrapClick = handlers.onFieldSpellTrapClick;
  _showCardDetail        = handlers.showCardDetail;
}

// ── Tracking for draw animation ───────────────────────────
let _pendingDrawCount = 0;

export function incrementPendingDrawCount(n) { _pendingDrawCount += n; }

// ── Card HTML builder ─────────────────────────────────────
export function cardInnerHTML(card, dimmed=false, rotated=false, fc=null){
  const levelStars = card.level ? '★'.repeat(Math.min(card.level, 12)) : '';
  const attrSym = ATTR_SYMBOL[card.attribute] || '✦';
  const typeLabel = { normal:'Normal', effect:'Effekt', fusion:'Fusion', spell:'Zauber', trap:'Falle' }[card.type] || '';
  const effATK = fc ? fc.effectiveATK() : (card.atk || 0);
  const effDEF = fc ? fc.effectiveDEF() : (card.def || 0);
  const statChanged = fc && (fc.permATKBonus || fc.tempATKBonus) ? ' stat-boosted' : '';

  let statsHTML = '';
  if(card.atk !== undefined){
    statsHTML = `<div class="card-stats${statChanged}">` +
      `<div class="stat-row"><span class="stat-label atk-label">ATK</span><span class="stat-val">${effATK}</span></div>` +
      `<div class="stat-row"><span class="stat-label def-label">DEF</span><span class="stat-val">${effDEF}</span></div>` +
      `</div>`;
  } else {
    statsHTML = `<div class="card-stats no-stats"><span class="type-badge-big">${typeLabel}</span></div>`;
  }
  const raceAbbr = { feuer:'Feue', drache:'Drag', flug:'Flug', stein:'Stei', pflanze:'Pflz',
    krieger:'Krie', magier:'Magi', elfe:'Elfe', daemon:'Dämo', wasser:'Wass' };
  const raceColors = { feuer:'#e05030', drache:'#8040c0', flug:'#4090c0', stein:'#808060',
    pflanze:'#40a050', krieger:'#c09030', magier:'#6060c0', elfe:'#90c060', daemon:'#804090', wasser:'#3080b0' };
  const raceBadge = card.race
    ? `<span class="card-race-badge" style="background:${raceColors[card.race]||'#444'}">${raceAbbr[card.race]||card.race.slice(0,4)}</span>`
    : '';
  const rarityPip = card.rarity
    ? `<span class="card-rarity-pip" style="background:${RARITY_COLOR[card.rarity]||'#aaa'}" title="${RARITY_NAME[card.rarity]||''}"></span>`
    : '';

  return `
    <div class="card-header">
      <span class="card-name-short">${card.name}</span>
      ${raceBadge}
      <span class="card-attr">${rarityPip}${attrSym}</span>
    </div>
    <div class="card-art">
      <div class="art-attr-symbol">${attrSym}</div>
      <div class="type-badge">${typeLabel}</div>
    </div>
    <div class="card-level">${levelStars}</div>
    ${statsHTML}
  `;
}

// Register cardInnerHTML with animations module to break circular dependency
setCardInnerHTMLFn(cardInnerHTML);

// ── Full re-render ────────────────────────────────────────
export function renderAll(state){
  if(!state) return;
  document.getElementById('player-lp').textContent   = state.player.lp;
  document.getElementById('opp-lp').textContent      = state.opponent.lp;
  document.getElementById('player-deck-count').textContent  = state.player.deck.length;
  document.getElementById('opp-deck-count').textContent     = state.opponent.deck.length;
  document.getElementById('opp-hand-count').textContent     = state.opponent.hand.length;
  document.getElementById('player-grave-count').textContent = state.player.graveyard.length;
  document.getElementById('opp-grave-count').textContent    = state.opponent.graveyard.length;
  document.getElementById('turn-num').textContent           = state.turn;

  const phaseNames = { draw:'Ziehphase', main:'Hauptphase', battle:'Kampfphase', end:'Endphase' };
  document.getElementById('phase-name').textContent = phaseNames[state.phase] || state.phase;

  const playerPct  = Math.min(100, Math.max(0, state.player.lp / 80));
  const oppPct     = Math.min(100, Math.max(0, state.opponent.lp / 80));
  document.getElementById('player-lp-bar').style.width = playerPct + '%';
  document.getElementById('opp-lp-bar').style.width    = oppPct + '%';
  if(playerPct < 30) document.getElementById('player-lp-bar').style.background = '#cc2222';
  else document.getElementById('player-lp-bar').style.background = '';
  if(oppPct < 30) document.getElementById('opp-lp-bar').style.background = '#cc2222';
  else document.getElementById('opp-lp-bar').style.background = '';

  document.getElementById('btn-main-to-battle').disabled = state.activePlayer !== 'player' || state.phase !== 'main';
  document.getElementById('btn-battle-to-end').disabled  = state.activePlayer !== 'player' || state.phase !== 'battle';
  document.getElementById('btn-end-turn').disabled       = state.activePlayer !== 'player' || state.phase === 'draw';

  renderMonsterZone('player',   state.player.field.monsters,   state);
  renderMonsterZone('opponent', state.opponent.field.monsters,  state);
  renderSpellTrapZone('player',   state.player.field.spellTraps,   state);
  renderSpellTrapZone('opponent', state.opponent.field.spellTraps,  state);

  renderHand(state.player.hand, state);
}

export function renderMonsterZone(owner, monsters, state){
  const container = document.getElementById(`${owner}-monster-zone`);
  const slots = container.querySelectorAll('.zone-slot');
  slots.forEach((slot, i) => {
    slot.innerHTML = '';
    slot.className = 'zone-slot';
    const fc = monsters[i];
    if(fc){
      const el = buildFieldCard(fc, owner, i, state);
      slot.appendChild(el);
    } else {
      slot.classList.add('empty');
    }
  });
}

export function renderSpellTrapZone(owner, spellTraps, state){
  const zoneId = owner === 'opponent' ? 'opp-spelltrap-zone' : 'player-spelltrap-zone';
  const container = document.getElementById(zoneId);
  const slots = container.querySelectorAll('.zone-slot');
  slots.forEach((slot, i) => {
    slot.innerHTML = '';
    slot.className = 'zone-slot';
    const fst = spellTraps[i];
    if(fst){
      const el = buildFieldSpellTrap(fst, owner, i, state);
      slot.appendChild(el);
    } else {
      slot.classList.add('empty');
    }
  });
}

export function renderHand(hand, state){
  const container = document.getElementById('player-hand');
  container.innerHTML = '';
  const newStart = _pendingDrawCount > 0 ? hand.length - _pendingDrawCount : -1;
  _pendingDrawCount = 0;
  hand.forEach((card, i) => {
    const el = buildHandCard(card, i, state);
    if(i >= newStart && newStart >= 0){
      el.classList.add('newly-drawn');
      el.style.animationDelay = `${(i - newStart) * 80}ms`;
    }
    container.appendChild(el);
  });
  if (IS_TOUCH) {
    const ha = document.getElementById('hand-area');
    ha.scrollLeft = ha.scrollWidth;
  }
}

// ── Card Builders ──────────────────────────────────────────
import { getGame } from './ui-state.js';

// onHandCardClick lives in ui-events.js which imports renderAll from here,
// so we break the cycle with a setter rather than a direct import.
let _onHandCardClick = null;
export function setOnHandCardClick(fn) { _onHandCardClick = fn; }

function buildHandCard(card, index, state){
  const el = document.createElement('div');
  el.className = `card hand-card ${card.type}-card attr-${card.attribute||'spell'}`;
  el.dataset.handIndex = index;
  el.innerHTML = cardInnerHTML(card, false);

  const isPlayerTurn = state.activePlayer === 'player';
  const isMain       = state.phase === 'main';
  const isBattle     = state.phase === 'battle';

  if(isPlayerTurn && (isMain || (isBattle && card.type === TYPE.TRAP))){
    el.classList.add('playable');
    el.addEventListener('click', () => _onHandCardClick && _onHandCardClick(card, index, state));
  }
  const gameInst = getGame();
  if(isPlayerTurn && isMain && !state.player.normalSummonUsed && gameInst){
    const opts = gameInst.getAllFusionOptions('player');
    if(opts.some(o => o.i1 === index || o.i2 === index)) el.classList.add('fusionable');
  }
  _attachHover(el, card, null);
  return el;
}

export function buildFieldCard(fc, owner, zone, state){
  const el = document.createElement('div');
  const isPlayerOwned = owner === 'player';

  if(fc.faceDown && !isPlayerOwned){
    el.className = 'card field-card face-down';
    el.innerHTML = `<div class="card-back-pattern"><span class="back-label">A</span></div>`;
  } else if(fc.faceDown && isPlayerOwned){
    el.className = `card field-card face-down own-facedown attr-${fc.card.attribute}`;
    el.innerHTML = cardInnerHTML(fc.card, true, fc.position==='def') + `<div class="facedown-overlay">Verdeckt</div>`;
  } else {
    el.className = `card field-card ${fc.card.type}-card attr-${fc.card.attribute} pos-${fc.position}`;
    el.innerHTML = cardInnerHTML(fc.card, false, fc.position==='def', fc);
  }

  if(fc.hasAttacked && owner==='player') el.classList.add('exhausted');
  if(SEL.attackerZone === zone && owner==='player') el.classList.add('selected');

  if(isPlayerOwned){
    if(state.activePlayer === 'player'){
      if(state.phase === 'main' && !fc.faceDown){
        el.classList.add('interactive');
        el.addEventListener('click', () => _onOwnFieldCardClick && _onOwnFieldCardClick(fc, zone, state));
      } else if(state.phase === 'battle' && !fc.hasAttacked && fc.position==='atk' && !fc.faceDown && !fc.summonedThisTurn){
        el.classList.add('can-attack');
        el.addEventListener('click', () => _onAttackerSelect && _onAttackerSelect(zone, state));
      }
    }
  } else {
    if(SEL.mode === 'attack'){
      el.classList.add('targetable');
      el.addEventListener('click', () => _onDefenderSelect && _onDefenderSelect(zone));
    }
  }

  if (!IS_TOUCH) el.addEventListener('contextmenu', e => { e.preventDefault(); _showCardDetail && _showCardDetail(fc.card, fc); });
  if (IS_TOUCH && (!fc.faceDown || owner === 'player')) attachLongPress(el, () => _showCardDetail && _showCardDetail(fc.card, fc));
  if(!fc.faceDown || owner === 'player'){
    _attachHover(el, fc.card, fc);
  }
  return el;
}

function buildFieldSpellTrap(fst, owner, zone, state){
  const el = document.createElement('div');
  if(fst.faceDown && owner === 'opponent'){
    el.className = 'card field-card face-down st-facedown';
    el.innerHTML = `<div class="card-back-pattern"><span class="back-label">A</span></div>`;
  } else if(fst.faceDown && owner === 'player'){
    el.className = `card field-card face-down own-facedown attr-spell`;
    el.innerHTML = `<div class="facedown-overlay">${fst.card.type === TYPE.TRAP ? '⚠ Falle' : '✦ Zauber'}</div>`;
  } else {
    el.className = `card field-card ${fst.card.type}-card attr-spell`;
    el.innerHTML = cardInnerHTML(fst.card, false);
  }

  if(owner === 'player' && fst.faceDown && state.activePlayer === 'player' && state.phase === 'main'){
    el.classList.add('interactive');
    el.addEventListener('click', () => _onFieldSpellTrapClick && _onFieldSpellTrapClick(zone, fst, state));
  }
  if (!IS_TOUCH) el.addEventListener('contextmenu', e => { e.preventDefault(); if(!fst.faceDown || owner==='player') _showCardDetail && _showCardDetail(fst.card); });
  if (IS_TOUCH && (!fst.faceDown || owner === 'player')) attachLongPress(el, () => _showCardDetail && _showCardDetail(fst.card));
  if(!fst.faceDown || owner === 'player'){
    _attachHover(el, fst.card, null);
  }
  return el;
}
