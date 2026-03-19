// ============================================================
// AETHERIAL CLASH - Shared UI State
// ============================================================

export let game = null;
export let _currentDeck = [];
export let _deckPanelExpanded = false;
export let _lastOpponentConfig = null;

// Touch-Gerät erkennen (einmalig beim Laden)
export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

// ── Selection state ────────────────────────────────────────
export const SEL = {
  mode: null,         // 'hand'|'attack'|'fusion1'|'spell-target'|'grave-target'|'trap-target'
  handIndex: null,
  attackerZone: null,
  fusion1: null,      // { handIndex }
  spellHandIndex: null,
  spellCard: null,
  trapFieldZone: null,
  callback: null
};

export function resetSel(){
  Object.assign(SEL, { mode:null, handIndex:null, attackerZone:null, fusion1:null, spellHandIndex:null, spellCard:null, trapFieldZone:null, callback:null });
  document.querySelectorAll('.selected,.targetable').forEach(el => el.classList.remove('selected','targetable'));
  document.getElementById('action-hint').textContent = '';
}

// ── Setter functions for mutable state ────────────────────
export function setGame(g) { game = g; }
export function getGame()  { return game; }

export function setCurrentDeck(d) { _currentDeck = d; }
export function getCurrentDeck()  { return _currentDeck; }

export function setDeckPanelExpanded(v) { _deckPanelExpanded = v; }
export function getDeckPanelExpanded()  { return _deckPanelExpanded; }

export function setLastOpponentConfig(c) { _lastOpponentConfig = c; }
export function getLastOpponentConfig()  { return _lastOpponentConfig; }
