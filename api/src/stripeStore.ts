import { HttpError, json } from './http';
import { recordRepLedger } from './repStore';
import { bankConnected } from './payout';
import {
  accountFlagsFromEvent,
  checkoutSessionIdFromEvent,
  createStripeClient,
  isPaidEvent,
  orderIdFromEvent,
  paymentIntentIdFromEvent,
  planFarmTransfers,
  readConnectFee,
  readStripeEventAny,
  reversalTargets,
  safeReturnUrl,
  transferActions,
  type StripeClient,
  type StripeEvent,
  type TransferAction,
} from './stripe';

export type StripeEnv = {
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_CONNECT_WEBHOOK_SECRET?: string;
  PLATFORM_FEE_PERCENT?: string;
  PLATFORM_FEE_FLAT_CENTS?: string;
};

type ShareRow = {
  order_farm_id: number;
  farm_id: number;
  merchandise_cents: number;
  account_id: string | null;
  charges_enabled: number | null;
  payouts_enabled: number | null;
};

type TransferRow = {
  order_farm_id: number;
  status: string;
  stripe_transfer_id: string;
};

export async function startListingConnect(env: StripeEnv, token: string, body: { returnUrl?: unknown; refreshUrl?: unknown }): Promise<Response> {
  const listing = await env.DB.prepare(
    `SELECT id, stripe_account_id, reach_email, farm_name FROM listing_drafts WHERE token = ?`,
  ).bind(token).first<{ id: number; stripe_account_id?: string; reach_email?: string; farm_name?: string }>();
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  let returnUrl = '';
  let refreshUrl = '';
  try {
    returnUrl = safeReturnUrl(body.returnUrl);
    refreshUrl = safeReturnUrl(body.refreshUrl);
  } catch {
    throw new HttpError('add a return address.');
  }
  const stripe = stripeClient(env);
  try {
    let accountId = listing.stripe_account_id || '';
    if (!accountId) {
      const account = await callStripe(stripe.createExpressAccount({
        email: listing.reach_email || '',
        name: listing.farm_name || '',
        listingToken: token,
      }));
      accountId = account.id;
      await env.DB.prepare(`UPDATE listing_drafts SET stripe_account_id = ?, updated_at = datetime('now') WHERE id = ?`).bind(accountId, listing.id).run();
    }
    const link = await callStripe(stripe.createAccountLink({ accountId, returnUrl, refreshUrl }));
    return json({ url: link.url });
  } catch (error) {
    throw friendlyBankError(error);
  }
}

export async function listingConnectStatus(env: StripeEnv, token: string): Promise<Response> {
  const listing = await env.DB.prepare(
    `SELECT id, stripe_account_id FROM listing_drafts WHERE token = ?`,
  ).bind(token).first<{ id: number; stripe_account_id?: string }>();
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  if (!listing.stripe_account_id) return json({ connected: false });
  let account;
  try {
    account = await callStripe(stripeClient(env).retrieveAccount(listing.stripe_account_id));
  } catch (error) {
    throw friendlyBankError(error);
  }
  await applyAccountUpdate(env, {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });
  return json({ connected: bankConnected(account.charges_enabled, account.payouts_enabled) });
}

export async function openCheckout(env: StripeEnv, input: { orderPublicId: string; successUrl: string; cancelUrl: string }): Promise<{ id: string; url: string }> {
  const order = await env.DB.prepare(
    `SELECT public_id, total_cents FROM orders WHERE public_id = ?`,
  ).bind(input.orderPublicId).first<{ public_id: string; total_cents: number }>();
  if (!order) throw new HttpError('no order with that id.', 404);
  const session = await callStripe(stripeClient(env).createCheckoutSession({
    orderPublicId: order.public_id,
    amountCents: Number(order.total_cents),
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  }));
  await env.DB.prepare(
    `UPDATE orders SET stripe_checkout_session_id = ?, stripe_transfer_group = ? WHERE public_id = ?`,
  ).bind(session.id, order.public_id, order.public_id).run();
  return session;
}

export async function handleStripeWebhook(env: StripeEnv, payload: string, signature: string): Promise<Response> {
  if (payload.length > 200_000) throw new HttpError('that is too large.');
  const secrets = [env.STRIPE_WEBHOOK_SECRET || '', env.STRIPE_CONNECT_WEBHOOK_SECRET || ''];
  if (!secrets.some((secret) => secret.trim())) throw new HttpError('add the stripe webhook secret.', 500);
  let event: StripeEvent;
  try {
    event = await readStripeEventAny(payload, signature, secrets);
  } catch {
    throw new HttpError('bad stripe signature.', 400);
  }
  const flags = accountFlagsFromEvent(event);
  if (flags) {
    await applyAccountUpdate(env, flags);
    if (bankConnected(flags.chargesEnabled, flags.payoutsEnabled)) await releasePending(env, flags.id);
    return json({ ok: true });
  }
  const clawback = clawbackFromEvent(event);
  if (clawback) {
    await reverseMatchedTransfers(env, clawback);
    return json({ ok: true });
  }
  if (!isPaidEvent(event)) return json({ ok: true });
  const orderPublicId = orderIdFromEvent(event);
  if (!orderPublicId) return json({ ok: true });
  await settlePaidOrder(env, {
    orderPublicId,
    paymentIntentId: paymentIntentIdFromEvent(event),
    checkoutSessionId: checkoutSessionIdFromEvent(event),
  });
  return json({ ok: true });
}

