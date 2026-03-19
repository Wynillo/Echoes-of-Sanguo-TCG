// ============================================================
// AETHERIAL CLASH - Click Handlers, Action Menus, Deckbuilder
// ============================================================
import { TYPE, ATTR, ATTR_NAME, CARD_DB, FUSION_RECIPES, OPPONENT_CONFIGS, checkFusion } from './cards.js';
import { Progression } from './progression.js';
import { SEL, resetSel, getGame, getCurrentDeck, setCurrentDeck, getDeckPanelExpanded, setDeckPanelExpanded } from './ui-state.js';
import { renderAll, cardInnerHTML, setOnHandCardClick, setEventHandlers } from './ui-render.js';
import { _attachHover } from './ui-animations.js';

// ── Hand card click ────────────────────────────────────────
export function onHandCardClick(card, index, state){
  const game = getGame();
  if(!game) return;
  if(SEL.mode === 'fusion1'){
    if(index === SEL.fusion1.handIndex){ resetSel(); return; }
    const firstCard = state.player.hand[SEL.fusion1.handIndex];
    if(!firstCard){ showMsg('Fusionskarte nicht mehr in der Hand!'); resetSel(); return; }
    const recipe = checkFusion(card.id, firstCard.id);
    if(recipe){
      const zone = state.player.field.monsters.findIndex(z => z === null);
      if(zone === -1){ showMsg('Kein freier Monsterplatz!'); resetSel(); return; }
      game.performFusion('player', SEL.fusion1.handIndex, index);
      resetSel();
    } else {
      showMsg('Keine Fusion mit diesen Karten möglich!');
      resetSel();
    }
    return;
  }
  showCardActionMenu(card, index, state);
}

// ── Action menu ────────────────────────────────────────────
function showCardActionMenu(card, index, state){
  const game = getGame();
  const menu = document.getElementById('card-action-menu');
  const title = document.getElementById('action-menu-title');
  const btns  = document.getElementById('action-buttons');
  title.textContent = card.name;
  btns.innerHTML = '';

  const isMonster = [TYPE.NORMAL, TYPE.EFFECT, TYPE.FUSION].includes(card.type);
  const isSpell   = card.type === TYPE.SPELL;
  const isTrap    = card.type === TYPE.TRAP;
  const phase     = state.phase;

  if(isMonster && phase === 'main'){
    const freeZone = state.player.field.monsters.findIndex(z => z === null);
    if(state.player.normalSummonUsed){
      addMenuBtn(btns, '⛔ Monster bereits gespielt', null, true);
    } else {
      if(freeZone !== -1){
        addMenuBtn(btns, '⚔ Beschwören (ATK)', () => {
          game.summonMonster('player', index, freeZone, 'atk');
          closeActionMenu();
        });
        addMenuBtn(btns, '🛡 Als Verteidigung setzen', () => {
          game.summonMonster('player', index, freeZone, 'def');
          closeActionMenu();
        });
      }
    }
    const fusionOpts = game.getAllFusionOptions('player').filter(o => o.i1===index||o.i2===index);
    if(fusionOpts.length > 0 && !state.player.normalSummonUsed){
      addMenuBtn(btns, '✨ Fusion wählen', () => {
        SEL.mode   = 'fusion1';
        SEL.fusion1= { handIndex: index };
        document.querySelectorAll('.hand-card').forEach((el,i) => {
          if(i !== index) el.classList.add('targetable');
        });
        document.getElementById('action-hint').textContent = 'Wähle die zweite Fusionskarte aus der Hand.';
        closeActionMenu();
      });
    }
  }
  if(isSpell && phase === 'main'){
    addMenuBtn(btns, '✦ Aktivieren', () => {
      if(card.spellType === 'targeted' || card.spellType === 'fromGrave'){
        startSpellTargeting(card, index, state);
      } else {
        game.activateSpell('player', index);
      }
      closeActionMenu();
    });
    addMenuBtn(btns, '🔽 Setzen', () => {
      const zone = state.player.field.spellTraps.findIndex(z => z === null);
      if(zone === -1){ showMsg('Kein freier Zauberkarten-Slot!'); }
      else game.setSpellTrap('player', index, zone);
      closeActionMenu();
    });
  }
  if(isTrap && (phase === 'main' || phase === 'battle')){
    if(phase === 'main'){
      addMenuBtn(btns, '🔽 Fallen setzen', () => {
        const zone = state.player.field.spellTraps.findIndex(z => z === null);
        if(zone === -1){ showMsg('Kein freier Zauberkarten-Slot!'); }
        else game.setSpellTrap('player', index, zone);
        closeActionMenu();
      });
    }
    if(phase === 'battle' && card.trapTrigger === 'manual'){
      addMenuBtn(btns, '⚠ Falle aktivieren', () => {
        startTrapTargeting(card, index, state);
        closeActionMenu();
      });
    }
  }

  addMenuBtn(btns, '🔍 Ansehen', () => {
    document.getElementById('card-action-menu').classList.add('hidden');
    showCardDetail(card);
  });

  document.getElementById('modal-overlay').classList.remove('hidden');
  menu.classList.remove('hidden');
}

