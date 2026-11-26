import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { bankConnected } from '../src/payout.ts';
import {
  accountFlagsFromEvent,
  assertStripeTestKey,
  checkoutSessionFields,
  connectPlatformFeeCents,
  createStripeClient,
  payoutScheduleFields,
  reversalTargets,
  transferDescription,
  v2AccountBody,
  farmTransferAmountCents,
  isPaidEvent,
  orderIdFromEvent,
  planFarmTransfers,
  readConnectFee,
  readStripeEvent,
  readStripeEventAny,
  safeReturnUrl,
  transferActions,
  transferFields,
  transferIdempotencyKey,
  verifyStripeSignature,
} from '../src/stripe.ts';

test('stripe refuses any key that is not test mode', () => {
  assert.throws(() => assertStripeTestKey(''), /stripe test key required/);
  assert.throws(() => assertStripeTestKey('sk_live_secret'), /stripe test key required/);
  assert.throws(() => assertStripeTestKey('rk_test_restricted'), /stripe test key required/);
  assert.equal(assertStripeTestKey('  sk_test_sample  '), 'sk_test_sample');
  assert.throws(() => createStripeClient('sk_live_secret', () => {
    throw new Error('network');
  }), /stripe test key required/);
});

test('connect fee helper is the only reader and defaults to no extra holdback', () => {
  assert.deepEqual(readConnectFee({}), { percent: 0, flatCents: 0 });
  assert.deepEqual(readConnectFee({ PLATFORM_FEE_PERCENT: 'nope', PLATFORM_FEE_FLAT_CENTS: '-4' }), { percent: 0, flatCents: 0 });
  assert.equal(farmTransferAmountCents(1900, readConnectFee({})), 1900);
  assert.equal(connectPlatformFeeCents(1900, { percent: 5, flatCents: 50 }), 145);
  assert.equal(farmTransferAmountCents(1900, { percent: 5, flatCents: 50 }), 1755);
  assert.equal(farmTransferAmountCents(1000, { percent: 0, flatCents: 5000 }), 0);
  const hits: string[] = [];
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts') && readFileSync(path, 'utf8').includes('PLATFORM_FEE_PERCENT')) hits.push(path.replaceAll('\\', '/'));
    }
  }
  walk('src');
  const readers = hits.filter((path) => {
    const text = readFileSync(path, 'utf8');
    return text.includes('env.PLATFORM_FEE_PERCENT') || text.includes('PLATFORM_FEE_PERCENT ??');
  });
  assert.deepEqual(readers, ['src/stripe.ts']);
});

test('one checkout, then one transfer per farm, holding a farm that is not ready', () => {
  const fields = checkoutSessionFields({
    orderPublicId: 'mz_sample01',
    amountCents: 2500,
    successUrl: 'https://preview.example/order/mz_sample01?paid=1',
    cancelUrl: 'https://preview.example/bag',
  });
  assert.equal(fields.mode, 'payment');
  assert.equal(fields['payment_intent_data[transfer_group]'], 'mz_sample01');
  assert.equal(fields['metadata[order_id]'], 'mz_sample01');
  assert.equal(Object.keys(fields).filter((key) => key.startsWith('line_items[1]')).length, 0);
  const planned = planFarmTransfers([
    { orderFarmId: 11, farmId: 1, merchandiseCents: 1900, accountId: 'acct_ready', chargesEnabled: true, payoutsEnabled: true },
    { orderFarmId: 12, farmId: 2, merchandiseCents: 800, accountId: '', chargesEnabled: false, payoutsEnabled: false },
    { orderFarmId: 13, farmId: 3, merchandiseCents: 400, accountId: 'acct_wait', chargesEnabled: true, payoutsEnabled: false },
  ], { percent: 0, flatCents: 0 });
  const actions = transferActions([], planned, 'mz_sample01');
  assert.equal(actions.length, 3);
  assert.deepEqual(actions[0], {
    kind: 'record', orderFarmId: 11, farmId: 1, amountCents: 1900, accountId: 'acct_ready', transferGroup: 'mz_sample01', send: true,
  });
  assert.equal(actions[1] && actions[1].kind === 'record' && actions[1].send, false);
  assert.equal(actions[2] && actions[2].kind === 'record' && actions[2].accountId, 'acct_wait');
  const again = transferActions([
    { orderFarmId: 11, status: 'transferred', stripeTransferId: 'tr_done' },
    { orderFarmId: 12, status: 'pending', stripeTransferId: '' },
  ], planned.map((plan) => plan.orderFarmId === 12 ? { ...plan, accountId: 'acct_new', status: 'ready' as const, amountCents: 800 } : plan), 'mz_sample01');
  assert.equal(again[0].kind, 'skip');
  assert.equal(again[1] && again[1].kind === 'record' && again[1].send, true);
  assert.equal(transferFields({ amountCents: 1900, destination: 'acct_ready', transferGroup: 'mz_sample01', orderFarmId: 11 }).transfer_group, 'mz_sample01');
  assert.equal(transferIdempotencyKey('mz_sample01', 11), 'farm-transfer-mz_sample01-11');
});

