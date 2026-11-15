// A farm's own pickup options. Phone numbers are never kept or shown.

export type PickupOption = {
  name: string;
  address: string;
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

export function pickupChoiceLabel(option: PickupOption): string {
  const when = option.windows.length ? option.windows.join(', ') : option.schedule;
  return [option.name, when].filter(Boolean).join(' · ').toLowerCase();
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
  return {
    name: stripPhone(String(item.name ?? '')),
    address: stripPhone(String(item.address ?? '')),
    schedule: stripPhone(String(item.schedule ?? '')),
    windows,
    cutoff: stripPhone(String(item.cutoff ?? '')),
    feeCents: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
    minimumCents: minimum != null && Number.isFinite(minimum) && minimum > 0 ? Math.round(minimum) : null,
  };
}
