// The approval desk. Edit these lists when the process changes.
// Stages, standards, score marks, and Utah documents are the whole vocabulary.

export const PIPELINE_STAGES = [
  { key: 'new', label: 'new' },
  { key: 'screening', label: 'screening' },
  { key: 'call', label: 'call' },
  { key: 'docs', label: 'docs' },
  { key: 'sample', label: 'sample' },
  { key: 'decision', label: 'decision' },
] as const;

export const STANDARDS = [
  { key: 'quality', label: 'quality' },
  { key: 'transparency', label: 'transparency' },
  { key: 'food_safety', label: 'food safety' },
  { key: 'accessibility', label: 'accessibility' },
  { key: 'reliability', label: 'reliability' },
] as const;

export const SCORE_MARKS = [
  { key: 'pass', label: 'pass' },
  { key: 'needs_work', label: 'needs work' },
  { key: 'no', label: 'no' },
] as const;

export const DOCUMENTS = [
  { key: 'cottage_food', label: 'cottage food' },
  { key: 'egg_license', label: 'egg license' },
  { key: 'raw_milk_permit', label: 'raw milk permit' },
  { key: 'meat_inspection', label: 'meat inspection' },
  { key: 'sales_tax_license', label: 'sales tax license' },
] as const;

export const DOCUMENT_STATUSES = [
  { key: 'needed', label: 'needed' },
  { key: 'received', label: 'received' },
  { key: 'verified', label: 'verified' },
  { key: 'not_applicable', label: 'not applicable' },
] as const;

export const DECISIONS = [
  { key: 'approve', label: 'approve', public: true },
  { key: 'approve_conditions', label: 'approve with conditions', public: true },
  { key: 'waitlist', label: 'waitlist', public: false },
  { key: 'decline', label: 'decline', public: false },
] as const;

/** Words that suggest a document. Sales tax is hinted for every farm. */
export const DOCUMENT_HINTS: { key: (typeof DOCUMENTS)[number]['key']; words: string[] }[] = [
  { key: 'cottage_food', words: ['bread', 'jam', 'jelly', 'cookie', 'cake', 'granola', 'pickle', 'salsa', 'baked', 'cottage', 'honey', 'loaf', 'muffin', 'pie'] },
  { key: 'egg_license', words: ['egg'] },
  { key: 'raw_milk_permit', words: ['raw milk', 'unpasteurized', 'milk'] },
  { key: 'meat_inspection', words: ['beef', 'pork', 'lamb', 'bison', 'meat', 'chicken', 'turkey', 'poultry'] },
];

export type StageKey = (typeof PIPELINE_STAGES)[number]['key'];
export type StandardKey = (typeof STANDARDS)[number]['key'];
export type MarkKey = (typeof SCORE_MARKS)[number]['key'];
export type DocumentKey = (typeof DOCUMENTS)[number]['key'];
export type DocumentStatusKey = (typeof DOCUMENT_STATUSES)[number]['key'];
export type DecisionKey = (typeof DECISIONS)[number]['key'];

const STAGE_KEYS = new Set<string>(PIPELINE_STAGES.map((stage) => stage.key));
const STANDARD_KEYS = new Set<string>(STANDARDS.map((standard) => standard.key));
const MARK_KEYS = new Set<string>(SCORE_MARKS.map((mark) => mark.key));
const DOCUMENT_KEYS = new Set<string>(DOCUMENTS.map((document) => document.key));
const DOCUMENT_STATUS_KEYS = new Set<string>(DOCUMENT_STATUSES.map((status) => status.key));
const DECISION_KEYS = new Set<string>(DECISIONS.map((decision) => decision.key));

export function isStage(value: string): value is StageKey {
  return STAGE_KEYS.has(value);
}

export function assertStage(value: string): StageKey {
  if (!isStage(value)) throw new Error('that stage is not on the list.');
  return value;
}

export function assertStandard(value: string): StandardKey {
  if (!STANDARD_KEYS.has(value)) throw new Error('that standard is not on the list.');
  return value as StandardKey;
}

export function assertMark(value: string): MarkKey {
  if (!MARK_KEYS.has(value)) throw new Error('a score is pass, needs work, or no.');
  return value as MarkKey;
}

export function assertDocument(value: string): DocumentKey {
  if (!DOCUMENT_KEYS.has(value)) throw new Error('that document is not on the list.');
  return value as DocumentKey;
}

export function assertDocumentStatus(value: string): DocumentStatusKey {
  if (!DOCUMENT_STATUS_KEYS.has(value)) throw new Error('a document is needed, received, verified, or not applicable.');
  return value as DocumentStatusKey;
}

export function assertDecision(value: string): DecisionKey {
  if (!DECISION_KEYS.has(value)) throw new Error('that decision is not on the list.');
  return value as DecisionKey;
}

export type DecisionEffect = {
  decision: DecisionKey;
  status: 'approved' | 'waitlist' | 'declined';
  active: 0 | 1;
  conditionsNote: string;
  decisionNote: string;
};

/** Approve and approve-with-conditions are the only decisions that turn a storefront on. */
export function decisionEffect(decision: string, note: string): DecisionEffect {
  const key = assertDecision(decision);
  const text = note.trim();
  if (key === 'approve_conditions' && !text) {
    throw new Error('approve with conditions needs a note.');
  }
  const visible = key === 'approve' || key === 'approve_conditions';
  return {
    decision: key,
    status: visible ? 'approved' : key === 'waitlist' ? 'waitlist' : 'declined',
    active: visible ? 1 : 0,
    conditionsNote: key === 'approve_conditions' ? text : '',
    decisionNote: text,
  };
}

