import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  checkoutChoices,
  parseFulfillment,
  renderPickupOption,
} from '../src/fulfillment.ts';

const raw = readFileSync(new URL('../samples/87-farms-fulfillment.json', import.meta.url), 'utf8');
const farms = parseFulfillment(raw);

test('87 farms pickup options render with the farm, sunday, and wednesday stops', () => {
  assert.equal(farms.offersDelivery, false);
  assert.equal(farms.options.length, 10);
  const shown = farms.options.flatMap(renderPickupOption);
  assert.ok(shown.some((line) => line.includes('987 utah 31, huntington')));
  assert.ok(shown.some((line) => line.includes('any day by appointment')));
  assert.ok(shown.some((line) => line.includes('12:00-1:00pm, 3:00-4:00pm')));
  assert.ok(shown.some((line) => line.includes('3:30-5:30pm')));
  assert.ok(shown.some((line) => line.includes("john's marketplace")));
  assert.ok(shown.some((line) => line.includes('abl trucking')));
  assert.ok(shown.every((line) => line === 'free' || !line.startsWith('$')));
  assert.ok(farms.options.every((option) => option.feeCents === 0 && option.minimumCents == null));
});

test('a phone number is never rendered', () => {
  const dirty = parseFulfillment({
    offersDelivery: false,
    options: [{
      name: 'the farm',
      address: '987 Utah 31, Huntington',
      schedule: 'call 435-609-1700 to arrange a time',
      windows: [],
      cutoff: 'order by noon. also 435-609-1334',
      feeCents: 0,
      minimumCents: 0,
    }],
  });
  const shown = dirty.options.flatMap(renderPickupOption).join('\n');
  assert.equal(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(shown), false);
  assert.equal(shown.includes('435'), false);
});

test('delivery is offered only when a route covers the zip', () => {
  const covered = checkoutChoices(farms.options, true);
  const outside = checkoutChoices(farms.options, false);
  assert.equal(covered.delivery, true);
  assert.equal(outside.delivery, false);
  assert.equal(outside.pickup.length, 10);
  assert.ok(outside.pickup.some((label) => label.startsWith('vanguard · 12:00-1:00pm')));
  assert.ok(outside.pickup.some((label) => label.startsWith("john's marketplace · wednesday")));
});