export async function settlePaidOrder(env: StripeEnv, input: { orderPublicId: string; paymentIntentId: string; checkoutSessionId: string }): Promise<{ transferred: number; pending: number }> {
  const order = await env.DB.prepare(
    `SELECT id, public_id FROM orders WHERE public_id = ?`,
  ).bind(input.orderPublicId).first<{ id: number; public_id: string }>();
  if (!order) return { transferred: 0, pending: 0 };
  await env.DB.prepare(
    `UPDATE orders
     SET payment_status = 'paid_test', status = 'placed_test', stripe_transfer_group = ?,
         stripe_payment_intent_id = CASE WHEN ? != '' THEN ? ELSE stripe_payment_intent_id END,
         stripe_checkout_session_id = CASE WHEN ? != '' THEN ? ELSE stripe_checkout_session_id END
     WHERE id = ?`,
  ).bind(
    order.public_id,
    input.paymentIntentId, input.paymentIntentId,
    input.checkoutSessionId, input.checkoutSessionId,
    order.id,
  ).run();
  const shares = await env.DB.prepare(
    `SELECT ofm.id AS order_farm_id, ofm.farm_id, ofm.merchandise_cents,
            COALESCE(NULLIF(f.stripe_account_id, ''), NULLIF(ofm.stripe_account_id, ''), '') AS account_id,
            COALESCE(f.stripe_charges_enabled, 0) AS charges_enabled,
            COALESCE(f.stripe_payouts_enabled, 0) AS payouts_enabled
     FROM order_farms ofm JOIN farms f ON f.id = ofm.farm_id
     WHERE ofm.order_id = ? ORDER BY ofm.id`,
  ).bind(order.id).all<ShareRow>();
  const existing = await env.DB.prepare(
    `SELECT order_farm_id, status, stripe_transfer_id FROM farm_transfers WHERE order_id = ?`,
  ).bind(order.id).all<TransferRow>();
  const actions = transferActions(
    existing.results.map((row) => ({
      orderFarmId: Number(row.order_farm_id),
      status: row.status,
      stripeTransferId: row.stripe_transfer_id || '',
    })),
    planFarmTransfers(shares.results.map((row) => ({
      orderFarmId: Number(row.order_farm_id),
      farmId: Number(row.farm_id),
      merchandiseCents: Number(row.merchandise_cents),
      accountId: row.account_id || '',
      chargesEnabled: Number(row.charges_enabled) === 1,
      payoutsEnabled: Number(row.payouts_enabled) === 1,
    })), readConnectFee(env)),
    order.public_id,
  );
  await recordRepLedger(env, order.id);
  return applyTransferActions(env, order.id, actions);
}

async function applyAccountUpdate(env: StripeEnv, flags: { id: string; chargesEnabled: boolean; payoutsEnabled: boolean }): Promise<void> {
  const charges = flags.chargesEnabled ? 1 : 0;
  const payouts = flags.payoutsEnabled ? 1 : 0;
  const connected = bankConnected(flags.chargesEnabled, flags.payoutsEnabled) ? 1 : 0;
  await env.DB.prepare(
    `UPDATE listing_drafts
     SET stripe_charges_enabled = ?, stripe_payouts_enabled = ?, payout_connected = ?, updated_at = datetime('now')
     WHERE stripe_account_id = ?`,
  ).bind(charges, payouts, connected, flags.id).run();
  await env.DB.prepare(
    `UPDATE farms SET stripe_charges_enabled = ?, stripe_payouts_enabled = ? WHERE stripe_account_id = ?`,
  ).bind(charges, payouts, flags.id).run();
  const listings = await env.DB.prepare(
    `SELECT farm_name, reach_email, is_sample FROM listing_drafts WHERE stripe_account_id = ?`,
  ).bind(flags.id).all<{ farm_name: string; reach_email: string; is_sample: number }>();
  for (const listing of listings.results) {
    const email = (listing.reach_email || '').trim().toLowerCase();
    if (email) {
      const matches = await env.DB.prepare(
        `SELECT id FROM farms WHERE is_demo = 1 AND lower(email) = ? AND (stripe_account_id IS NULL OR stripe_account_id = '' OR stripe_account_id = ?)`,
      ).bind(email, flags.id).all<{ id: number }>();
      if (matches.results.length === 1) await setFarmAccount(env, Number(matches.results[0].id), flags);
    }
    if (Number(listing.is_sample) === 1 && listing.farm_name) {
      await env.DB.prepare(
        `UPDATE farms
         SET stripe_account_id = ?, stripe_charges_enabled = ?, stripe_payouts_enabled = ?
         WHERE is_demo = 1 AND lower(name) = lower(?) AND (stripe_account_id IS NULL OR stripe_account_id = '' OR stripe_account_id = ?)`,
      ).bind(flags.id, charges, payouts, listing.farm_name, flags.id).run();
    }
  }
}