function startSpellTargeting(card, handIndex, state){
  const game = getGame();
  if(card.spellType === 'targeted' && card.target === 'ownMonster'){
    const targets = [];
    state.player.field.monsters.forEach((fc, i) => { if(fc) targets.push({ fc, zone:i }); });
    if(targets.length === 0){ showMsg('Kein Monster auf dem Feld!'); return; }
    if(targets.length === 1){
      game.activateSpell('player', handIndex, targets[0].fc);
    } else {
      document.getElementById('action-hint').textContent = 'Wähle ein eigenes Monster als Ziel.';
      SEL.mode = 'spell-target';
      SEL.spellHandIndex = handIndex;
      SEL.spellCard = card;
      document.querySelectorAll('#player-monster-zone .zone-slot').forEach((slot, i) => {
        if(state.player.field.monsters[i]){
          slot.classList.add('targetable');
          slot.addEventListener('click', () => {
            game.activateSpell('player', SEL.spellHandIndex, state.player.field.monsters[i]);
            resetSel();
          }, { once: true });
        }
      });
    }
  } else if(card.spellType === 'targeted' && card.target === 'ownDarkMonster'){
    const targets = [];
    state.player.field.monsters.forEach((fc, i) => { if(fc && fc.card.attribute===ATTR.DARK) targets.push({ fc, zone:i }); });
    if(targets.length === 0){ showMsg('Kein DUNKEL-Monster auf dem Feld!'); return; }
    game.activateSpell('player', handIndex, targets[0].fc);
  } else if(card.spellType === 'fromGrave'){
    const monsters = state.player.graveyard.filter(c => [TYPE.NORMAL,TYPE.EFFECT,TYPE.FUSION].includes(c.type));
    if(monsters.length === 0){ showMsg('Keine Monster im Friedhof!'); return; }
    showGraveSelection(monsters, (chosen) => {
      game.activateSpell('player', handIndex, chosen);
    });
  }
}

function startTrapTargeting(card, handIndex, state){
  const game = getGame();
  if(card.target === 'oppMonster'){
    document.getElementById('action-hint').textContent = 'Wähle ein Monster des Gegners als Ziel.';
    SEL.mode = 'trap-target';
    document.querySelectorAll('#opponent-monster-zone .zone-slot').forEach((slot, i) => {
      const fc = state.opponent.field.monsters[i];
      if(fc){
        slot.classList.add('targetable');
        slot.addEventListener('click', () => {
          game.activateSpell('player', handIndex, fc);
          resetSel();
        }, { once: true });
      }
    });
  }
}

