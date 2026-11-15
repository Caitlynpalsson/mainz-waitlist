// A farm's own pickup options. Phone numbers are never kept or shown.
// Nearest-stop ranking uses the bundled Utah ZIP centroids. No outside map service.
import places from '../data/utah-places.json' with { type: 'json' };

type LatLng = { lat: number; lng: number };
const zipRows = (places as { zips: { n: string; lat: number; lng: number }[] }).zips;

export type PickupOption = {
  name: string;
  address: string;
  /** ZIP centroid used to rank the stop. Optional lat/lng overrides it. */
  zip: string;
  lat: number | null;
  lng: number | null;
  schedule: string;
  windows: string[];
  cutoff: string;
  feeCents: number;
  minimumCents: number | null;
};

export type FarmFulfillment = {
  offersDelivery: boolean;
  options: PickupOption[];
};

const PHONE = /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}\b/g;

export function stripPhone(raw: string): string {
  return raw.replace(PHONE, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
}

export function parseFulfillment(raw: unknown): FarmFulfillment {
  if (raw == null || raw === '') return { offersDelivery: false, options: [] };
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return { offersDelivery: false, options: [] };
    }
  }
  if (!value || typeof value !== 'object') return { offersDelivery: false, options: [] };
  const record = value as { offersDelivery?: unknown; options?: unknown };
  const options = Array.isArray(record.options) ? record.options.map(readOption).filter((option) => option.name) : [];
  return { offersDelivery: record.offersDelivery === true, options };
}

const DAY = {
  sunday: 'sun',
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
} as Record<string, string>;

export function digitsZip(raw: string): string {
  const found = raw.match(/\b(\d{5})\b/);
  if (found) return found[1];
  return raw.replace(/\D/g, '').slice(0, 5);
}

export function pickupChoiceLabel(option: PickupOption): string {
  const when = option.windows.length ? option.windows.join(', ') : option.schedule;
  return [option.name, when].filter(Boolean).join(' · ').toLowerCase();
}

/** One line for the selected stop. Lowercase, no street, no phone. */
export function pickupCardLine(option: PickupOption): string {
  const schedule = option.schedule.toLowerCase();
  const day = DAY[schedule] || schedule;
  const time = option.windows.join(' and ').toLowerCase();
  const when = [day, time].filter(Boolean).join(' ');
  const town = townFromAddress(option.address).toLowerCase().replace(/ city$/, '');
  const place = [option.name, town].filter(Boolean).join(', ').toLowerCase();
  return [`pick up ${when}`.trim(), place, option.cutoff.toLowerCase()].filter(Boolean).join(' · ');
}

/** Nearest first. Same distance keeps the original order. Unknown zips are left out. */
export function orderPickupOptions(options: PickupOption[], shopperZip: string): PickupOption[] {
  const shopper = zipPoint(digitsZip(shopperZip));
  if (!shopper) return [];
  return options
    .map((option, index) => {
      const point = optionPoint(option);
      return { option, index, miles: point ? haversineMiles(shopper, point) : Number.POSITIVE_INFINITY };
    })
    .filter((row) => row.miles < Number.POSITIVE_INFINITY)
    .sort((a, b) => a.miles - b.miles || a.index - b.index)
    .map((row) => row.option);
}

export function defaultFulfillment(hasPickupOptions: boolean, offersDelivery: boolean): 'pickup' | 'delivery' {
  if (hasPickupOptions) return 'pickup';
  return offersDelivery ? 'delivery' : 'pickup';
}

/** The delivery fee is shown only after the shopper has chosen delivery and a route covers the zip. */
export function showDeliveryFee(fulfillment: 'pickup' | 'delivery', routeMatched: boolean): boolean {
  return fulfillment === 'delivery' && routeMatched;
}

export function townFromAddress(address: string): string {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2];
  if (parts.length === 2) return parts[1].replace(/\b[A-Za-z]{2}\b/, '').replace(/\d{5}(?:-\d{4})?/, '').trim();
  return '';
}