test('accounts v2 drops type, lets stripe hold losses, and the platform pays fees', async () => {
  const body = v2AccountBody({ email: 'sample-farmer@example.com', name: 'Sample Lane', listingToken: 'lk_sample' });
  const text = JSON.stringify(body);
  assert.equal('type' in body, false);
  assert.equal(text.includes('phone'), false);
  assert.equal(text.includes('on_behalf_of'), false);
  assert.equal((body.defaults as { responsibilities: { losses_collector: string; fees_collector: string } }).responsibilities.losses_collector, 'stripe');
  assert.equal((body.defaults as { responsibilities: { fees_collector: string } }).responsibilities.fees_collector, 'application');
  assert.equal(body.dashboard, 'express');
  assert.equal(payoutScheduleFields()['settings[payouts][schedule][weekly_anchor]'], 'monday');
  assert.equal(payoutScheduleFields()['settings[payouts][statement_descriptor]'], 'MAINCOURSE');
  assert.equal(transferDescription('Sample Lane', 'mz_abc'), 'Sample Lane, order mz_abc');
  const onlyOne = reversalTargets({
    amount: 800,
    orderTotal: 2500,
    farms: [
      { orderFarmId: 11, transferId: 'tr_a', merchandiseCents: 1900, shopperCents: 1700, reversed: false },
      { orderFarmId: 12, transferId: 'tr_b', merchandiseCents: 800, shopperCents: 800, reversed: false },
    ],
  });
  assert.deepEqual(onlyOne, [{ orderFarmId: 12, transferId: 'tr_b' }]);
  let sawV2 = false;
  const client = createStripeClient('sk_test_sample', async (url, init) => {
    const href = String(url);
    if (href.includes('/v2/core/accounts')) {
      sawV2 = true;
      const parsed = JSON.parse(init?.body || '{}') as { type?: string };
      assert.equal(parsed.type, undefined);
      return new Response(JSON.stringify({ id: 'acct_ready' }));
    }
    if (href.endsWith('/transfers')) {
      return new Response(JSON.stringify({ id: 'tr_sample', amount: 1900, destination: 'acct_ready', destination_payment: 'py_sample' }));
    }
    if (href.includes('/charges/py_sample')) {
      assert.equal(init?.headers?.['stripe-account'], 'acct_ready');
      return new Response(JSON.stringify({ id: 'py_sample' }));
    }
    return new Response(JSON.stringify({ id: 'acct_ready', charges_enabled: false, payouts_enabled: false, url: 'https://connect.stripe.com/setup/s/sample' }));
  });
  const account = await client.createExpressAccount({ listingToken: 'lk_sample', name: 'Sample Lane', email: 'not-an-email' });
  assert.equal(sawV2, true);
  assert.equal(account.id, 'acct_ready');
  const transfer = await client.createTransfer({
    amountCents: 1900, destination: 'acct_ready', transferGroup: 'mz_sample01', orderFarmId: 11, farmName: 'Sample Lane',
  });
  assert.equal(transfer.destinationPaymentId, 'py_sample');
  assert.equal(bankConnected(true, true), true);
});

test('stripe errors never echo the secret', async () => {
  const client = createStripeClient('sk_test_sample', async () => new Response(JSON.stringify({
    error: { message: 'bad key sk_test_sample was used' },
  }), { status: 400 }));
  await assert.rejects(() => client.createExpressAccount({ listingToken: 'lk_sample' }), (error: unknown) => {
    assert.equal(error instanceof Error && error.message.includes('sk_test_'), false);
    return true;
  });
  assert.throws(() => safeReturnUrl('javascript:alert(1)'), /return url required/);
  assert.equal(safeReturnUrl('https://preview.example/listing/lk_sample?payout=return').includes('payout=return'), true);
});

test('webhook signature and paid events', async () => {
  const payload = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test', payment_status: 'paid', payment_intent: 'pi_test', metadata: { order_id: 'mz_sample01' }, client_reference_id: 'mz_sample01' } },
  });
  const secret = 'whsec_sample';
  const now = 1_700_000_000;
  const header = await sign(secret, payload, now);
  assert.equal(await verifyStripeSignature(payload, header, secret, now), true);
  assert.equal(await verifyStripeSignature(`${payload} `, header, secret, now), false);
  assert.equal(await verifyStripeSignature(payload, header, 'whsec_other', now), false);
  assert.equal(await verifyStripeSignature(payload, header, secret, now + 301), false);
  const event = await readStripeEvent(payload, header, secret, now);
  const connectHeader = await sign('whsec_connect', payload, now);
  const fromConnect = await readStripeEventAny(payload, connectHeader, ['whsec_platform', 'whsec_connect'], now);
  assert.equal(fromConnect.type, 'checkout.session.completed');
  await assert.rejects(() => readStripeEventAny(payload, header, ['whsec_platform', 'whsec_connect'], now), /bad stripe signature/);
  assert.equal(isPaidEvent(event), true);
  assert.equal(orderIdFromEvent(event), 'mz_sample01');
  assert.equal(isPaidEvent({ type: 'checkout.session.completed', data: { object: { payment_status: 'unpaid' } } }), false);
  assert.equal(accountFlagsFromEvent({
    type: 'account.updated',
    data: { object: { id: 'acct_ready', charges_enabled: true, payouts_enabled: true, phone: '0000000000' } },
  })?.id, 'acct_ready');
  const flags = accountFlagsFromEvent({
    type: 'account.updated',
    data: { object: { id: 'acct_ready', charges_enabled: true, payouts_enabled: true } },
  });
  assert.deepEqual(flags, { id: 'acct_ready', chargesEnabled: true, payoutsEnabled: true });
  assert.equal(JSON.stringify(flags).includes('phone'), false);
  await assert.rejects(() => readStripeEvent(payload, header, 'whsec_other', now), /bad stripe signature/);
});

async function sign(secret: string, payload: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}
