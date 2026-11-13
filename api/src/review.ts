// The approval desk. Edit these lists when the process changes.
// Stages, standards, documents, goal times, and message templates live here.
// Source: the owner's farm approval process, November 13, 2026.

export const PIPELINE_STAGES = [
  { key: 'application_received', label: 'application received', goal: 'reply within 24 hours', clock: 'received', amount: 24, unit: 'hours' },
  { key: 'quick_screen', label: 'quick screen', goal: 'within 2 days', clock: 'received', amount: 2, unit: 'days' },
  { key: 'intro_call', label: 'intro call or dm', goal: 'within 5 days', clock: 'received', amount: 5, unit: 'days' },
  { key: 'documents', label: 'documents', goal: 'farm sends within 7 days', clock: 'stage', amount: 7, unit: 'days' },
  { key: 'sample_review', label: 'sample or photo review', goal: 'within 3 days of receiving', clock: 'sample', amount: 3, unit: 'days' },
  { key: 'score', label: 'score the mainz standard', goal: 'same day as the review', clock: 'review', amount: 0, unit: 'days' },
  { key: 'decision', label: 'decision', goal: 'within 10 days of applying', clock: 'received', amount: 10, unit: 'days' },
  { key: 'onboarding', label: 'onboarding', goal: 'live within 2 weeks of approval', clock: 'approved', amount: 14, unit: 'days' },
  { key: 'ongoing', label: 'ongoing checks', goal: 'every week and every quarter', clock: 'ongoing', amount: 7, unit: 'days' },
] as const;

/** Older stage keys, so a row saved before this list still opens. */
export const STAGE_ALIASES: Record<string, (typeof PIPELINE_STAGES)[number]['key']> = {
  new: 'application_received',
  screening: 'quick_screen',
  call: 'intro_call',
  docs: 'documents',
  sample: 'sample_review',
};

export const STANDARDS = [
  { key: 'quality', label: 'quality', look: 'product condition, consistency, and what customers already say. sample, photos, or reviews.' },
  { key: 'transparency', label: 'transparency', look: 'where the food comes from and how it is grown. the call, photos, instagram, or website.' },
  { key: 'food_safety', label: 'food safety', look: 'licenses, handling, labels, and cold chain. documents from the request list.' },
  { key: 'accessibility', label: 'accessibility', look: 'clear prices and everyday items, not only specialties. compare with local markets.' },
  { key: 'reliability', label: 'reliability', look: 'stock tracking and whether orders get filled. the call, and a reference if you have one.' },
] as const;

export const SCORE_READING = [
  'all five pass: approve.',
  'food safety pass, and one or two needs work: approve with conditions.',
  'a great fit, but timing, location, or the category is full: waitlist.',
  'food safety is a no: decline for now, or waitlist until the license is in.',
  'two or more no: decline kindly.',
];

export const SCORE_MARKS = [
  { key: 'pass', label: 'pass' },
  { key: 'needs_work', label: 'needs work' },
  { key: 'no', label: 'no' },
] as const;

