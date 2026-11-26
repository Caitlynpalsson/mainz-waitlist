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
  accountLinkFields,
  assertStripeTestKey,
  farmTransferAmountCents,
  payoutScheduleFields,
  v2AccountBody,
} from '../src/stripe.ts';

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
const foodCents = 2000;
const transferCents = farmTransferAmountCents(foodCents, { percent: 10, flatCents: 0 });
if (transferCents !== 1800) fail('expected a transfer of 1800 cents on 2000 cents of food');

async function stripeJson(method: string, path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'stripe-version': STRIPE_V2_VERSION,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) fail(data.error?.message || 'stripe refused the test call');
  return data as Record<string, unknown>;
}

function transfersActive(account: Record<string, unknown>): boolean {
  const caps = account.capabilities as { transfers?: string } | undefined;
  return caps?.transfers === 'active';
}

async function waitForTransfers(accountId: string): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const account = await stripe('GET', `accounts/${encodeURIComponent(accountId)}`);
    if (transfersActive(account)) return account;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  fail('sample account is not ready for a transfer yet. stripe_transfers is still off.');
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

const created = await stripeJson('POST', 'v2/core/accounts', v2AccountBody({
  name: 'Sample Lane',
  email: 'sample-farmer@example.com',
  listingToken: 'sample',
}));
const accountId = String(created.id || '');
if (!accountId.startsWith('acct_')) fail('stripe did not return a sample account');
await stripe('POST', `accounts/${encodeURIComponent(accountId)}`, {
  ...payoutScheduleFields(),
  business_type: 'individual',
  'business_profile[mcc]': '5499',
  'business_profile[url]': CONNECT_SITE,
  'business_profile[product_description]': 'sample produce',
  'settings[payments][statement_descriptor]': PAYOUT_DESCRIPTOR,
  'individual[first_name]': 'Sample',
  'individual[last_name]': 'Lane',
  'individual[email]': 'sample-farmer@example.com',
  'individual[phone]': '0000000000',
  'individual[id_number]': '000000000',
  'individual[ssn_last_4]': '0000',
  'individual[dob][day]': '1',
  'individual[dob][month]': '1',
  'individual[dob][year]': '1901',
  'individual[address][line1]': 'address_full_match',
  'individual[address][city]': 'South San Francisco',
  'individual[address][state]': 'CA',
  'individual[address][postal_code]': '94080',
  'individual[address][country]': 'US',
  'tos_acceptance[date]': String(Math.floor(Date.now() / 1000)),
  'tos_acceptance[ip]': '127.0.0.1',
  external_account: 'btok_us_verified',
});
const link = await stripe('POST', 'account_links', accountLinkFields({
  accountId,
  returnUrl: 'https://www.themaincoursemarket.com/?payout=return',
  refreshUrl: 'https://www.themaincoursemarket.com/?payout=refresh',
}));
if (!String(link.url || '').startsWith('https://')) fail('stripe did not return an account link');
say('account link: ok');
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
if (destination !== accountId || Number(checked.amount) !== 1800 || checked.transfer_group !== orderId) {
  fail('the transfer did not land 1800 cents on the sample account');
}
say(`transfer: ${transferId} ${transferCents} usd to ${destination}`);
say('ok');
