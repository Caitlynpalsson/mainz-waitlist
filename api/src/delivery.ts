// Batched delivery routes. A route goes out only when it has enough orders.
// Times are America/Denver. Nothing here charges a card.

export const DELIVERY_ZONE = 'America/Denver';
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const PICKUP_ONLY_LINE = "we don't deliver there yet. pickup is ready when you are.";
export const SHORT_RUN_NOTE = "this route didn't fill. you can switch to pickup, or move to the next delivery. no delivery fee for a route that doesn't go out.";

export type RouteClock = {
  deliveryDay: number;
  cutoffDay: number;
  cutoffTime: string;
};

export type AreaRoute = RouteClock & {
  id: number;
  name: string;
  area: string[];
  active: boolean;
  minOrders: number;
  targetOrders: number;
};

export type RouteOffer = {
  matched: boolean;
  pickupOnly: boolean;
  line: string;
  routeId: number | null;
  runDate: string;
  name: string;
};

type Ymd = { year: number; month: number; day: number };

export function weekdayIndex(name: string): number {
  const key = name.trim().toLowerCase().slice(0, 3);
  const index = WEEKDAYS.indexOf(key as (typeof WEEKDAYS)[number]);
  if (index < 0) throw new Error('pick a day.');
  return index;
}

export function parseCutoffTime(raw: string): string {
  const text = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!text) throw new Error('add a cutoff time.');
  const pm = text.endsWith('pm');
  const am = text.endsWith('am');
  const clock = text.replace(/am|pm$/, '');
  const [hourRaw, minuteRaw] = clock.split(':');
  let hour = Number(hourRaw);
  const minute = minuteRaw == null || minuteRaw === '' ? 0 : Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('use a time like 6pm.');
  if (pm && hour < 12) hour += 12;
  if (am && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) throw new Error('use a time like 6pm.');
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatCutoffTime(hhmm: string): string {
  const [hourRaw, minuteRaw] = hhmm.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const shown = hour % 12 || 12;
  if (!minute) return `${shown}${suffix}`;
  return `${shown}:${String(minute).padStart(2, '0')}${suffix}`;
}

export function cleanRouteInput(raw: {
  name?: unknown;
  area?: unknown;
  deliveryDay?: unknown;
  cutoffDay?: unknown;
  cutoffTime?: unknown;
  minOrders?: unknown;
  targetOrders?: unknown;
  active?: unknown;
}): {
  name: string;
  area: string[];
  deliveryDay: number;
  cutoffDay: number;
  cutoffTime: string;
  minOrders: number;
  targetOrders: number;
  active: boolean;
  isSample: boolean;
} {
  const name = String(raw.name ?? '').trim().slice(0, 80);
  if (!name) throw new Error('the route needs a name.');
  const area = Array.isArray(raw.area) ? parseArea(raw.area.join(', ')) : parseArea(String(raw.area ?? ''));
  if (!area.length) throw new Error('add a zip or a town.');
  const deliveryDay = typeof raw.deliveryDay === 'number' ? raw.deliveryDay : weekdayIndex(String(raw.deliveryDay ?? ''));
  const cutoffDay = typeof raw.cutoffDay === 'number' ? raw.cutoffDay : weekdayIndex(String(raw.cutoffDay ?? ''));
  if (deliveryDay < 0 || deliveryDay > 6 || cutoffDay < 0 || cutoffDay > 6) throw new Error('pick a day.');
  const cutoffTime = parseCutoffTime(String(raw.cutoffTime ?? ''));
  const minOrders = raw.minOrders == null || raw.minOrders === '' ? 3 : Number(raw.minOrders);
  const targetOrders = raw.targetOrders == null || raw.targetOrders === '' ? 5 : Number(raw.targetOrders);
  if (!Number.isInteger(minOrders) || minOrders < 1 || minOrders > 50) throw new Error('min orders starts at 1.');
  if (!Number.isInteger(targetOrders) || targetOrders < 1 || targetOrders > 50) throw new Error('set a target.');
  const active = raw.active === undefined ? true : raw.active === true || raw.active === 1 || raw.active === '1';
  return { name, area, deliveryDay, cutoffDay, cutoffTime, minOrders, targetOrders, active, isSample: name.toLowerCase().startsWith('sample') };
}

