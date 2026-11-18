import type { Unit } from './types';

export const KG_PER_LB = 0.45359237;

export function toDisplay(kg: number, unit: Unit): number {
  const v = unit === 'kg' ? kg : kg / KG_PER_LB;
  return Math.round(v * 10) / 10;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function fmtWeight(kg: number | undefined, unit: Unit, withUnit = false): string {
  if (kg == null || Number.isNaN(kg)) return '—';
  const v = toDisplay(kg, unit);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return withUnit ? `${s} ${unit}` : s;
}

/** Compact volume, e.g. 12.4k kg */
export function fmtVolume(kg: number, unit: Unit): string {
  const v = toDisplay(kg, unit);
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(v).toLocaleString()} ${unit}`;
}

/** Smallest sensible load jump for progressive overload. */
export function weightIncrementKg(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5 * KG_PER_LB;
}

export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function parseNum(text: string): number | undefined {
  const t = text.replace(',', '.').trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

const DAY = 86400000;

export function fmtDate(ts: number, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(ts).toLocaleDateString(undefined, opts);
}

export function fmtRelativeDay(ts: number): string {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diff = Math.floor((startOfToday.getTime() - new Date(ts).setHours(0, 0, 0, 0)) / DAY);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return fmtDate(ts, { month: 'short', day: 'numeric' });
}
