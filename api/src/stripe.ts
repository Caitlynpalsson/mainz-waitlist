/**
 * Stripe test-mode client and the transfer split.
 * PLATFORM_FEE_PERCENT and PLATFORM_FEE_FLAT_CENTS are read only by readConnectFee.
 * They do not change the fee shown at checkout.
 */

export type ConnectFee = { percent: number; flatCents: number };

export function assertStripeTestKey(key: string | undefined | null): string {
  const value = String(key || '').trim();
  if (!value.startsWith('sk_test_')) throw new Error('stripe test key required');
  return value;
}

export function readConnectFee(env: { PLATFORM_FEE_PERCENT?: string; PLATFORM_FEE_FLAT_CENTS?: string }): ConnectFee {
  const percent = Number(env.PLATFORM_FEE_PERCENT ?? '0');
  const flat = Number(env.PLATFORM_FEE_FLAT_CENTS ?? '0');
  return {
    percent: Number.isFinite(percent) && percent >= 0 ? percent : 0,
    flatCents: Number.isFinite(flat) && flat >= 0 ? Math.round(flat) : 0,
  };
}

/** Fee held back from one farm's food subtotal. Clamped so a transfer is never negative. */
export function connectPlatformFeeCents(subtotalCents: number, fee: ConnectFee): number {
  const base = Math.max(0, Math.round(subtotalCents));
  const percentPart = Math.round((base * fee.percent) / 100);
  return Math.max(0, Math.min(base, percentPart + Math.max(0, fee.flatCents)));
}

export function farmTransferAmountCents(merchandiseCents: number, fee: ConnectFee): number {
  return Math.max(0, Math.round(merchandiseCents) - connectPlatformFeeCents(merchandiseCents, fee));
}

export type FarmShare = {
  orderFarmId: number;
  farmId: number;
  merchandiseCents: number;
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export type PlannedTransfer = {
  orderFarmId: number;
  farmId: number;
  amountCents: number;
  accountId: string;
  status: 'ready' | 'pending';
};

export function planFarmTransfers(shares: FarmShare[], fee: ConnectFee): PlannedTransfer[] {
  return shares.map((share) => {
    const amountCents = farmTransferAmountCents(share.merchandiseCents, fee);
    const ready = amountCents > 0 && !!share.accountId && share.chargesEnabled && share.payoutsEnabled;
    return {
      orderFarmId: share.orderFarmId,
      farmId: share.farmId,
      amountCents,
      accountId: share.accountId || '',
      status: ready ? 'ready' : 'pending',
    };
  });
}

export type TransferAction =
  | { kind: 'skip'; orderFarmId: number }
  | {
    kind: 'record';
    orderFarmId: number;
    farmId: number;
    amountCents: number;
    accountId: string;
    transferGroup: string;
    send: boolean;
  };

export function transferActions(
  existing: { orderFarmId: number; status: string; stripeTransferId: string }[],
  planned: PlannedTransfer[],
  transferGroup: string,
): TransferAction[] {
  const byId = new Map(existing.map((row) => [row.orderFarmId, row]));
  return planned.map((plan) => {
    const row = byId.get(plan.orderFarmId);
    if (row && (row.status === 'transferred' || row.stripeTransferId)) {
      return { kind: 'skip', orderFarmId: plan.orderFarmId };
    }
    return {
      kind: 'record',
      orderFarmId: plan.orderFarmId,
      farmId: plan.farmId,
      amountCents: plan.amountCents,
      accountId: plan.accountId,
      transferGroup,
      send: plan.status === 'ready' && plan.amountCents > 0,
    };
  });
}

export function safeReturnUrl(value: unknown): string {
  const raw = String(value || '').trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('return url required');
  }
  if (url.username || url.password) throw new Error('return url required');
  if (url.protocol === 'https:') return url.toString();
  if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.toString();
  throw new Error('return url required');
}

export function safeOrigin(value: unknown): string {
  return new URL(safeReturnUrl(value)).origin;
}

export const CONNECT_SITE = 'https://www.themaincoursemarket.com';
export const PAYOUT_DESCRIPTOR = 'MAINCOURSE';
/** Accounts v2. `2025-11-17.clover` 404s on this sandbox. */
export const STRIPE_V2_VERSION = '2025-11-17.preview';