export function parseArea(raw: string): string[] {
  const parts = raw.split(/[\n,]/).map((part) => part.trim().toLowerCase()).filter(Boolean);
  const cleaned = parts.map((part) => {
    if (/^\d{5}$/.test(part)) return part;
    return part.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 40);
}

export function parseAddress(line1: string, cityZip: string): { zip: string; town: string } {
  const blob = `${line1} ${cityZip}`.toLowerCase();
  const zip = (blob.match(/\b(\d{5})(?:-\d{4})?\b/) || [])[1] || '';
  const town = cityZip.toLowerCase()
    .replace(/\d{5}(?:-\d{4})?/g, '')
    .replace(/\b(ut|utah|usa)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { zip, town };
}

export function matchRoute(address: { zip: string; town: string }, routes: AreaRoute[]): AreaRoute | null {
  const active = routes.filter((route) => route.active);
  if (address.zip) {
    const byZip = active.find((route) => route.area.includes(address.zip));
    if (byZip) return byZip;
  }
  if (!address.town) return null;
  return active.find((route) => route.area.some((entry) => !/^\d{5}$/.test(entry) && entry === address.town)) || null;
}

export function deliveryFeeOnPlace(hasPaymentCode: boolean): 'held' | 'not_charged' {
  return hasPaymentCode ? 'held' : 'not_charged';
}

export function closeRunDecision(count: number, minOrders: number): 'confirmed' | 'short' {
  return count >= minOrders ? 'confirmed' : 'short';
}

export function waiveDeliveryFee(order: { merchandiseCents: number; platformFeeCents: number; deliveryFeeCents: number }): {
  deliveryFeeState: 'waived';
  deliveryFeeCents: number;
  quotedDeliveryFeeCents: number;
  totalCents: number;
} {
  return {
    deliveryFeeState: 'waived',
    deliveryFeeCents: 0,
    quotedDeliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.merchandiseCents + order.platformFeeCents,
  };
}

export function restoreDeliveryFee(order: { merchandiseCents: number; platformFeeCents: number; quotedDeliveryFeeCents: number }): {
  deliveryFeeState: 'not_charged';
  deliveryFeeCents: number;
  totalCents: number;
  routeStatus: 'pending_route';
} {
  return {
    deliveryFeeState: 'not_charged',
    deliveryFeeCents: order.quotedDeliveryFeeCents,
    totalCents: order.merchandiseCents + order.platformFeeCents + order.quotedDeliveryFeeCents,
    routeStatus: 'pending_route',
  };
}

export function runCountLabel(count: number, minOrders: number, targetOrders: number): string {
  return `${count} of ${minOrders} min, target ${targetOrders}`;
}

export function deliveryLine(runDate: string, route: RouteClock): string {
  const date = parseYmd(runDate);
  const weekday = weekdayOfYmd(date);
  return `delivers ${WEEKDAYS[weekday]}, ${MONTHS[date.month - 1]} ${date.day}. order by ${WEEKDAYS[route.cutoffDay]} ${formatCutoffTime(route.cutoffTime)}.`;
}

export function nextDelivery(route: RouteClock, now: Date): { runDate: string; cutoffAt: string; line: string } {
  const today = partsInZone(now, DELIVERY_ZONE);
  for (let add = 0; add < 21; add += 1) {
    const date = addCalendarDays(today, add);
    if (weekdayOfYmd(date) !== route.deliveryDay) continue;
    const cutoffAt = cutoffInstant(date, route);
    if (now.getTime() < cutoffAt.getTime()) {
      const runDate = ymd(date);
      return { runDate, cutoffAt: cutoffAt.toISOString(), line: deliveryLine(runDate, route) };
    }
  }
  throw new Error('no open delivery.');
}

export function followingRun(route: RouteClock, runDate: string): string {
  const date = parseYmd(runDate);
  const dayAfter = addCalendarDays(date, 1);
  const noon = zonedInstant(dayAfter.year, dayAfter.month, dayAfter.day, 12, 0);
  return nextDelivery(route, noon).runDate;
}

export function cutoffInstantForRun(runDate: string, route: RouteClock): Date {
  return cutoffInstant(parseYmd(runDate), route);
}

export function offerForAddress(address: { zip: string; town: string }, routes: AreaRoute[], now: Date): RouteOffer {
  if (!address.zip && address.town.length < 4) {
    return { matched: false, pickupOnly: false, line: '', routeId: null, runDate: '', name: '' };
  }
  const route = matchRoute(address, routes);
  if (!route) {
    return { matched: false, pickupOnly: true, line: PICKUP_ONLY_LINE, routeId: null, runDate: '', name: '' };
  }
  const next = nextDelivery(route, now);
  return { matched: true, pickupOnly: false, line: next.line, routeId: route.id, runDate: next.runDate, name: route.name };
}

export type SheetStop = {
  name: string;
  address: string;
  phone: string;
  items: { qty: number; name: string }[];
  pickups: string[];
  note: string;
};

export function partnerSheet(run: { name: string; runDate: string; status: string }, stops: SheetStop[]): string {
  const date = parseYmd(run.runDate);
  const when = `${WEEKDAYS[weekdayOfYmd(date)]}, ${MONTHS[date.month - 1]} ${date.day}`;
  const head = `${run.name.trim().toLowerCase()} · ${when} · ${run.status}`;
  const blocks = stops.map((stop) => [
    stop.name.trim().toLowerCase(),
    stop.address.trim().toLowerCase(),
    stop.phone.trim(),
    ...stop.items.map((item) => `${item.qty} ${item.name.trim().toLowerCase()}`),
    ...stop.pickups.map((pickup) => `pickup: ${pickup.trim().toLowerCase()}`),
    stop.note.trim() ? `note: ${stop.note.trim().toLowerCase()}` : '',
  ].filter(Boolean).join('\n'));
  return [head, ...blocks].filter(Boolean).join('\n\n');
}

function cutoffInstant(delivery: Ymd, route: RouteClock): Date {
  const [hour, minute] = route.cutoffTime.split(':').map(Number);
  for (let back = 0; back < 7; back += 1) {
    const candidate = addCalendarDays(delivery, -back);
    if (weekdayOfYmd(candidate) !== route.cutoffDay) continue;
    return zonedInstant(candidate.year, candidate.month, candidate.day, hour, minute);
  }
  return zonedInstant(delivery.year, delivery.month, delivery.day, hour, minute);
}

function ymd(date: Ymd): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function parseYmd(value: string): Ymd {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function weekdayOfYmd(date: Ymd): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function addCalendarDays(date: Ymd, add: number): Ymd {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + add));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function partsInZone(date: Date, timeZone: string): Ymd & { hour: number; minute: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    weekday,
  };
}

export function zonedInstant(year: number, month: number, day: number, hour: number, minute: number, timeZone = DELIVERY_ZONE): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let i = 0; i < 4; i += 1) {
    const parts = partsInZone(new Date(guess), timeZone);
    const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const delta = shown - desired;
    if (delta === 0) return new Date(guess);
    guess -= delta;
  }
  return new Date(guess);
}
