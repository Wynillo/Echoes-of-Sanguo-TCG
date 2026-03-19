// ============================================================
// AETHERIAL CLASH - Animations & Visual Effects
// ============================================================
import { IS_TOUCH } from './ui-state.js';

// cardInnerHTML is needed for showHoverPreview and showCardActivation.
// It lives in ui-render.js but that would create a circular dependency
// (ui-render imports ui-animations for _attachHover).
// Solution: import cardInnerHTML from ui-render.js — ui-render does NOT import
// anything back from ui-animations that would cause a cycle at module init time;
// JS ES modules handle circular references via live bindings, so this is safe.
// We use a late-binding import trick via a setter instead.
let _cardInnerHTML = null;
export function setCardInnerHTMLFn(fn) { _cardInnerHTML = fn; }

import { ATTR_NAME } from './cards.js';

// ── Card Hover Preview ─────────────────────────────────────
let _hoverHideTimer = null;

export function showHoverPreview(card, fc, event){
  if(!card) return;
  clearTimeout(_hoverHideTimer);

  const preview = document.getElementById('card-hover-preview');

  // ─ Card render ─
  const renderEl = document.getElementById('hover-card-render');
  renderEl.innerHTML = '';
  const cardEl = document.createElement('div');
  cardEl.className = `card ${card.type}-card attr-${card.attribute || 'spell'}`;
  cardEl.innerHTML = _cardInnerHTML ? _cardInnerHTML(card, false, false, fc) : '';
  renderEl.appendChild(cardEl);

  // ─ Info ─
  document.getElementById('hover-card-name').textContent = card.name;

  const attrName  = ATTR_NAME[card.attribute] || '';
  const typeName  = { normal:'Normal', effect:'Effekt', fusion:'Fusion', spell:'Zauberkarte', trap:'Fallenkarte' }[card.type] || '';
  const levelStr  = card.level ? ` · Lv ${card.level}` : '';
  document.getElementById('hover-card-meta').textContent = [attrName, typeName].filter(Boolean).join(' · ') + levelStr;

  document.getElementById('hover-card-desc').textContent = card.description || '';

  if(card.atk !== undefined){
    const atkVal = fc ? fc.effectiveATK() : card.atk;
    const defVal = fc ? fc.effectiveDEF() : card.def;
    const bonus  = fc && (fc.permATKBonus || fc.tempATKBonus) ? ' ▲' : '';
    document.getElementById('hover-card-stats').textContent = `ATK ${atkVal}${bonus}  DEF ${defVal}`;
  } else {
    document.getElementById('hover-card-stats').textContent = '';
  }

  // ─ Position ─
  _positionHoverPreview(event.clientX, event.clientY);
  preview.classList.remove('hidden');
  requestAnimationFrame(() => preview.classList.add('visible'));
}

export function hideHoverPreview(){
  _hoverHideTimer = setTimeout(() => {
    const preview = document.getElementById('card-hover-preview');
    preview.classList.remove('visible');
    setTimeout(() => preview.classList.add('hidden'), 130);
  }, 60);
}

function _positionHoverPreview(mx, my){
  const preview = document.getElementById('card-hover-preview');
  const pw = preview.offsetWidth  || 210;
  const ph = preview.offsetHeight || 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = mx + 18;
  let top  = my - 20;

  if(left + pw > vw - 8) left = mx - pw - 18;
  if(top  + ph > vh - 8) top  = vh - ph - 8;
  if(top < 8)            top  = 8;
  if(left < 8)           left = 8;

  preview.style.left = left + 'px';
  preview.style.top  = top  + 'px';
}

export function attachLongPress(el, callback, ms = 500){
  let timer = null, moved = false;
  el.addEventListener('touchstart', e => {
    moved = false;
    timer = setTimeout(() => { if (!moved) { e.preventDefault(); callback(); } }, ms);
  }, { passive: false });
  el.addEventListener('touchmove',   () => { moved = true; clearTimeout(timer); });
  el.addEventListener('touchend',    () => clearTimeout(timer));
  el.addEventListener('touchcancel', () => clearTimeout(timer));
}

export function _attachHover(el, card, fc){
  if (IS_TOUCH) return;
  el.addEventListener('mouseenter', e => showHoverPreview(card, fc, e));
  el.addEventListener('mouseleave', hideHoverPreview);
  el.addEventListener('mousemove',  e => _positionHoverPreview(e.clientX, e.clientY));
}

