import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupLines, isShopVisible, priceGroups, type IncomingItem } from '../src/orderMath.ts';

const rates = { platformFeeBps: 500, deliveryFeeCents: 500 };

test('a farm is public only when it is approved and switched on', () => {
  assert.equal(isShopVisible('approved', 1), true);
  assert.equal(isShopVisible('approved', true), true);
  assert.equal(isShopVisible('approved', 0), false);
  assert.equal(isShopVisible('pending', 1), false);
  assert.equal(isShopVisible('rejected', 1), false);
  assert.equal(isShopVisible('pending', 0), false);
});

test('lines from two farms group together and duplicate rows merge', () => {
  const items: IncomingItem[] = [
    line(1, 10, 100, 1, 600, 'strawberries', 'pint'),
    line(1, 10, 100, 1, 600, 'strawberries', 'pint'),
    line(1, 11, null, 1, 700, 'eggs', ''),
    line(2, 20, null, 1, 1400, 'raw honey', ''),
  ];
  const groups = groupLines(items);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups[0].map((item) => [item.productId, item.optionId, item.qty]),
    [
      [10, 100, 2],
      [11, null, 1],
    ],
  );
  assert.equal(groups[1][0].qty, 1);
  assert.equal(groups[1][0].farmId, 2);
});

test('zero quantities are dropped', () => {
  const groups = groupLines([line(1, 1, null, 0, 100, 'kale', '')]);
  assert.equal(groups.length, 0);
});

test('the sample bag prices to $39.65 when only one farm delivers', () => {
  // Willow Creek: 2 pints strawberries + 1 dozen eggs, delivery.
  // Bee Loud: 1 jar honey, pickup.
  // 5% of $19.00 is $0.95. 5% of $14.00 is $0.70. One $5 delivery fee.
  const groups = groupLines([
    line(1, 10, 100, 2, 600, 'strawberries', 'pint'),
    line(1, 11, null, 1, 700, 'eggs', ''),
    line(2, 20, null, 1, 1400, 'raw honey', ''),
  ]);
  const priced = priceGroups(
    [
      { farmId: 1, fulfillment: 'delivery', windowLabel: 'wed · 9–11 am', lines: groups[0] },
      { farmId: 2, fulfillment: 'pickup', windowLabel: 'fri · 10 am–4 pm', lines: groups[1] },
    ],
    rates,
  );
  assert.equal(priced.groups[0].merchandiseCents, 1900);
  assert.equal(priced.groups[0].deliveryFeeCents, 500);
  assert.equal(priced.groups[0].platformFeeCents, 95);
  assert.equal(priced.groups[0].farmTransferCents, 1900);
  assert.equal(priced.groups[1].merchandiseCents, 1400);
  assert.equal(priced.groups[1].deliveryFeeCents, 0);
  assert.equal(priced.groups[1].platformFeeCents, 70);
  assert.equal(priced.merchandiseCents, 3300);
  assert.equal(priced.deliveryFeeCents, 500);
  assert.equal(priced.platformFeeCents, 165);
  assert.equal(priced.totalCents, 3965);
});

test('each delivering farm adds its own placeholder delivery fee', () => {
  const groups = groupLines([
    line(1, 10, null, 1, 500, 'carrots', ''),
    line(2, 20, null, 1, 500, 'honey', ''),
  ]);
  const priced = priceGroups(
    [
      { farmId: 1, fulfillment: 'delivery', windowLabel: '', lines: groups[0] },
      { farmId: 2, fulfillment: 'delivery', windowLabel: '', lines: groups[1] },
    ],
    rates,
  );
  assert.equal(priced.deliveryFeeCents, 1000);
  assert.equal(priced.groups[0].platformFeeCents, 25);
  assert.equal(priced.groups[1].platformFeeCents, 25);
});

test('platform fee rounds to the nearest cent per farm, then sums', () => {
  const groups = groupLines([line(1, 1, null, 1, 333, 'kale', '')]);
  const priced = priceGroups(
    [{ farmId: 1, fulfillment: 'pickup', windowLabel: '', lines: groups[0] }],
    rates,
  );
  // 333 * 5% = 16.65 cents, which rounds to 17.
  assert.equal(priced.platformFeeCents, 17);
  assert.equal(priced.deliveryFeeCents, 0);
  assert.equal(priced.totalCents, 350);
});

function line(
  farmId: number,
  productId: number,
  optionId: number | null,
  qty: number,
  unitPriceCents: number,
  name: string,
  optionLabel: string,
): IncomingItem {
  return {
    farmId,
    productId,
    optionId,
    qty,
    unitPriceCents,
    name,
    optionLabel,
    unit: optionLabel || 'each',
  };
}
