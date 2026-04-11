import type { SlotId } from './progression.js';

function _currencyKey(slot: SlotId, currencyId: string): string {
  return `tcg_s${slot}_currency_${currencyId}`;
}

export function getCurrency(slot: SlotId, currencyId: string): number {
  const raw = localStorage.getItem(_currencyKey(slot, currencyId));
  if (raw === null) return 0;
  const parsed = JSON.parse(raw);
  return typeof parsed === 'number' && parsed >= 0 ? parsed : 0;
}

export function addCurrency(slot: SlotId, currencyId: string, amount: number): number {
  const current = getCurrency(slot, currencyId);
  const next = Math.max(0, current + Math.max(0, amount));
  localStorage.setItem(_currencyKey(slot, currencyId), JSON.stringify(next));
  return next;
}

export function spendCurrency(slot: SlotId, currencyId: string, amount: number): boolean {
  if (amount <= 0) return false;
  const current = getCurrency(slot, currencyId);
  if (current < amount) return false;
  localStorage.setItem(_currencyKey(slot, currencyId), JSON.stringify(current - amount));
  return true;
}