function hasWord(hay: string, word: string): boolean {
  if (word.includes(' ')) return hay.includes(word);
  return new RegExp(`(^|[^a-z])${word}s?([^a-z]|$)`).test(hay);
}

/** Hint only. The admin still sets each document. Sales tax is always on the hint list. */
export function documentHints(text: string): DocumentKey[] {
  const hay = text.toLowerCase();
  const hinted: DocumentKey[] = [];
  for (const hint of DOCUMENT_HINTS) {
    if (hint.words.some((word) => hasWord(hay, word))) hinted.push(hint.key);
  }
  if (!hinted.includes('sales_tax_license')) hinted.push('sales_tax_license');
  return hinted;
}

export function scoreLine(marks: { mark: string }[]): string {
  const pass = marks.filter((row) => row.mark === 'pass').length;
  const needs = marks.filter((row) => row.mark === 'needs_work').length;
  const no = marks.filter((row) => row.mark === 'no').length;
  const open = STANDARDS.length - pass - needs - no;
  const parts: string[] = [];
  if (pass) parts.push(`${pass} pass`);
  if (needs) parts.push(`${needs} needs work`);
  if (no) parts.push(`${no} no`);
  if (open) parts.push(`${open} not scored`);
  return parts.join(' · ') || 'not scored';
}

export type SalesWindow = { orders: number; merchandiseCents: number; totalCents: number };

export type LedgerOrder = {
  email: string;
  phone: string;
  name: string;
  merchandiseCents: number;
  totalCents: number;
  createdAt: string;
};

export type SalesReport = {
  allTime: SalesWindow;
  last7Days: SalesWindow;
  last30Days: SalesWindow;
};

export function parseSqlTime(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  const iso = trimmed.includes('T') ? trimmed : `${trimmed.replace(' ', 'T')}Z`;
  return Date.parse(iso);
}

export function inLastDays(createdAt: string, now: Date, days: number): boolean {
  const at = parseSqlTime(createdAt);
  if (!Number.isFinite(at)) return false;
  const start = now.getTime() - days * 24 * 60 * 60 * 1000;
  return at >= start && at <= now.getTime();
}

function sumOrders(orders: LedgerOrder[]): SalesWindow {
  return orders.reduce<SalesWindow>((total, order) => ({
    orders: total.orders + 1,
    merchandiseCents: total.merchandiseCents + order.merchandiseCents,
    totalCents: total.totalCents + order.totalCents,
  }), { orders: 0, merchandiseCents: 0, totalCents: 0 });
}

export function salesReport(orders: LedgerOrder[], now = new Date()): SalesReport {
  return {
    allTime: sumOrders(orders),
    last7Days: sumOrders(orders.filter((order) => inLastDays(order.createdAt, now, 7))),
    last30Days: sumOrders(orders.filter((order) => inLastDays(order.createdAt, now, 30))),
  };
}

export type ProductTally = { name: string; units: number; revenueCents: number };

export function rankProducts(items: { name: string; units: number; revenueCents: number }[], by: 'units' | 'revenue', limit = 5): ProductTally[] {
  const map = new Map<string, ProductTally>();
  for (const item of items) {
    const name = item.name.trim().toLowerCase() || 'untitled';
    const current = map.get(name) || { name, units: 0, revenueCents: 0 };
    current.units += item.units;
    current.revenueCents += item.revenueCents;
    map.set(name, current);
  }
  const ranked = [...map.values()];
  ranked.sort((a, b) => {
    if (by === 'units') return b.units - a.units || b.revenueCents - a.revenueCents || a.name.localeCompare(b.name);
    return b.revenueCents - a.revenueCents || b.units - a.units || a.name.localeCompare(b.name);
  });
  return ranked.slice(0, limit);
}

export function normEmail(email: string): string {
  const value = email.trim().toLowerCase();
  return value.includes('@') ? value : '';
}

export function normPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length === 10 ? digits : '';
}

export type RepeatBuyer = {
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalCents: number;
};

/** Two orders are the same shopper when they share an email or a phone. */
export function repeatBuyers(orders: LedgerOrder[]): RepeatBuyer[] {
  const parent = orders.map((_, index) => index);
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]];
      cursor = parent[cursor];
    }
    return cursor;
  };
  const unite = (a: number, b: number) => {
    const left = find(a);
    const right = find(b);
    if (left !== right) parent[right] = left;
  };
  const byEmail = new Map<string, number>();
  const byPhone = new Map<string, number>();
  orders.forEach((order, index) => {
    const email = normEmail(order.email);
    const phone = normPhone(order.phone);
    if (email) {
      const prev = byEmail.get(email);
      if (prev === undefined) byEmail.set(email, index);
      else unite(prev, index);
    }
    if (phone) {
      const prev = byPhone.get(phone);
      if (prev === undefined) byPhone.set(phone, index);
      else unite(prev, index);
    }
  });
  const groups = new Map<number, LedgerOrder[]>();
  orders.forEach((order, index) => {
    const root = find(index);
    const list = groups.get(root) || [];
    list.push(order);
    groups.set(root, list);
  });
  const buyers: RepeatBuyer[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const latest = [...list].sort((a, b) => parseSqlTime(b.createdAt) - parseSqlTime(a.createdAt))[0];
    const email = list.map((order) => normEmail(order.email)).find(Boolean) || '';
    const phone = list.map((order) => normPhone(order.phone)).find(Boolean) || '';
    buyers.push({
      name: latest?.name || '',
      email,
      phone,
      orders: list.length,
      totalCents: list.reduce((sum, order) => sum + order.totalCents, 0),
    });
  }
  buyers.sort((a, b) => b.orders - a.orders || b.totalCents - a.totalCents || a.email.localeCompare(b.email));
  return buyers;
}

export function validExpiry(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
