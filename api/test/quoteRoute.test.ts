import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { test } from 'node:test';
import { unstable_dev } from 'wrangler';
import type { Unstable_DevWorker } from 'wrangler';

function orderCount(): number {
  const raw = execSync('npx wrangler d1 execute mainz --local --json --command "SELECT COUNT(*) AS n FROM orders"', { encoding: 'utf8' });
  const parsed = JSON.parse(raw.slice(raw.indexOf('['))) as { results: { n: number }[] }[];
  return parsed[0].results[0].n;
}

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

test('a draft preview quote does not create an order or a payment', async (t) => {
  const worker: Unstable_DevWorker = await unstable_dev('src/index.ts', {
    config: 'wrangler.toml',
    experimental: { disableExperimentalWarning: true },
    local: true,
  });
  t.after(async () => {
    await worker.stop();
  });
  const listing = await worker.fetch('http://example.com/api/listings/lk_4c8e91ab7d2f60e3a15b84c0');
  assert.equal(listing.status, 200);
  const page = await listing.json() as { products: { id: number; availability?: string }[] };
  const product = page.products.find((item) => item.availability !== 'next batch coming') || page.products[0];
  const before = orderCount();
  const response = await worker.fetch('http://example.com/api/listings/lk_4c8e91ab7d2f60e3a15b84c0/preview-quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: product.id, qty: 1 }],
      groups: [{ fulfillment: 'delivery', windowLabel: '' }],
      address: { line1: '10 center st', cityZip: 'provo 84601' },
    }),
  });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.equal(/stripe|client_secret|card/i.test(text), false);
  const body = JSON.parse(text) as { preview: boolean; payment: null; totalCents: number };
  assert.equal(body.preview, true);
  assert.equal(body.payment, null);
  assert.equal(body.totalCents > 0, true);
  assert.equal(orderCount(), before);
});