/**
 * Express dashboard, Stripe-hosted onboarding, separate charges and transfers.
 * Express on this sandbox requires fees_collector and losses_collector to both be
 * application, so the platform pays Stripe's fees and covers negative balances.
 * card_payments plus stripe_transfers is what a farm needs to be paid by transfer.
 * The site url is not accepted on identity.business_details. It is set with the v1
 * business_profile[url] update. No `type`, no `on_behalf_of`, no phone.
 */
export function v2AccountBody(input: { email?: string; name?: string; listingToken: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {
    display_name: (input.name || 'the main course farm').replace(/\s+/g, ' ').trim().slice(0, 100),
    dashboard: 'express',
    identity: { country: 'us' },
    defaults: {
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    configuration: {
      merchant: { capabilities: { card_payments: { requested: true } } },
      recipient: {
        capabilities: {
          stripe_balance: { stripe_transfers: { requested: true } },
        },
      },
    },
    metadata: {
      listing_token: input.listingToken.slice(0, 80),
      sample: 'mainz-preview',
    },
  };
  const email = (input.email || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) body.contact_email = email.slice(0, 120);
  return body;
}

export function payoutScheduleFields(): Record<string, string> {
  return {
    'settings[payouts][schedule][interval]': 'weekly',
    'settings[payouts][schedule][weekly_anchor]': 'monday',
    'settings[payouts][statement_descriptor]': PAYOUT_DESCRIPTOR,
    'settings[payouts][debit_negative_balances]': 'true',
    'business_profile[url]': CONNECT_SITE,
  };
}

export function accountLinkFields(input: { accountId: string; returnUrl: string; refreshUrl: string }): Record<string, string> {
  return {
    account: input.accountId,
    refresh_url: safeReturnUrl(input.refreshUrl),
    return_url: safeReturnUrl(input.returnUrl),
    type: 'account_onboarding',
  };
}

export function checkoutSessionFields(input: {
  orderPublicId: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}): Record<string, string> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50) throw new Error('amount too small');
  return {
    mode: 'payment',
    success_url: safeReturnUrl(input.successUrl),
    cancel_url: safeReturnUrl(input.cancelUrl),
    client_reference_id: input.orderPublicId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(input.amountCents),
    'line_items[0][price_data][product_data][name]': 'the main course order',
    'payment_intent_data[transfer_group]': input.orderPublicId,
    'payment_intent_data[metadata][order_id]': input.orderPublicId,
    'metadata[order_id]': input.orderPublicId,
    'payment_method_types[0]': 'card',
    'payment_method_types[1]': 'link',
  };
}

export function transferDescription(farmName: string, orderId: string): string {
  const name = farmName.replace(/\s+/g, ' ').trim() || 'farm';
  return `${name}, order ${orderId}`.slice(0, 350);
}

export function transferFields(input: {
  amountCents: number;
  destination: string;
  transferGroup: string;
  orderFarmId: number;
  farmName?: string;
}): Record<string, string> {
  return {
    amount: String(input.amountCents),
    currency: 'usd',
    destination: input.destination,
    transfer_group: input.transferGroup,
    description: transferDescription(input.farmName || 'farm', input.transferGroup),
    'metadata[order_farm_id]': String(input.orderFarmId),
  };
}

/** A refund or dispute should touch only the farm it belongs to. A full order amount reverses each farm on that order, and no one else. */
export function reversalTargets(input: {
  amount: number;
  orderTotal: number;
  orderFarmId?: string;
  farms: { orderFarmId: number; transferId: string; merchandiseCents: number; shopperCents: number; reversed: boolean }[];
}): { orderFarmId: number; transferId: string }[] {
  const open = input.farms.filter((farm) => farm.transferId && !farm.reversed);
  const named = (input.orderFarmId || '').trim();
  if (named) {
    return open.filter((farm) => String(farm.orderFarmId) === named).map((farm) => ({ orderFarmId: farm.orderFarmId, transferId: farm.transferId }));
  }
  if (input.amount > 0 && input.amount === input.orderTotal) {
    return open.map((farm) => ({ orderFarmId: farm.orderFarmId, transferId: farm.transferId }));
  }
  const matched = open.filter((farm) => farm.shopperCents === input.amount || farm.merchandiseCents === input.amount);
  if (matched.length === 1) return [{ orderFarmId: matched[0].orderFarmId, transferId: matched[0].transferId }];
  return [];
}

export function transferIdempotencyKey(transferGroup: string, orderFarmId: number): string {
  return `farm-transfer-${transferGroup}-${orderFarmId}`.slice(0, 255);
}