// ── Angriffs-Animation ────────────────────────────────────
function spawnImpactBurst(x, y, isDirect){
  const el = document.createElement('div');
  el.className = 'atk-burst' + (isDirect ? ' direct' : '');
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

export function playAttackAnim(atkOwner, atkZone, defOwner, defZone){
  return new Promise(resolve => {
    const atkContId = atkOwner === 'player' ? 'player-monster-zone' : 'opponent-monster-zone';
    const atkSlots  = document.querySelectorAll(`#${atkContId} .zone-slot`);
    const atkSlot   = atkSlots[atkZone];
    const atkCard   = atkSlot && atkSlot.querySelector('.card');
    if(!atkCard){ resolve(); return; }

    const isDirect = defZone === null || defZone === undefined;
    let defSlot = null, defCard = null;
    if(!isDirect){
      const defContId = defOwner === 'player' ? 'player-monster-zone' : 'opponent-monster-zone';
      const defSlots  = document.querySelectorAll(`#${defContId} .zone-slot`);
      defSlot = defSlots[defZone];
      defCard = defSlot && defSlot.querySelector('.card');
    }

    const atkRect = atkCard.getBoundingClientRect();
    const atkCX   = atkRect.left + atkRect.width  / 2;
    const atkCY   = atkRect.top  + atkRect.height / 2;

    let impX, impY;
    if(defCard){
      const r = defCard.getBoundingClientRect();
      impX = r.left + r.width  / 2;
      impY = r.top  + r.height / 2;
    } else {
      const lpId  = defOwner === 'player' ? 'player-lp' : 'opp-lp';
      const lpEl  = document.getElementById(lpId);
      const lpR   = lpEl ? lpEl.getBoundingClientRect() : null;
      impX = lpR ? lpR.left + lpR.width / 2 : window.innerWidth / 2;
      impY = lpR ? lpR.top  + lpR.height / 2
                 : (defOwner === 'player' ? window.innerHeight - 90 : 70);
    }

    const dx = impX - atkCX;
    const dy = impY - atkCY;

    const clone = atkCard.cloneNode(true);
    Object.assign(clone.style, {
      position: 'fixed', margin: '0', padding: '0', boxSizing: 'border-box',
      left: atkRect.left + 'px', top: atkRect.top + 'px',
      width: atkRect.width + 'px', height: atkRect.height + 'px',
      zIndex: '420', pointerEvents: 'none',
      transition: 'none', transform: 'none',
    });
    document.body.appendChild(clone);
    atkCard.style.opacity = '0.25';

    requestAnimationFrame(() => {
      clone.style.transition = 'transform 0.12s ease-out, filter 0.12s, box-shadow 0.12s';
      clone.style.transform  = `translate(${-dx * 0.14}px, ${-dy * 0.14}px) scale(1.18)`;
      clone.style.filter     = 'brightness(1.5)';
      clone.style.boxShadow  = '0 0 22px rgba(255,200,60,0.9)';

      setTimeout(() => {
        clone.style.transition = 'transform 0.16s cubic-bezier(0.4,0,0.8,1), filter 0.1s';
        clone.style.transform  = `translate(${dx}px, ${dy}px) scale(1.06)`;
        clone.style.filter     = 'brightness(2)';

        setTimeout(() => {
          spawnImpactBurst(impX, impY, isDirect);
          if(defCard){ defCard.classList.add('atk-hit'); }
          if(defSlot){ defSlot.classList.add('atk-impact'); }

          setTimeout(() => {
            clone.style.transition = 'transform 0.22s ease-out, opacity 0.22s, filter 0.22s';
            clone.style.transform  = 'translate(0,0) scale(1)';
            clone.style.opacity    = '0';
            clone.style.filter     = 'brightness(1)';

            setTimeout(() => {
              clone.remove();
              atkCard.style.opacity = '';
              if(defCard) defCard.classList.remove('atk-hit');
              if(defSlot) defSlot.classList.remove('atk-impact');
              resolve();
            }, 240);
          }, 80);
        }, 175);
      }, 130);
    });
  });
}

// ── Karten-Aktivierungs-Animation ─────────────────────────
export function showCardActivation(card, effectText){
  return new Promise(resolve => {
    const overlay  = document.getElementById('card-activate-overlay');
    const render   = document.getElementById('card-activate-render');
    const textEl   = document.getElementById('card-activate-effect-text');
    const labelEl  = document.getElementById('card-activate-label');

    const labels = { spell:'Zauber aktiviert', trap:'Falle aktiviert',
                     effect:'Effekt ausgelöst', fusion:'Fusion!', normal:'Effekt ausgelöst' };
    labelEl.textContent = (labels[card.type] || 'AKTIVIERT').toUpperCase();

    render.innerHTML = '';
    const cardEl = document.createElement('div');
    cardEl.className = `card big-card ${card.type}-card attr-${card.attribute||'spell'}`;
    cardEl.innerHTML = _cardInnerHTML ? _cardInnerHTML(card, false, false, null) : '';
    render.appendChild(cardEl);

    textEl.textContent = effectText || card.description || '—';

    overlay.classList.remove('hidden','ca-visible','ca-dissolve');
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('ca-visible')));

    setTimeout(() => {
      overlay.classList.remove('ca-visible');
      overlay.classList.add('ca-dissolve');
      setTimeout(() => { overlay.classList.add('hidden'); resolve(); }, 580);
    }, 1600);
  });
}