export function onOwnFieldCardClick(fc, zone, state){
  const game = getGame();
  if(!game || state.activePlayer !== 'player' || state.phase !== 'main') return;
  const menu = document.getElementById('card-action-menu');
  const title = document.getElementById('action-menu-title');
  const btns  = document.getElementById('action-buttons');
  title.textContent = fc.card.name;
  btns.innerHTML = '';
  addMenuBtn(btns, '🔄 Position wechseln', () => { game.changePosition('player', zone); closeActionMenu(); });
  addMenuBtn(btns, '🔍 Ansehen', () => {
    document.getElementById('card-action-menu').classList.add('hidden');
    showCardDetail(fc.card, fc);
  });
  document.getElementById('modal-overlay').classList.remove('hidden');
  menu.classList.remove('hidden');
}

export function onFieldSpellTrapClick(zone, fst, state){
  const game = getGame();
  if(!game || state.activePlayer !== 'player' || state.phase !== 'main') return;
  if(!fst.faceDown) return;
  if(fst.card.type === TYPE.SPELL){
    if(fst.card.spellType === 'targeted' || fst.card.spellType === 'fromGrave'){
      startSpellTargeting(fst.card, -1, state);
    } else {
      game.activateSpellFromField('player', zone);
    }
  }
}

export function onAttackerSelect(zone, state){
  const game = getGame();
  if(!game || state.activePlayer !== 'player' || state.phase !== 'battle') return;
  const fc = state.player.field.monsters[zone];
  if(!fc || fc.hasAttacked || fc.position !== 'atk' || fc.summonedThisTurn) return;

  resetSel();
  SEL.mode = 'attack';
  SEL.attackerZone = zone;

  const oppHasMonsters = state.opponent.field.monsters.some(m => m !== null);
  if(!oppHasMonsters || fc.canDirectAttack){
    document.getElementById('action-hint').textContent =
      fc.canDirectAttack && oppHasMonsters
        ? `${fc.card.name} kann direkt angreifen!`
        : `${fc.card.name} bereit! Klicke "Direkt Angreifen".`;
    document.getElementById('btn-direct-attack').classList.remove('hidden');
    if(oppHasMonsters){
      document.querySelectorAll('#opponent-monster-zone .zone-slot').forEach((slot, i) => {
        if(state.opponent.field.monsters[i]) slot.classList.add('targetable');
      });
    }
  } else {
    document.getElementById('action-hint').textContent = `${fc.card.name} ausgewählt. Wähle ein Ziel.`;
    document.getElementById('btn-direct-attack').classList.add('hidden');
    document.querySelectorAll('#opponent-monster-zone .zone-slot').forEach((slot, i) => {
      if(state.opponent.field.monsters[i]){
        slot.classList.add('targetable');
      }
    });
  }

  renderAll(state);
  document.querySelectorAll('#opponent-monster-zone .zone-slot').forEach((slot, i) => {
    if(state.opponent.field.monsters[i]){
      slot.classList.add('targetable');
    }
  });
}

export function onDefenderSelect(zone){
  const game = getGame();
  if(!game || SEL.mode !== 'attack') return;
  game.attack('player', SEL.attackerZone, zone);
  resetSel();
  document.getElementById('btn-direct-attack').classList.add('hidden');
}

function addMenuBtn(container, label, handler, disabled=false){
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className   = 'menu-action-btn';
  if(disabled){ btn.disabled = true; btn.style.opacity = '0.45'; btn.style.cursor = 'default'; }
  else { btn.addEventListener('click', handler); }
  container.appendChild(btn);
}

export function closeActionMenu(){
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('card-action-menu').classList.add('hidden');
}

// ── Graveyard Selection ─────────────────────────────────────
export function showGraveSelection(cards, callback){
  const modal = document.getElementById('grave-select-modal');
  const list  = document.getElementById('grave-select-list');
  list.innerHTML = '';
  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = `card hand-card ${card.type}-card attr-${card.attribute||'spell'}`;
    el.innerHTML = cardInnerHTML(card);
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.add('hidden');
      modal.classList.add('hidden');
      callback(card);
    });
    list.appendChild(el);
  });
  document.getElementById('modal-overlay').classList.remove('hidden');
  modal.classList.remove('hidden');
}