export type StripeAccount = { id: string; charges_enabled: boolean; payouts_enabled: boolean };
export type StripeCheckout = { id: string; url: string };
export type StripeTransfer = { id: string; amount: number; destination: string; destinationPaymentId: string };

export type StripeClient = {
  createExpressAccount(input: { email?: string; name?: string; listingToken: string }): Promise<StripeAccount>;
  createAccountLink(input: { accountId: string; returnUrl: string; refreshUrl: string }): Promise<{ url: string }>;
  retrieveAccount(accountId: string): Promise<StripeAccount>;
  createCheckoutSession(input: { orderPublicId: string; amountCents: number; successUrl: string; cancelUrl: string }): Promise<StripeCheckout>;
  createTransfer(input: { amountCents: number; destination: string; transferGroup: string; orderFarmId: number; farmName?: string }): Promise<StripeTransfer>;
  reverseTransfer(input: { transferId: string; amountCents: number; idempotencyKey: string }): Promise<{ id: string }>;
};

type StripeFetch = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<Response>;

export function createStripeClient(secret: string, fetchImpl: StripeFetch = fetch): StripeClient {
  const key = assertStripeTestKey(secret);
  return {
    async createExpressAccount(input) {
      const created = await stripeJson(key, fetchImpl, 'POST', 'v2/core/accounts', v2AccountBody(input));
      const id = String(created.id || '');
      if (!id.startsWith('acct_')) throw new Error('stripe refused the test call');
      try {
        await stripeRequest(key, fetchImpl, 'POST', `accounts/${encodeURIComponent(id)}`, payoutScheduleFields());
      } catch {
        // The v2 account is the source of truth. A v1 settings write can be refused; onboarding still works.
      }
      const live = await stripeRequest(key, fetchImpl, 'GET', `accounts/${encodeURIComponent(id)}`);
      return asAccount({ ...live, id });
    },
    async createAccountLink(input) {
      const data = await stripeRequest(key, fetchImpl, 'POST', 'account_links', accountLinkFields(input));
      const url = String(data.url || '');
      if (!url.startsWith('https://')) throw new Error('stripe refused the test call');
      return { url };
    },
    async retrieveAccount(accountId) {
      const data = await stripeRequest(key, fetchImpl, 'GET', `accounts/${encodeURIComponent(accountId)}`);
      return asAccount(data);
    },
    async createCheckoutSession(input) {
      const data = await stripeRequest(key, fetchImpl, 'POST', 'checkout/sessions', checkoutSessionFields(input));
      const url = String(data.url || '');
      if (!data.id || !url.startsWith('https://')) throw new Error('stripe refused the test call');
      return { id: String(data.id), url };
    },
    async createTransfer(input) {
      const data = await stripeRequest(
        key,
        fetchImpl,
        'POST',
        'transfers',
        { ...transferFields(input), 'expand[0]': 'destination_payment' },
        transferIdempotencyKey(input.transferGroup, input.orderFarmId),
      );
      const destination = typeof data.destination === 'string' ? data.destination : String((data.destination as { id?: string } | undefined)?.id || '');
      const payment = data.destination_payment;
      const destinationPaymentId = typeof payment === 'string' ? payment : String((payment as { id?: string } | undefined)?.id || '');
      const description = transferDescription(input.farmName || 'farm', input.transferGroup);
      if (destinationPaymentId && destination.startsWith('acct_')) {
        await stripeRequest(
          key,
          fetchImpl,
          'POST',
          `charges/${encodeURIComponent(destinationPaymentId)}`,
          { description },
          undefined,
          destination,
        );
      }
      return {
        id: String(data.id || ''),
        amount: Number(data.amount || 0),
        destination,
        destinationPaymentId,
      };
    },
    async reverseTransfer(input) {
      const data = await stripeRequest(
        key,
        fetchImpl,
        'POST',
        `transfers/${encodeURIComponent(input.transferId)}/reversals`,
        { amount: String(input.amountCents) },
        input.idempotencyKey,
      );
      return { id: String(data.id || '') };
    },
  };
}

function asAccount(data: Record<string, unknown>): StripeAccount {
  const id = String(data.id || '');
  if (!id.startsWith('acct_')) throw new Error('stripe refused the test call');
  return {
    id,
    charges_enabled: data.charges_enabled === true,
    payouts_enabled: data.payouts_enabled === true,
  };
}