export const DOCUMENTS = [
  { key: 'business_info', label: 'farm name and address' },
  { key: 'sales_tax_license', label: 'sales tax license' },
  { key: 'produce_safety', label: 'produce safety result' },
  { key: 'cottage_food', label: 'cottage food registration' },
  { key: 'food_handler', label: 'food handler permit' },
  { key: 'egg_license', label: 'egg license or udaf notice' },
  { key: 'raw_milk_permit', label: 'raw milk permit' },
  { key: 'meat_inspection', label: 'meat inspection' },
  { key: 'beekeeper_registration', label: 'beekeeper registration' },
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

/** Words that suggest a document. Name, address, and sales tax are hinted for every farm. */
export const DOCUMENT_HINTS: { key: (typeof DOCUMENTS)[number]['key']; words: string[] }[] = [
  { key: 'produce_safety', words: ['produce', 'peach', 'peaches', 'apple', 'apples', 'tomato', 'tomatoes', 'lettuce', 'carrot', 'carrots', 'vegetable', 'fruit'] },
  { key: 'cottage_food', words: ['bread', 'jam', 'jelly', 'cookie', 'cake', 'granola', 'pickle', 'salsa', 'baked', 'cottage', 'honey', 'loaf', 'muffin', 'pie', 'homemade'] },
  { key: 'food_handler', words: ['bread', 'jam', 'jelly', 'cookie', 'cake', 'granola', 'cottage', 'honey', 'homemade'] },
  { key: 'beekeeper_registration', words: ['honey', 'beekeeper', 'hive', 'apiary'] },
  { key: 'egg_license', words: ['egg'] },
  { key: 'raw_milk_permit', words: ['raw milk', 'unpasteurized'] },
  { key: 'meat_inspection', words: ['beef', 'pork', 'lamb', 'bison', 'meat', 'chicken', 'turkey', 'poultry'] },
];

/** Raw milk and Homemade Food Act / cottage food stay off until Mainz verifies the matching document. */
export const UDAF_TYPES = [
  { key: 'raw_milk', label: 'needs UDAF check', detail: 'raw milk', document: 'raw_milk_permit', words: ['raw milk', 'unpasteurized'] },
  { key: 'homemade', label: 'needs UDAF check', detail: 'homemade food act / cottage food', document: 'cottage_food', words: ['bread', 'jam', 'jelly', 'cookie', 'cake', 'granola', 'pickle', 'salsa', 'cottage', 'honey', 'loaf', 'muffin', 'pie', 'dried herb', 'homemade'] },
] as const;

export const QUICK_SCREEN = [
  { key: 'local', title: 'is it local?', lines: ['utah county first, especially spanish fork.', 'nearby counties can wait for later.'] },
  { key: 'real', title: 'is it real?', lines: ['instagram or a website with real photos of the farm, animals, or food.', 'the phone and email work.', 'they already sell somewhere: a market, a stand, or a csa.'] },
  { key: 'fit', title: 'does it fit?', lines: ['they grow, raise, or make food that fits eating clean.', 'it is something customers want.', 'if we already have plenty of this, the waitlist is the right spot.'] },
];

export const CALL_OPENING = "hi [first name], it's caty from mainz! thanks for making time. i'd love to hear about your farm and what you grow. then i'll share how mainz works. sound good?";

export const CALL_QUESTIONS = [
  'tell me the story of your farm. how did you get started?',
  'what do you grow, raise, or make?',
  'how do you grow it? sprays, feeds, or a certification you are proud of?',
  'where do you sell now? how is that going?',
  'how much can you usually supply each week? does it change by season?',
  'how do you keep track of what you have in stock?',
  'pickup, delivery, or both? where would pickup happen?',
  'how do you price your products? everyday items as well as specialties?',
  'what licenses or permits do you have for what you sell?',
  'what would make mainz a win for you?',
];

export const CALL_SHARE = [
  'you set your own products and prices.',
  'you choose pickup, delivery, or both.',
  'mainz keeps a small transaction fee. delivery orders also have a delivery fee.',
  'we take your product photos and set up your storefront for you.',
];

export const ONBOARDING_ITEMS = [
  { key: 'welcome_call', label: 'welcome call' },
  { key: 'photos', label: 'photos shot' },
  { key: 'catalog', label: 'catalog uploaded and approved by the farmer' },
  { key: 'pickup', label: 'pickup set up' },
  { key: 'delivery', label: 'delivery set up, if they offer it' },
  { key: 'stock', label: 'stock update routine agreed' },
  { key: 'test_order', label: 'test order completed' },
  { key: 'payout', label: 'payout method agreed (stripe later)' },
  { key: 'documents', label: 'documents saved, with expiration dates' },
  { key: 'live', label: 'storefront live and announced' },
] as const;

export const WEEKLY_CHECKS = [
  'ratings and reviews',
  'order accuracy',
  'on-time pickup and delivery',
  'out of stock cancellations',
  'any complaints',
];

export const QUARTERLY_STEPS = [
  'score the five standards again',
  'check that licenses are current and note new expiration dates',
  'ask for fresh photos or a sample',
  'a short check-in call',
];

export const TEMPLATES = [
  { key: 'thanks', label: 'thanks for applying', text: "hi [first name]! thank you so much for applying to mainz. we got your application for [farm name] and we're excited to learn more. here's what happens next: we'll take a quick look, then reach out to set up a short chat. you'll hear from us within a few days. talk soon! caty, mainz" },
  { key: 'documents', label: 'document request', text: "hi [first name]! loved chatting with you. here's the short list we need for [farm name]: [list items]. a photo or pdf of each is perfect. if anything is in progress, just let us know where you're at. we're happy to help point you to the right place. thank you!" },
  { key: 'sample', label: 'sample or photos', text: "hi [first name]! next up is the fun part. could you drop off a sample of [product] or send a few photos? we'd love to see it the way a customer would get it, plus the label up close. thank you!" },
  { key: 'approve', label: 'approve', text: "hi [first name]! great news. [farm name] is approved for mainz! we loved learning about your farm and we think our customers will too. next step is onboarding. we'll set up a time to shoot photos and build your storefront together. welcome to mainz!" },
  { key: 'approve_conditions', label: 'approve with conditions', text: "hi [first name]! we're excited to bring [farm name] onto mainz. before your storefront goes live, we'd love to get [condition]. once we have that, we'll jump right into onboarding. let us know if we can help with anything!" },
  { key: 'waitlist', label: 'waitlist', text: "hi [first name]! thank you for applying to mainz. we really enjoyed getting to know [farm name]. right now we're [reason]. we'd love to keep you on our list and reach out as we grow. we'll check back in by [month]." },
  { key: 'decline', label: 'decline', text: "hi [first name]! thank you so much for applying to mainz and for sharing your farm with us. right now we're not able to offer a storefront for [farm name]. [reason]. we'd love to hear from you again if things change. wishing you a great season!" },
  { key: 'check_in', label: 'weekly check-in', text: "hi [first name]! quick check-in from mainz. we noticed [what we saw]. we know things get busy! could we hop on a quick call to figure out a plan together?" },
  { key: 'pause', label: 'pause', text: "hi [first name], we're pausing [farm name]'s storefront for now while we sort out [reason]. this just hides your shop until things are ready again. here's what we need to turn it back on: [steps]. we're here to help!" },
  { key: 'remove', label: 'remove', text: "hi [first name], thank you for being part of mainz. after [reason], we've decided to close [farm name]'s storefront. we're grateful for the time we worked together. any open orders will be [plan]. wishing you all the best." },
] as const;

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

export function canonicalStage(value: string): StageKey {
  if (isStage(value)) return value;
  return STAGE_ALIASES[value] || 'application_received';
}

export function assertStage(value: string): StageKey {
  if (isStage(value)) return value;
  const alias = STAGE_ALIASES[value];
  if (alias) return alias;
  throw new Error('that stage is not on the list.');
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

/**
 * Approve and approve-with-conditions mark the farm approved and start onboarding.
 * The storefront stays off until go-live. Waitlist and decline stay hidden.
 */
export function decisionEffect(decision: string, note: string): DecisionEffect {
  const key = assertDecision(decision);
  const text = note.trim();
  if (key === 'approve_conditions' && !text) {
    throw new Error('approve with conditions needs a note.');
  }
  const approved = key === 'approve' || key === 'approve_conditions';
  return {
    decision: key,
    status: approved ? 'approved' : key === 'waitlist' ? 'waitlist' : 'declined',
    active: 0,
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
  if (!hinted.includes('business_info')) hinted.unshift('business_info');
  if (!hinted.includes('sales_tax_license')) hinted.push('sales_tax_license');
  return hinted;
}

export type UdafType = (typeof UDAF_TYPES)[number];

/** Raw milk, or cottage / Homemade Food Act food. Null for ordinary produce, eggs, and meat. */
export function udafType(text: string): UdafType | null {
  const hay = text.toLowerCase();
  for (const type of UDAF_TYPES) {
    if (type.words.some((word) => (word.includes(' ') ? hay.includes(word) : hasWord(hay, word)))) return type;
  }
  if (/(^|[^a-z])honey([^a-z]|$)/.test(hay) && !hay.includes('honeydew')) {
    return UDAF_TYPES.find((type) => type.key === 'homemade') || null;
  }
  return null;
}

/** Hidden from shoppers until Mainz has verified the document and turned the item on. */
export function shopperCanSeeProduct(product: { active: boolean | number; needsUdaf: boolean | number; udafOn: boolean | number }): boolean {
  if (!Number(product.active)) return false;
  if (Number(product.needsUdaf) && !Number(product.udafOn)) return false;
  return true;
}

export function canTurnUdafOn(documentStatus: string): boolean {
  return documentStatus === 'verified';
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

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type FarmClock = {
  stage: string;
  receivedAt: string;
  stageEnteredAt: string;
  sampleReceivedAt: string;
  reviewCompletedAt: string;
  approvedAt: string;
  liveAt: string;
  lastWeeklyAt: string;
  lastRecheckAt: string;
  decided: boolean;
};

export type DueState = {
  dueAt: string | null;
  overdue: boolean;
  waiting: string;
  quarterlyDueAt: string | null;
  quarterlyOverdue: boolean;
};

function plus(value: string, ms: number): string | null {
  const at = parseSqlTime(value);
  if (!Number.isFinite(at)) return null;
  return new Date(at + ms).toISOString();
}

function endOfUtcDay(value: string): string | null {
  const at = parseSqlTime(value);
  if (!Number.isFinite(at)) return null;
  const date = new Date(at);
  date.setUTCHours(23, 59, 59, 0);
  return date.toISOString();
}

function past(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && at < now.getTime();
}

/** Due date for the stage the farm is in now. Overdue is that date in the past. */
export function stageDue(clock: FarmClock, now = new Date()): DueState {
  const stage = canonicalStage(clock.stage);
  const spec = PIPELINE_STAGES.find((item) => item.key === stage);
  const empty: DueState = { dueAt: null, overdue: false, waiting: '', quarterlyDueAt: null, quarterlyOverdue: false };
  if (!spec) return empty;
  if (stage === 'decision' && clock.decided) return empty;
  let dueAt: string | null = null;
  let waiting = '';
  let quarterlyDueAt: string | null = null;
  const span = spec.unit === 'hours' ? spec.amount * HOUR : spec.amount * DAY;
  if (spec.clock === 'received') dueAt = plus(clock.receivedAt, span);
  if (spec.clock === 'stage') {
    if (!clock.stageEnteredAt) waiting = 'the 7 days start when you ask for the documents.';
    else dueAt = plus(clock.stageEnteredAt, span);
  }
  if (spec.clock === 'sample') {
    if (!clock.sampleReceivedAt) waiting = 'waiting on the sample or the photos.';
    else dueAt = plus(clock.sampleReceivedAt, span);
  }
  if (spec.clock === 'review') {
    const base = clock.reviewCompletedAt || clock.stageEnteredAt;
    if (!base) waiting = 'same day as the review.';
    else dueAt = endOfUtcDay(base);
  }
  if (spec.clock === 'approved') {
    if (!clock.approvedAt) waiting = 'starts when the farm is approved.';
    else dueAt = plus(clock.approvedAt, span);
  }
  if (spec.clock === 'ongoing') {
    const weeklyBase = clock.lastWeeklyAt || clock.liveAt;
    const quarterBase = clock.lastRecheckAt || clock.liveAt;
    if (!weeklyBase && !quarterBase) waiting = 'starts when the storefront goes live.';
    dueAt = weeklyBase ? plus(weeklyBase, 7 * DAY) : null;
    quarterlyDueAt = quarterBase ? plus(quarterBase, 90 * DAY) : null;
  }
  const quarterlyOverdue = past(quarterlyDueAt, now);
  const overdue = past(dueAt, now) || quarterlyOverdue;
  return { dueAt, overdue, waiting, quarterlyDueAt, quarterlyOverdue };
}

export type TemplateFields = {
  firstName?: string;
  farmName?: string;
  condition?: string;
  reason?: string;
  month?: string;
  items?: string;
  product?: string;
  steps?: string;
  plan?: string;
  saw?: string;
};

export function fillTemplate(text: string, fields: TemplateFields): string {
  const map: Record<string, string> = {
    '[first name]': fields.firstName || '[first name]',
    '[farm name]': fields.farmName || '[farm name]',
    '[condition]': fields.condition || '[condition]',
    '[reason]': fields.reason || '[reason]',
    '[month]': fields.month || '[month]',
    '[list items]': fields.items || '[list items]',
    '[product]': fields.product || '[product]',
    '[steps]': fields.steps || '[steps]',
    '[plan]': fields.plan || '[plan]',
    '[what we saw]': fields.saw || '[what we saw]',
  };
  return Object.entries(map).reduce((out, [token, value]) => out.split(token).join(value), text);
}

export function validExpiry(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
