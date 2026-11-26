/**
 * Sample Stripe test-mode order.
 * Refuses to run unless STRIPE_SECRET_KEY starts with sk_test_.
 * Creates a SAMPLE connected account with Stripe's published test data,
 * pays with the 4242 test card (pm_card_visa), and checks the transfer
 * landed on that account. Nothing here is a real farm.
 *
 * From the api folder:
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe-test
 */
import { assertStripeTestKey, farmTransferAmountCents, readConnectFee } from '../src/stripe.ts';

const proc = (globalThis as { process?: { env?: Record<string, string | undefined>; exit?: (code: number) => void } }).process;
const env = proc?.env || {};

function redact(value: string): string {
  return value
    .replace(/sk_(test|live)_[A-Za-z0-9]+/g, '[secret]')
    .replace(/whsec_[A-Za-z0-9]+/g, '[secret]')
    .replace(/\b0000000000\b/g, '[test-phone]')
    .replace(/\b000123456789\b/g, '[test-bank]');
}

function say(message: string) {
  console.log(redact(message));
}

function fail(message: string): never {
  console.error(redact(message));
  proc?.exit?.(1);
  throw new Error('stopped');
}

const key = (env.STRIPE_SECRET_KEY || '').trim();
if (!key.startsWith('sk_test_')) {
  say('Stripe test mode is not configured, so this script did not call Stripe.');
  say('');
  say('Set these Worker secrets (test mode only):');
  say('  STRIPE_SECRET_KEY      must start with sk_test_');
  say('  STRIPE_WEBHOOK_SECRET          the whsec_ signing secret from the platform webhook');
  say('  STRIPE_CONNECT_WEBHOOK_SECRET  the whsec_ signing secret from the Connect webhook');
  say('');
  say('Webhook endpoint:');
  say('  POST /api/stripe/webhook');
  say('  events: checkout.session.completed, payment_intent.succeeded, account.updated');
  say('');
  say('Then run, from the api folder:');
  say('  STRIPE_SECRET_KEY=sk_test_... npm run stripe-test');
  proc?.exit?.(1);
  throw new Error('stopped');
}

const secret = assertStripeTestKey(key);
const orderId = `mz_sample_${[...crypto.getRandomValues(new Uint8Array(4))].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
const fee = readConnectFee(env);
const foodCents = 2000;
const transferCents = farmTransferAmountCents(foodCents, fee);
if (transferCents < 1) fail('the stripe split held back the whole sample subtotal, so there is nothing to transfer.');

async function stripeJson(method: string, path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'stripe-version': '2025-11-17.clover',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) fail(data.error?.message || 'stripe refused the test call');
  return data as Record<string, unknown>;
}

async function stripe(method: string, path: string, fields?: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(fields ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: fields ? new URLSearchParams(fields).toString() : undefined,
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) fail(data.error?.message || 'stripe refused the test call');
  return data as Record<string, unknown>;
}

const created = await stripeJson('POST', 'v2/core/accounts', {
  display_name: 'Sample Lane',
  contact_email: 'sample-farmer@example.com',
  dashboard: 'express',
  identity: { country: 'us', business_details: { url: 'https://www.themaincoursemarket.com' } },
  defaults: { responsibilities: { fees_collector: 'application', losses_collector: 'stripe' } },
  configuration: {
    merchant: { capabilities: { card_payments: { requested: true } } },
    recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
  },
  metadata: { sample: 'mainz-preview-farm', name: 'Sample Lane Farm' },
});
const accountId = String(created.id || '');
if (!accountId.startsWith('acct_')) fail('stripe did not return a sample account');
await stripe('POST', `accounts/${encodeURIComponent(accountId)}`, {
  'settings[payouts][schedule][interval]': 'weekly',
  'settings[payouts][schedule][weekly_anchor]': 'monday',
  'settings[payouts][statement_descriptor]': 'MAINCOURSE',
  'settings[payouts][debit_negative_balances]': 'true',
  'external_account[object]': 'bank_account',
  'external_account[country]': 'US',
  'external_account[currency]': 'usd',
  'external_account[routing_number]': '110000000',
  'external_account[account_number]': '000123456789',
});
const account = await stripe('GET', `accounts/${encodeURIComponent(accountId)}`);
say(`sample farm: ${accountId}`);
say(`charges: ${account.charges_enabled === true} payouts: ${account.payouts_enabled === true}`);
if (account.charges_enabled !== true || account.payouts_enabled !== true) {
  const due = (account.requirements as { currently_due?: string[] } | undefined)?.currently_due || [];
  fail(`sample account is not ready for a transfer. still due: ${due.join(', ') || 'see the stripe dashboard'}`);
}

const payment = await stripe('POST', 'payment_intents', {
  amount: String(foodCents),
  currency: 'usd',
  payment_method: 'pm_card_visa',
  confirm: 'true',
  transfer_group: orderId,
  'metadata[order_id]': orderId,
  description: 'the main course sample test order',
});
if (payment.status !== 'succeeded') fail(`sample payment did not succeed (${String(payment.status || 'unknown')})`);
say(`payment: ${String(payment.id)} succeeded`);

const transfer = await stripe('POST', 'transfers', {
  amount: String(transferCents),
  currency: 'usd',
  destination: accountId,
  transfer_group: orderId,
  description: `Sample Lane, order ${orderId}`,
  'metadata[sample]': 'mainz-preview-farm',
  'metadata[order_id]': orderId,
});
const transferId = String(transfer.id || '');
const checked = await stripe('GET', `transfers/${encodeURIComponent(transferId)}`);
const destination = typeof checked.destination === 'string'
  ? checked.destination
  : String((checked.destination as { id?: string } | undefined)?.id || '');
if (destination !== accountId || Number(checked.amount) !== transferCents || checked.transfer_group !== orderId) {
  fail('the transfer did not land on the sample account');
}
say(`transfer: ${transferId} ${transferCents} usd to ${destination}`);
say('ok');