async function setFarmAccount(env: StripeEnv, farmId: number, flags: { id: string; chargesEnabled: boolean; payoutsEnabled: boolean }): Promise<void> {
  await env.DB.prepare(
    `UPDATE farms SET stripe_account_id = ?, stripe_charges_enabled = ?, stripe_payouts_enabled = ? WHERE id = ?`,
  ).bind(flags.id, flags.chargesEnabled ? 1 : 0, flags.payoutsEnabled ? 1 : 0, farmId).run();
}

async function releasePending(env: StripeEnv, accountId: string): Promise<void> {
  const pending = await env.DB.prepare(
    `SELECT ft.order_id, ft.order_farm_id, ft.farm_id, ft.amount_cents, o.public_id
     FROM farm_transfers ft
     JOIN orders o ON o.id = ft.order_id
     JOIN farms f ON f.id = ft.farm_id
     WHERE ft.status = 'pending' AND ft.amount_cents > 0 AND ft.stripe_transfer_id = ''
       AND (f.stripe_account_id = ? OR ft.stripe_account_id = ?)`,
  ).bind(accountId, accountId).all<{ order_id: number; order_farm_id: number; farm_id: number; amount_cents: number; public_id: string }>();
  const actions: TransferAction[] = pending.results.map((row) => ({
    kind: 'record',
    orderFarmId: Number(row.order_farm_id),
    farmId: Number(row.farm_id),
    amountCents: Number(row.amount_cents),
    accountId,
    transferGroup: row.public_id,
    send: true,
  }));
  const byOrder = new Map<number, TransferAction[]>();
  pending.results.forEach((row, index) => {
    const list = byOrder.get(Number(row.order_id)) || [];
    list.push(actions[index]);
    byOrder.set(Number(row.order_id), list);
  });
  for (const [orderId, list] of byOrder) await applyTransferActions(env, orderId, list);
}

async function applyTransferActions(env: StripeEnv, orderId: number, actions: TransferAction[]): Promise<{ transferred: number; pending: number }> {
  let transferred = 0;
  let pending = 0;
  for (const action of actions) {
    if (action.kind === 'skip') continue;
    if (!action.send || action.amountCents <= 0) {
      await saveTransfer(env, orderId, action, action.amountCents <= 0 ? 'zero' : 'pending', '');
      if (action.amountCents > 0) pending += 1;
      continue;
    }
    const farm = await env.DB.prepare(`SELECT name FROM farms WHERE id = ?`).bind(action.farmId).first<{ name: string }>();
    const transfer = await callStripe(stripeClient(env).createTransfer({
      amountCents: action.amountCents,
      destination: action.accountId,
      transferGroup: action.transferGroup,
      orderFarmId: action.orderFarmId,
      farmName: farm?.name || 'farm',
    }));
    if (!transfer.id) throw new HttpError('stripe refused the test call.');
    await saveTransfer(env, orderId, action, 'transferred', transfer.id);
    transferred += 1;
  }
  return { transferred, pending };
}

