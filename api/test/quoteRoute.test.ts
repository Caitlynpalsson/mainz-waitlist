import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unstable_dev } from 'wrangler';
import type { Unstable_DevWorker } from 'wrangler';

const PICKUP_ONLY = "we don't deliver there yet. pickup is ready when you are.";

test('a quote for a zip with no route returns pickup only', async (t) => {
  const worker: Unstable_DevWorker = await unstable_dev('src/index.ts', {
    config: 'wrangler.toml',
    experimental: { disableExperimentalWarning: true },
    local: true,
  });
  t.after(async () => {
    await worker.stop();
  });
  const response = await worker.fetch('http://example.com/api/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: 2, qty: 1 }],
      groups: [{ farmId: 1, fulfillment: 'delivery', windowLabel: 'wed · 9–11 am' }],
      address: { line1: '10 center st', cityZip: 'logan ut 84321' },
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    route: { pickupOnly: boolean; matched: boolean; line: string; slots: unknown[] };
    groups: { fulfillment: string; windowLabel: string }[];
  };
  assert.equal(body.route.pickupOnly, true);
  assert.equal(body.route.matched, false);
  assert.equal(body.route.line, PICKUP_ONLY);
  assert.deepEqual(body.route.slots, []);
  assert.equal(body.groups[0].fulfillment, 'pickup');
  assert.doesNotMatch(body.groups[0].windowLabel, /wed|thu/);
});
