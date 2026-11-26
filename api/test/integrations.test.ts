import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WEB_PUSH_ENABLED,
  aiHelper,
  emailFromEnv,
  photoStore,
  scrubMail,
  scrubTelemetry,
  taxCalculator,
  toCsv,
  verifyTurnstile,
} from '../src/integrations.ts';

test('optional services stay off until their env is set', async () => {
  let called = 0;
  const email = emailFromEnv({}, async () => { called += 1; return new Response('{}'); });
  await email.sendOrderConfirmation({ to: 'shopper@example.com', orderId: 'mz_1', summary: 'call 972-510-3326 acct_secret' });
  assert.equal(called, 0);
  const live = emailFromEnv({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'hello@example.com' }, async (_url, init) => {
    called += 1;
    const body = JSON.parse(String(init?.body || '{}')) as { text: string };
    assert.equal(body.text.includes('972'), false);
    assert.equal(body.text.includes('acct_'), false);
    return new Response('{}');
  });
  await live.sendOrderConfirmation({ to: 'shopper@example.com', orderId: 'mz_1', summary: 'call 972-510-3326 about acct_abc' });
  assert.equal(called, 1);
  assert.equal(await verifyTurnstile(undefined, ''), true);
  assert.equal(await verifyTurnstile('secret', '', async () => new Response(JSON.stringify({ success: false }))), false);
  assert.equal(photoStore({}).kind, 'd1');
  assert.equal((await taxCalculator.quote(100)).label, 'tax not collected');
  assert.equal(await aiHelper().ask('hi'), '');
  assert.equal(WEB_PUSH_ENABLED, false);
  assert.equal(scrubTelemetry('a@b.co 555-111-2222').includes('@'), false);
  assert.equal(scrubMail('acct_live'), '[account]');
  assert.equal(toCsv([{ id: 'mz_1', note: 'a,b' }]).includes('"a,b"'), true);
});