async function saveTransfer(env: StripeEnv, orderId: number, action: Extract<TransferAction, { kind: 'record' }>, status: string, transferId: string): Promise<void> {
  const existing = await env.DB.prepare(
    `SELECT status, stripe_transfer_id FROM farm_transfers WHERE order_farm_id = ?`,
  ).bind(action.orderFarmId).first<{ status: string; stripe_transfer_id: string }>();
  if (existing && (existing.status === 'transferred' || existing.stripe_transfer_id)) return;
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO farm_transfers (
        order_id, order_farm_id, farm_id, amount_cents, currency, status, stripe_account_id, stripe_transfer_id, transfer_group, transferred_at
      ) VALUES (?, ?, ?, ?, 'usd', ?, ?, ?, ?, CASE WHEN ? = 'transferred' THEN datetime('now') ELSE '' END)`,
    ).bind(orderId, action.orderFarmId, action.farmId, action.amountCents, status, action.accountId, transferId, action.transferGroup, status).run();
    return;
  }
  await env.DB.prepare(
    `UPDATE farm_transfers
     SET amount_cents = ?, status = ?, stripe_account_id = ?, stripe_transfer_id = ?, transfer_group = ?,
         transferred_at = CASE WHEN ? = 'transferred' THEN datetime('now') ELSE transferred_at END
     WHERE order_farm_id = ? AND status != 'transferred'`,
  ).bind(action.amountCents, status, action.accountId, transferId, action.transferGroup, status, action.orderFarmId).run();
}

function clawbackFromEvent(event: StripeEvent): { amount: number; paymentIntent: string; orderId: string; orderFarmId: string; eventId: string } | null {
  const type = event.type || '';
  if (type !== 'charge.refunded' && type !== 'refund.created' && type !== 'charge.dispute.created') return null;
  const obj = event.data?.object || {};
  const meta = (obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : {}) as Record<string, unknown>;
  const amount = type === 'charge.refunded' ? Number(obj.amount_refunded || 0) : Number(obj.amount || 0);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    paymentIntent: typeof obj.payment_intent === 'string' ? obj.payment_intent : '',
    orderId: typeof meta.order_id === 'string' ? meta.order_id : '',
    orderFarmId: typeof meta.order_farm_id === 'string' ? meta.order_farm_id : '',
    eventId: String(event.id || type),
  };
}

async function reverseMatchedTransfers(env: StripeEnv, clawback: { amount: number; paymentIntent: string; orderId: string; orderFarmId: string; eventId: string }): Promise<void> {
  const order = await env.DB.prepare(
    `SELECT id, public_id, total_cents FROM orders WHERE public_id = ? OR stripe_payment_intent_id = ?`,
  ).bind(clawback.orderId, clawback.paymentIntent).first<{ id: number; public_id: string; total_cents: number }>();
  if (!order) return;
  const rows = await env.DB.prepare(
    `SELECT ft.order_farm_id, ft.stripe_transfer_id, ft.amount_cents, ft.stripe_reversal_id,
            ofm.merchandise_cents, ofm.platform_fee_cents, ofm.delivery_fee_cents
     FROM farm_transfers ft JOIN order_farms ofm ON ofm.id = ft.order_farm_id
     WHERE ft.order_id = ?`,
  ).bind(order.id).all<{ order_farm_id: number; stripe_transfer_id: string; amount_cents: number; stripe_reversal_id: string; merchandise_cents: number; platform_fee_cents: number; delivery_fee_cents: number }>();
  const targets = reversalTargets({
    amount: clawback.amount,
    orderTotal: Number(order.total_cents) || 0,
    orderFarmId: clawback.orderFarmId,
    farms: rows.results.map((row) => ({
      orderFarmId: Number(row.order_farm_id),
      transferId: row.stripe_transfer_id || '',
      merchandiseCents: Number(row.merchandise_cents) || 0,
      shopperCents: (Number(row.merchandise_cents) || 0) + (Number(row.platform_fee_cents) || 0) + (Number(row.delivery_fee_cents) || 0),
      reversed: !!row.stripe_reversal_id,
    })),
  });
  for (const target of targets) {
    const row = rows.results.find((item) => Number(item.order_farm_id) === target.orderFarmId);
    if (!row || row.stripe_reversal_id) continue;
    const reversal = await callStripe(stripeClient(env).reverseTransfer({
      transferId: target.transferId,
      amountCents: Number(row.amount_cents) || 0,
      idempotencyKey: `reversal-${target.transferId}-${clawback.eventId}`.slice(0, 255),
    }));
    await env.DB.prepare(
      `UPDATE farm_transfers SET status = 'reversed', stripe_reversal_id = ? WHERE order_farm_id = ? AND stripe_reversal_id = ''`,
    ).bind(reversal.id || 'reversed', target.orderFarmId).run();
  }
}

const BANK_NOT_READY = "bank connect is almost ready. try again soon or tap 'rather get a check?'";

function friendlyBankError(error: unknown): unknown {
  if (error instanceof HttpError && /test key|locked to test mode|return address|cannot find/.test(error.message)) return error;
  return new HttpError(BANK_NOT_READY);
}

function stripeClient(env: StripeEnv): StripeClient {
  try {
    return createStripeClient(env.STRIPE_SECRET_KEY || '');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'stripe test key required') {
      throw new HttpError(env.STRIPE_SECRET_KEY ? 'stripe is locked to test mode.' : 'add a stripe test key before this step.');
    }
    throw error;
  }
}

async function callStripe<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const message = error instanceof Error ? error.message : 'stripe refused the test call';
    if (/sk_(test|live)_|whsec_/.test(message)) throw new HttpError('stripe refused the test call.');
    throw new HttpError(message.slice(0, 180));
  }
}