// ── Card Detail ────────────────────────────────────────────
export function showCardDetail(card, fc=null){
  const modal = document.getElementById('card-detail-modal');
  document.getElementById('detail-card-name').textContent = card.name;
  document.getElementById('detail-card-type').textContent =
    `${ATTR_NAME[card.attribute]||''} · ${({normal:'Normal',effect:'Effekt',fusion:'Fusion',spell:'Zauberkarte',trap:'Fallenkarte'}[card.type]||'')}` +
    (card.level ? ` · Stufe ${card.level}` : '');
  document.getElementById('detail-card-desc').textContent = card.description || '';
  let statsText = '';
  if(card.atk !== undefined){
    statsText = `ATK: ${fc ? fc.effectiveATK() : card.atk}  DEF: ${fc ? fc.effectiveDEF() : card.def}`;
    if(fc && (fc.permATKBonus || fc.tempATKBonus)) statsText += ` (+Bonus)`;
  }
  document.getElementById('detail-card-stats').textContent = statsText;

  const cardEl = document.getElementById('detail-card-render');
  cardEl.className = `card big-card ${card.type}-card attr-${card.attribute||'spell'}`;
  cardEl.innerHTML = cardInnerHTML(card, false, false, fc);

  document.getElementById('modal-overlay').classList.remove('hidden');
  modal.classList.remove('hidden');
}

// ── Prompt Modal (for trap activation) ────────────────────
export function showPromptModal(opts){
  return new Promise(resolve => {
    const modal  = document.getElementById('trap-prompt-modal');
    const title  = document.getElementById('trap-prompt-title');
    const cardEl = document.getElementById('trap-prompt-card');
    const msg    = document.getElementById('trap-prompt-msg');
    const btnYes = document.getElementById('trap-prompt-yes');
    const btnNo  = document.getElementById('trap-prompt-no');

    title.textContent   = opts.title;
    msg.textContent     = opts.message;
    btnYes.textContent  = opts.yes;
    btnNo.textContent   = opts.no;

    const card = CARD_DB[opts.cardId];
    if(card){
      cardEl.innerHTML = '';
      const el = document.createElement('div');
      el.className = `card ${card.type}-card attr-${card.attribute||'spell'}`;
      el.innerHTML = cardInnerHTML(card);
      cardEl.appendChild(el);
    }

    document.getElementById('modal-overlay').classList.remove('hidden');
    modal.classList.remove('hidden');

    const cleanup = () => {
      document.getElementById('modal-overlay').classList.add('hidden');
      modal.classList.add('hidden');
    };
    btnYes.onclick = () => { cleanup(); resolve(true);  };
    btnNo.onclick  = () => { cleanup(); resolve(false); };
  });
}