/** What checkout shows for one pickup stop: name, day, windows, town, cutoff. */
export function describePickupChoice(option: PickupOption): { label: string; lines: string[] } {
  const when = [option.schedule, option.windows.join(' and '), townFromAddress(option.address)].filter(Boolean).join(' · ');
  const lines = [option.name.toLowerCase()];
  if (when) lines.push(when.toLowerCase());
  if (option.cutoff) lines.push(option.cutoff.toLowerCase());
  return { label: pickupChoiceLabel(option), lines };
}

/**
 * Address and the delivery fee belong to delivery.
 * Delivery itself is offered only after a Mainz route covers the zip.
 */
export function checkoutVisibility(input: { fulfillment: 'pickup' | 'delivery'; routeMatched: boolean; zipEntered: boolean }) {
  const delivering = showDeliveryFee(input.fulfillment, input.routeMatched);
  return {
    showZip: true,
    showToggle: input.routeMatched,
    showStreet: delivering,
    showDeliveryFee: delivering,
    showPickupCard: input.fulfillment === 'pickup' && input.zipEntered,
    offerDelivery: input.routeMatched,
  };
}

export function shownCheckoutTotals<T extends { deliveryFeeCents: number; totalCents: number }>(money: T, showDeliveryFee: boolean): T {
  if (showDeliveryFee) return money;
  return { ...money, deliveryFeeCents: 0, totalCents: money.totalCents - money.deliveryFeeCents };
}

export function renderPickupOption(option: PickupOption): string[] {
  const lines = [option.name];
  if (option.address) lines.push(option.address);
  if (option.schedule) lines.push(option.schedule);
  if (option.windows.length) lines.push(option.windows.join(', '));
  if (option.cutoff) lines.push(option.cutoff);
  lines.push(option.feeCents > 0 ? `$${(option.feeCents / 100).toFixed(2)}` : 'free');
  if (option.minimumCents && option.minimumCents > 0) lines.push(`minimum $${(option.minimumCents / 100).toFixed(2)}`);
  return lines.map((line) => line.toLowerCase());
}

/** Mainz delivery is offered only when a route covers the shopper's zip. */
export function deliveryOffered(routeMatched: boolean): boolean {
  return routeMatched === true;
}

export function checkoutChoices(options: PickupOption[], routeMatched: boolean): { pickup: string[]; delivery: boolean } {
  return {
    pickup: options.map(pickupChoiceLabel),
    delivery: deliveryOffered(routeMatched),
  };
}

function readOption(raw: unknown): PickupOption {
  const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const windows = Array.isArray(item.windows) ? item.windows.map((window) => stripPhone(String(window))).filter(Boolean) : [];
  const fee = Number(item.feeCents);
  const minimum = item.minimumCents == null || item.minimumCents === '' ? null : Number(item.minimumCents);
  const address = stripPhone(String(item.address ?? ''));
  const lat = finiteCoord(item.lat);
  const lng = finiteCoord(item.lng);
  return {
    name: stripPhone(String(item.name ?? '')),
    address,
    zip: digitsZip(String(item.zip ?? '')) || digitsZip(address),
    lat,
    lng,
    schedule: stripPhone(String(item.schedule ?? '')),
    windows,
    cutoff: stripPhone(String(item.cutoff ?? '')),
    feeCents: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
    minimumCents: minimum != null && Number.isFinite(minimum) && minimum > 0 ? Math.round(minimum) : null,
  };
}

function finiteCoord(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function zipPoint(zip: string): LatLng | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const row = zipRows.find((item) => item.n === zip);
  return row ? { lat: row.lat, lng: row.lng } : null;
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.7613 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function optionPoint(option: PickupOption): LatLng | null {
  if (option.lat != null && option.lng != null) return { lat: option.lat, lng: option.lng };
  return zipPoint(option.zip);
}
