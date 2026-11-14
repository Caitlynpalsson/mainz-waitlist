// Cart grouping and fee math. This file is the source of truth.
// The Expo app imports it. Tests cover it. The worker uses it when a bag is quoted or saved.
// Stripe is not wired up yet. The fields are shaped so a later PaymentIntent can
// transfer `farmTransferCents` to each farm and keep the platform and delivery fees.

export type Fulfillment = 'pickup' | 'delivery';

export type IncomingItem = {
  farmId: number;
  productId: number;
  optionId: number | null;
  qty: number;
  unitPriceCents: number;
  name: string;
  optionLabel: string;
  unit: string;
};

export type PricedLine = IncomingItem & { lineCents: number };

export type PricedGroup = {
  farmId: number;
  fulfillment: Fulfillment;
  windowLabel: string;
  lines: PricedLine[];
  merchandiseCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  farmTransferCents: number;
};

export type Rates = {
  /** Basis points. 500 = 5%. Applied per farm sub-order, then summed. */
  platformFeeBps: number;
  /** Flat cents charged on a sub-order whose fulfillment is delivery. */
  deliveryFeeCents: number;
};

export type PricedOrder = {
  groups: PricedGroup[];
  merchandiseCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
};

/** A farm is on the public site only when Mainz has approved it and it is switched on. */
export function isShopVisible(status: string, active: number | boolean): boolean {
  return status === 'approved' && Number(active) === 1;
}

/** Merge duplicate product + option rows and drop non-positive quantities. Farm order follows first sighting. */
export function groupLines(items: IncomingItem[]): IncomingItem[][] {
  const order: number[] = [];
  const byFarm = new Map<number, IncomingItem[]>();
  for (const raw of items) {
    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    let list = byFarm.get(raw.farmId);
    if (!list) {
      list = [];
      byFarm.set(raw.farmId, list);
      order.push(raw.farmId);
    }
    const existing = list.find((line) => line.productId === raw.productId && line.optionId === raw.optionId);
    if (existing) existing.qty += qty;
    else list.push({ ...raw, qty });
  }
  return order.map((id) => byFarm.get(id)!);
}

export function priceGroups(
  groups: { farmId: number; fulfillment: Fulfillment; windowLabel: string; lines: IncomingItem[] }[],
  rates: Rates,
): PricedOrder {
  const priced: PricedGroup[] = groups.map((group) => {
    const lines = group.lines.map((line) => ({
      ...line,
      lineCents: line.unitPriceCents * line.qty,
    }));
    const merchandiseCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
    const deliveryFeeCents = group.fulfillment === 'delivery' ? rates.deliveryFeeCents : 0;
    const platformFeeCents = Math.round((merchandiseCents * rates.platformFeeBps) / 10_000);
    return {
      farmId: group.farmId,
      fulfillment: group.fulfillment,
      windowLabel: group.windowLabel,
      lines,
      merchandiseCents,
      deliveryFeeCents,
      platformFeeCents,
      farmTransferCents: merchandiseCents,
    };
  });
  const merchandiseCents = priced.reduce((sum, group) => sum + group.merchandiseCents, 0);
  const deliveryFeeCents = priced.reduce((sum, group) => sum + group.deliveryFeeCents, 0);
  const platformFeeCents = priced.reduce((sum, group) => sum + group.platformFeeCents, 0);
  return {
    groups: priced,
    merchandiseCents,
    deliveryFeeCents,
    platformFeeCents,
    totalCents: merchandiseCents + deliveryFeeCents + platformFeeCents,
  };
}
