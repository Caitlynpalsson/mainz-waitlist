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
import {
  CONNECT_SITE,
  PAYOUT_DESCRIPTOR,
  STRIPE_V2_VERSION,
  assertStripeTestKey,
  farmTransferAmountCents,
  payoutScheduleFields,
} from '../src/stripe.ts';

const proc = (globalThis as { process?: { env?: Record<string, string | undefined>; exit?: (code: number) => void } }).process;
const env = proc?.env || {};

function redact(value: string): string {
  return value
    .replace(/sk_(test|live)_[A-Za-z0-9]+/g, '[secret]')
    .replace(/whsec_[A-Za-z0-9]+/g, '[secret]')
    .replace(/\b0000000000\b/g, '[test-phone]')
    .replace(/\b000000000\b/g, '[test-id]')
    .replace(/\b0000\b/g, '[test-id]')
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
const foodCents = 2000;
const transferCents = farmTransferAmountCents(foodCents, { percent: 10, flatCents: 0 });
if (transferCents !== 1800) fail('expected a transfer of 1800 cents on 2000 cents of food');

async function stripeJson(method: string, path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'stripe-version': STRIPE_V2_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || 'stripe refused the test call');
  return data as Record<string, unknown>;
}

async function stripeAllow(method: string, path: string): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { authorization: `Bearer ${secret}` },
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  return { ok: response.ok, message: data.error?.message || 'stripe refused the test call' };
}

async function deleteSample(accountId: string): Promise<{ ok: boolean; message: string }> {
  const removed = await stripeAllow('DELETE', `accounts/${encodeURIComponent(accountId)}`);
  if (removed.ok) return removed;
  const response = await fetch(`https://api.stripe.com/v2/core/accounts/${encodeURIComponent(accountId)}/close`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'stripe-version': STRIPE_V2_VERSION,
    },
    body: '{}',
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  return { ok: response.ok, message: data.error?.message || removed.message };
}

function transfersActive(account: Record<string, unknown>): boolean {
  const v1 = account.capabilities as { transfers?: string } | undefined;
  if (v1?.transfers === 'active') return true;
  const recipient = (account.configuration as { recipient?: { capabilities?: { stripe_balance?: { stripe_transfers?: { status?: string } } } } } | undefined)?.recipient;
  return recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';
}

async function waitForTransfers(accountId: string): Promise<Record<string, unknown>> {
  const id = encodeURIComponent(accountId);
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const v2 = await stripeJson('GET', `v2/core/accounts/${id}?include=configuration.recipient`);
    if (transfersActive(v2)) return v2;
    const v1 = await stripe('GET', `accounts/${id}`);
    if (transfersActive(v1)) return v1;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('sample account is not ready for a transfer yet. stripe_transfers is still off.');
}

async function stripe(method: string, path: string, fields?: Record<string, string>, stripeAccount?: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(fields ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(stripeAccount ? { 'stripe-account': stripeAccount } : {}),
    },
    body: fields ? new URLSearchParams(fields).toString() : undefined,
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || 'stripe refused the test call');
  return data as Record<string, unknown>;
}

let accountId = '';
let transferId = '';
let problem = '';
try {
// Test script only. Live farms stay Express with hosted onboarding.
// This sandbox rejects Accounts v1 while the platform is the losses collector.
// Dashboard none with Stripe holding fees and losses is the v2 shape it accepts.
const created = await stripeJson('POST', 'v2/core/accounts', {
  display_name: 'Sample Lane',
  contact_email: 'sample-farmer@example.com',
  dashboard: 'none',
  identity: {
    country: 'us',
    entity_type: 'individual',
    individual: {
      given_name: 'Sample',
      surname: 'Lane',
      email: 'sample-farmer@example.com',
      phone: '0000000000',
      date_of_birth: { day: 1, month: 1, year: 1901 },
      address: {
        line1: 'address_full_match',
        city: 'South San Francisco',
        state: 'CA',
        postal_code: '94080',
        country: 'us',
      },
      id_numbers: [
        { type: 'us_ssn', value: '000000000' },
        { type: 'us_ssn_last_4', value: '0000' },
      ],
    },
    attestations: {
      terms_of_service: {
        account: { date: new Date().toISOString(), ip: '127.0.0.1' },
      },
    },
  },
  defaults: {
    responsibilities: {
      fees_collector: 'stripe',
      losses_collector: 'stripe',
    },
  },
  configuration: {
    merchant: { mcc: '5499', capabilities: { card_payments: { requested: true } } },
    recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
  },
  include: ['configuration.recipient', 'identity'],
  metadata: { sample: 'mainz-preview-farm' },
});
accountId = String(created.id || '');
if (!accountId.startsWith('acct_')) throw new Error('stripe did not return a sample account');
{
  await stripe('POST', 'external_accounts', {
    'external_account[object]': 'bank_account',
    'external_account[country]': 'US',
    'external_account[currency]': 'usd',
    'external_account[routing_number]': '110000000',
    'external_account[account_number]': '000123456789',
  }, accountId);
  await stripe('POST', `accounts/${encodeURIComponent(accountId)}`, {
    ...payoutScheduleFields(),
    'settings[payments][statement_descriptor]': PAYOUT_DESCRIPTOR,
    'business_profile[mcc]': '5499',
    'business_profile[url]': CONNECT_SITE,
  });
}
const account = await waitForTransfers(accountId);
say(`sample farm: ${accountId}`);
say(`charges: ${account.charges_enabled === true} payouts: ${account.payouts_enabled === true}`);

const payment = await stripe('POST', 'payment_intents', {
  amount: String(foodCents),
  currency: 'usd',
  payment_method: 'pm_card_visa',
  confirm: 'true',
  'automatic_payment_methods[enabled]': 'true',
  'automatic_payment_methods[allow_redirects]': 'never',
  transfer_group: orderId,
  'metadata[order_id]': orderId,
  description: 'the main course sample test order',
});
if (payment.status !== 'succeeded') throw new Error(`sample payment did not succeed (${String(payment.status || 'unknown')})`);
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
transferId = String(transfer.id || '');
const checked = await stripe('GET', `transfers/${encodeURIComponent(transferId)}`);
const destination = typeof checked.destination === 'string'
  ? checked.destination
  : String((checked.destination as { id?: string } | undefined)?.id || '');
if (destination !== accountId || Number(checked.amount) !== 1800 || checked.transfer_group !== orderId) {
  problem = 'the transfer did not land 1800 cents on the sample account';
}
if (!problem) say(`transfer: ${transferId} ${transferCents} usd to ${destination}`);
} catch (error) {
  problem = error instanceof Error ? error.message : 'stripe refused the test call';
} finally {
  if (accountId.startsWith('acct_')) {
    if (transferId) await stripeAllow('POST', `transfers/${encodeURIComponent(transferId)}/reversals`);
    const removed = await deleteSample(accountId);
    if (!removed.ok) problem = problem || removed.message;
    else if (!problem) say('sample account deleted');
  }
}
if (problem) fail(problem);
say('ok');