async function stripeJson(
  key: string,
  fetchImpl: StripeFetch,
  method: string,
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(`https://api.stripe.com/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'stripe-version': STRIPE_V2_VERSION,
    },
    body: JSON.stringify(body),
  });
  return readStripeBody(key, response);
}

async function stripeRequest(
  key: string,
  fetchImpl: StripeFetch,
  method: string,
  path: string,
  fields?: Record<string, string>,
  idempotency?: string,
  stripeAccount?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { authorization: `Bearer ${key}` };
  if (fields) headers['content-type'] = 'application/x-www-form-urlencoded';
  if (idempotency) headers['idempotency-key'] = idempotency;
  if (stripeAccount) headers['stripe-account'] = stripeAccount;
  const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
    method,
    headers,
    body: fields ? new URLSearchParams(fields).toString() : undefined,
  });
  return readStripeBody(key, response);
}

async function readStripeBody(key: string, response: Response): Promise<Record<string, unknown>> {
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) {
    const message = String(data.error?.message || 'stripe refused the test call');
    if (/sk_(test|live)_|whsec_/.test(message)) throw new Error('stripe refused the test call');
    throw new Error(message.slice(0, 180));
  }
  return data as Record<string, unknown>;
}

export type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

export async function verifyStripeSignature(payload: string, header: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!secret || !header || !payload) return false;
  const parts = header.split(',').map((part) => {
    const index = part.indexOf('=');
    return index === -1 ? ['', ''] : [part.slice(0, index), part.slice(index + 1)];
  });
  const timestamp = parts.find(([name]) => name === 't')?.[1] || '';
  const signatures = parts.filter(([name]) => name === 'v1').map(([, value]) => value);
  const ts = Number(timestamp);
  if (!timestamp || !signatures.length || !Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

export async function readStripeEvent(payload: string, header: string, secret: string, nowSec?: number): Promise<StripeEvent> {
  return readStripeEventAny(payload, header, [secret], nowSec);
}

/** Platform and Connect webhooks can use different signing secrets on the same path. */
export async function readStripeEventAny(payload: string, header: string, secrets: string[], nowSec?: number): Promise<StripeEvent> {
  const usable = secrets.map((secret) => secret.trim()).filter(Boolean);
  if (!usable.length) throw new Error('missing webhook secret');
  for (const secret of usable) {
    if (await verifyStripeSignature(payload, header, secret, nowSec)) return parseStripeEvent(payload);
  }
  throw new Error('bad stripe signature');
}

function parseStripeEvent(payload: string): StripeEvent {
  const event = JSON.parse(payload) as StripeEvent;
  if (!event || typeof event !== 'object') throw new Error('that was not valid');
  return event;
}

export function isPaidEvent(event: StripeEvent): boolean {
  if (event.type === 'payment_intent.succeeded') return true;
  if (event.type !== 'checkout.session.completed') return false;
  const status = event.data?.object?.payment_status;
  return status == null || status === 'paid';
}

export function orderIdFromEvent(event: StripeEvent): string {
  const obj = event.data?.object || {};
  const meta = (obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : {}) as Record<string, unknown>;
  if (typeof meta.order_id === 'string' && /^mz_[a-z0-9_]+$/i.test(meta.order_id)) return meta.order_id;
  if (typeof obj.client_reference_id === 'string' && /^mz_[a-z0-9_]+$/i.test(obj.client_reference_id)) return obj.client_reference_id;
  return '';
}

export function paymentIntentIdFromEvent(event: StripeEvent): string {
  const obj = event.data?.object || {};
  if (event.type === 'payment_intent.succeeded' && typeof obj.id === 'string') return obj.id;
  return typeof obj.payment_intent === 'string' ? obj.payment_intent : '';
}

export function checkoutSessionIdFromEvent(event: StripeEvent): string {
  if (event.type !== 'checkout.session.completed') return '';
  return typeof event.data?.object?.id === 'string' ? event.data.object.id : '';
}

export function accountFlagsFromEvent(event: StripeEvent): { id: string; chargesEnabled: boolean; payoutsEnabled: boolean } | null {
  if (event.type !== 'account.updated') return null;
  const obj = event.data?.object || {};
  const id = typeof obj.id === 'string' ? obj.id : '';
  if (!id.startsWith('acct_')) return null;
  return { id, chargesEnabled: obj.charges_enabled === true, payoutsEnabled: obj.payouts_enabled === true };
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