// ── Card List ──────────────────────────────────────────────
export function showCardList(){
  const modal   = document.getElementById('cardlist-modal');
  const content = document.getElementById('cardlist-content');
  content.innerHTML = '';

  const groups = {
    'Normale Monster':   Object.values(CARD_DB).filter(c => c.type===TYPE.NORMAL),
    'Effekt-Monster':    Object.values(CARD_DB).filter(c => c.type===TYPE.EFFECT),
    'Fusion-Monster':    Object.values(CARD_DB).filter(c => c.type===TYPE.FUSION),
    'Zauberkarten':      Object.values(CARD_DB).filter(c => c.type===TYPE.SPELL),
    'Fallenkarten':      Object.values(CARD_DB).filter(c => c.type===TYPE.TRAP),
  };

  for(const [groupName, cards] of Object.entries(groups)){
    if(cards.length === 0) continue;
    const h = document.createElement('h3');
    h.textContent = groupName;
    h.className = 'cardlist-group-title';
    content.appendChild(h);
    const row = document.createElement('div');
    row.className = 'cardlist-row';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `card hand-card ${card.type}-card attr-${card.attribute||'spell'}`;
      el.innerHTML = cardInnerHTML(card);
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => showCardDetail(card));
      row.appendChild(el);
    });
    content.appendChild(row);

    if(groupName === 'Fusion-Monster'){
      const recipeDiv = document.createElement('div');
      recipeDiv.className = 'fusion-recipes';
      FUSION_RECIPES.forEach(r => {
        const c1 = CARD_DB[r.materials[0]], c2 = CARD_DB[r.materials[1]], cr = CARD_DB[r.result];
        const li = document.createElement('div');
        li.className = 'recipe-line';
        li.textContent = `${c1.name} + ${c2.name} → ${cr.name}`;
        recipeDiv.appendChild(li);
      });
      content.appendChild(recipeDiv);
    }
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
  modal.classList.remove('hidden');
}

// ── Battle Log helpers ─────────────────────────────────────
export function addLogEntry(msg){
  const log = document.getElementById('log-entries');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = msg;
  log.insertBefore(entry, log.firstChild);
  while(log.children.length > 25) log.removeChild(log.lastChild);
}

export function showMsg(msg){
  document.getElementById('action-hint').textContent = msg;
  setTimeout(() => { document.getElementById('action-hint').textContent = ''; }, 3000);
}

// ── Result Screen ──────────────────────────────────────────
export function showResultScreen(type, coinsEarned){
  const modal = document.getElementById('result-modal');
  const title = document.getElementById('result-title');
  const msg   = document.getElementById('result-msg');
  const coinsEl = document.getElementById('result-coins');

  if(type === 'victory'){
    title.textContent = 'Sieg!';
    title.style.color = '#ffd700';
    msg.textContent   = 'Du hast den Gegner besiegt! Die Macht der Aetherial liegt in deinen Händen.';
  } else {
    title.textContent = 'Niederlage';
    title.style.color = '#cc4444';
    msg.textContent   = 'Du wurdest besiegt. Doch jeder Krieger kann aus einer Niederlage lernen...';
  }

  if(coinsEl){
    if(coinsEarned && coinsEarned > 0){
      coinsEl.textContent = `+${coinsEarned} Äther-Münzen`;
      coinsEl.classList.remove('hidden');
    } else {
      coinsEl.classList.add('hidden');
    }
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
  modal.classList.remove('hidden');
}

// ── Duel End (Progression-Hook) ────────────────────────────
export function handleDuelEnd(result, opponentId){
  const isVictory = result === 'victory';
  let coinsEarned = 0;

  if(opponentId && typeof Progression !== 'undefined'){
    Progression.recordDuelResult(opponentId, isVictory);
    const cfg = OPPONENT_CONFIGS ? OPPONENT_CONFIGS.find(o => o.id === opponentId) : null;
    if(cfg){
      coinsEarned = isVictory ? cfg.coinsWin : cfg.coinsLoss;
      Progression.addCoins(coinsEarned);
    }
  }

  showResultScreen(result, coinsEarned);
}

// ── Deckbuilder ────────────────────────────────────────────
export function saveDeck() {
  const deck = getCurrentDeck();
  if (deck.length !== 40) return;
  localStorage.setItem('aetherialClash_deck', JSON.stringify(deck));
  const toast = document.getElementById('db-save-toast');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

function _flyCardClone(srcEl, targetPanelId, cardInner, onDone) {
  const srcRect = srcEl.getBoundingClientRect();
  const dst     = document.getElementById(targetPanelId).getBoundingClientRect();
  const dstX    = dst.left + dst.width  / 2;
  const dstY    = dst.top  + dst.height / 2;

  const clone = document.createElement('div');
  clone.className = 'db-fly-clone';
  clone.style.left   = srcRect.left   + 'px';
  clone.style.top    = srcRect.top    + 'px';
  clone.style.width  = srcRect.width  + 'px';
  clone.style.height = srcRect.height + 'px';
  clone.innerHTML = cardInner;
  document.body.appendChild(clone);

  const dx = dstX - srcRect.left - srcRect.width  / 2;
  const dy = dstY - srcRect.top  - srcRect.height / 2;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px,${dy}px) scale(0.12)`;
    clone.style.opacity   = '0';
  }));

  clone.addEventListener('transitionend', () => { clone.remove(); onDone(); }, { once: true });
}

function _bumpCount(type) {
  const cnt = document.getElementById('db-count');
  cnt.classList.remove('db-count-bump-add', 'db-count-bump-remove');
  void cnt.offsetWidth;
  cnt.classList.add(type === 'add' ? 'db-count-bump-add' : 'db-count-bump-remove');
}

export function addCardToDeck(id, el) {
  const deck = getCurrentDeck();
  if (deck.length >= 40) return;
  const copies = deck.filter(c => c === id).length;
  if (copies >= 3) return;
  deck.push(id);
  setCurrentDeck(deck);
  if (el) {
    el.classList.add('db-src-flash-add');
    _bumpCount('add');
    const cardEl = el.querySelector('.card');
    _flyCardClone(el, 'db-deck-panel', cardEl ? cardEl.innerHTML : '', renderDeckbuilder);
  } else {
    renderDeckbuilder();
  }
}

export function removeCardFromDeck(id, el) {
  const deck = getCurrentDeck();
  const idx = deck.lastIndexOf(id);
  if (idx !== -1) {
    deck.splice(idx, 1);
    setCurrentDeck(deck);
    if (el) {
      el.classList.add('db-src-flash-remove');
      _bumpCount('remove');
      const cardEl = el.querySelector('.card');
      _flyCardClone(el, 'db-collection-panel', cardEl ? cardEl.innerHTML : '', renderDeckbuilder);
    } else {
      renderDeckbuilder();
    }
  }
}

export function toggleDeckPanel() {
  const expanded = !getDeckPanelExpanded();
  setDeckPanelExpanded(expanded);
  document.getElementById('db-deck-panel')
    .classList.toggle('db-expanded', expanded);
  document.getElementById('db-body')
    .classList.toggle('db-panel-expanded', expanded);
  renderDeckbuilder();
}

export function showDeckbuilder() {
  // loadDeck is in ui.js shell; call it via a setter
  _loadDeckFn && _loadDeckFn();
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('deckbuilder-screen').classList.remove('hidden');
  renderDeckbuilder();
}

let _loadDeckFn = null;
export function setLoadDeckFn(fn) { _loadDeckFn = fn; }

export function renderDeckbuilder() {
  const deck = getCurrentDeck();
  const deckFull = deck.length === 40;
  document.getElementById('db-count').textContent = `${deck.length}/40 Karten`;
  const saveBtn = document.getElementById('btn-db-save');
  saveBtn.disabled = !deckFull;
  saveBtn.style.opacity = deckFull ? '1' : '0.4';
  saveBtn.style.cursor  = deckFull ? 'pointer' : 'not-allowed';

  const copyMap = {};
  deck.forEach(id => { copyMap[id] = (copyMap[id] || 0) + 1; });

  const activeFilter = (document.querySelector('.db-filter-btn.active') || {}).dataset
    ? document.querySelector('.db-filter-btn.active').dataset.filter
    : 'all';

  const grid = document.getElementById('db-collection-grid');
  grid.innerHTML = '';

  const collection = (typeof Progression !== 'undefined' && Progression.isFirstLaunch !== undefined && !Progression.isFirstLaunch())
    ? Progression.getCollection()
    : null;
  const ownedIds = collection ? new Set(collection.map(e => e.id)) : null;

  const deckableCards = Object.values(CARD_DB).filter(c =>
    c.type !== TYPE.FUSION && (!ownedIds || ownedIds.has(c.id))
  );

  deckableCards
    .filter(c => activeFilter === 'all' || c.type === activeFilter)
    .forEach(card => {
      const copies   = copyMap[card.id] || 0;
      const atMax    = copies >= 3;
      const full     = deck.length >= 40;

      const wrap = document.createElement('div');
      wrap.className = 'db-card-wrap' + (atMax || full ? ' db-card-dimmed' : '');

      const el = document.createElement('div');
      el.className = `card ${card.type}-card attr-${card.attribute || 'spell'}`;
      el.innerHTML = cardInnerHTML(card, false, false, null);
      wrap.appendChild(el);

      if (copies > 0) {
        const badge = document.createElement('div');
        badge.className = 'db-copy-badge';
        badge.textContent = `${copies}/3`;
        wrap.appendChild(badge);
      }

      if (!atMax && !full) {
        wrap.addEventListener('click', () => addCardToDeck(card.id, wrap));
      }

      _attachHover(el, card, null);
      grid.appendChild(wrap);
    });

  const list = document.getElementById('db-deck-list');
  list.innerHTML = '';

  const seen = new Set();
  const orderedIds = [];
  deck.forEach(id => { if (!seen.has(id)) { seen.add(id); orderedIds.push(id); } });

  const expanded = getDeckPanelExpanded();

  if (expanded) {
    list.classList.add('db-deck-expanded');

    orderedIds.forEach(id => {
      const card  = CARD_DB[id];
      const count = copyMap[id] || 0;

      const wrap = document.createElement('div');
      wrap.className = 'db-deck-card-wrap';

      const el = document.createElement('div');
      el.className = `card ${card.type}-card attr-${card.attribute || 'spell'}`;
      el.innerHTML = cardInnerHTML(card, false, false, null);
      wrap.appendChild(el);

      const badge = document.createElement('div');
      badge.className = 'db-copy-badge';
      badge.textContent = `×${count}`;
      wrap.appendChild(badge);

      const rmOverlay = document.createElement('div');
      rmOverlay.className = 'db-deck-rm-overlay';
      rmOverlay.textContent = '✕';
      wrap.appendChild(rmOverlay);

      wrap.addEventListener('click', () => removeCardFromDeck(id, wrap));
      _attachHover(el, card, null);
      list.appendChild(wrap);
    });

  } else {
    list.classList.remove('db-deck-expanded');

    orderedIds.forEach(id => {
      const card  = CARD_DB[id];
      const count = copyMap[id] || 0;

      const row = document.createElement('div');
      row.className = 'db-deck-row';

      const mini = document.createElement('div');
      mini.className = `card db-deck-row-mini ${card.type}-card attr-${card.attribute || 'spell'}`;
      mini.innerHTML = cardInnerHTML(card, false, false, null);
      row.appendChild(mini);

      const name = document.createElement('span');
      name.className = 'db-deck-row-name';
      name.textContent = card.name;
      row.appendChild(name);

      const cnt = document.createElement('span');
      cnt.className = 'db-deck-row-count';
      cnt.textContent = `×${count}`;
      row.appendChild(cnt);

      const rm = document.createElement('span');
      rm.className = 'db-deck-row-rm';
      rm.textContent = '✕';
      rm.title = 'Entfernen';
      row.appendChild(rm);

      row.addEventListener('click', () => removeCardFromDeck(id, row));
      _attachHover(mini, card, null);
      list.appendChild(row);
    });
  }
}

// ── Wire up cross-module handlers on module init ───────────
// Register onHandCardClick into ui-render to break circular dep
setOnHandCardClick(onHandCardClick);

// Register event handlers into ui-render for field card building
setEventHandlers({
  onOwnFieldCardClick,
  onAttackerSelect,
  onDefenderSelect,
  onFieldSpellTrapClick,
  showCardDetail,
});
