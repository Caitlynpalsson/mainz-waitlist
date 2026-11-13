import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isShopVisible } from '../src/orderMath.ts';
import {
  decisionEffect,
  documentHints,
  rankProducts,
  repeatBuyers,
  salesReport,
  scoreLine,
  type LedgerOrder,
} from '../src/review.ts';

const now = new Date('2026-11-13T12:00:00Z');

function order(partial: Partial<LedgerOrder> & Pick<LedgerOrder, 'createdAt' | 'totalCents' | 'merchandiseCents'>): LedgerOrder {
  return {
    email: '',
    phone: '',
    name: '',
    ...partial,
  };
}

test('only approve and approve with conditions put a farm on the site', () => {
  const plain = decisionEffect('approve', '');
  const conditions = decisionEffect('approve_conditions', 'fix the cooler before june');
  const waiting = decisionEffect('waitlist', 'full this season');
  const declined = decisionEffect('decline', '');
  assert.equal(isShopVisible(plain.status, plain.active), true);
  assert.equal(isShopVisible(conditions.status, conditions.active), true);
  assert.equal(conditions.conditionsNote, 'fix the cooler before june');
  assert.equal(isShopVisible(waiting.status, waiting.active), false);
  assert.equal(waiting.status, 'waitlist');
  assert.equal(isShopVisible(declined.status, declined.active), false);
  assert.equal(declined.status, 'declined');
  assert.equal(isShopVisible('approved', 0), false);
  assert.equal(isShopVisible('pending', 1), false);
  assert.throws(() => decisionEffect('approve_conditions', '   '), /needs a note/);
  assert.throws(() => decisionEffect('maybe', ''), /not on the list/);
});

test('document hints follow the product words and always include sales tax', () => {
  assert.deepEqual(documentHints('eggs from the hens'), ['egg_license', 'sales_tax_license']);
  assert.deepEqual(documentHints('beef and eggs'), ['egg_license', 'meat_inspection', 'sales_tax_license']);
  assert.deepEqual(documentHints('raw milk, fridays'), ['raw_milk_permit', 'sales_tax_license']);
  assert.ok(documentHints('bread, cookies, and jam').includes('cottage_food'));
  assert.deepEqual(documentHints('peaches'), ['sales_tax_license']);
  assert.equal(documentHints('eggplant').includes('egg_license'), false);
});

test('dashboard totals split all-time, 7 days, and 30 days', () => {
  const orders = [
    order({ name: 'Ada', email: 'ada@example.com', phone: '801-555-0142', merchandiseCents: 1900, totalCents: 2495, createdAt: '2026-11-11 12:00:00' }),
    order({ name: 'Ada', email: 'ada@example.com', phone: '801-555-0142', merchandiseCents: 1400, totalCents: 1470, createdAt: '2026-11-08 12:00:00' }),
    order({ name: 'Jo', email: '', phone: '801-555-0177', merchandiseCents: 700, totalCents: 735, createdAt: '2026-11-10 12:00:00' }),
    order({ name: 'Jo', email: 'neighbor@example.com', phone: '(801) 555-0177', merchandiseCents: 400, totalCents: 420, createdAt: '2026-11-03 12:00:00' }),
    order({ name: 'May', email: 'may@example.com', merchandiseCents: 600, totalCents: 630, createdAt: '2026-10-29 12:00:00' }),
    order({ name: 'Lee', email: 'lee@example.com', merchandiseCents: 1400, totalCents: 1970, createdAt: '2026-10-04 12:00:00' }),
  ];
  const report = salesReport(orders, now);
  assert.deepEqual(report.allTime, { orders: 6, merchandiseCents: 6400, totalCents: 7720 });
  assert.deepEqual(report.last7Days, { orders: 3, merchandiseCents: 4000, totalCents: 4700 });
  assert.deepEqual(report.last30Days, { orders: 5, merchandiseCents: 5000, totalCents: 5750 });
});

test('top products rank by units and by revenue', () => {
  const items = [
    { name: 'Strawberries', units: 2, revenueCents: 1200 },
    { name: 'strawberries', units: 1, revenueCents: 600 },
    { name: 'eggs', units: 1, revenueCents: 700 },
    { name: 'eggs', units: 1, revenueCents: 700 },
    { name: 'raw honey', units: 1, revenueCents: 1400 },
    { name: 'raw honey', units: 1, revenueCents: 1400 },
    { name: 'carrots', units: 1, revenueCents: 400 },
  ];
  assert.deepEqual(rankProducts(items, 'units').map((row) => [row.name, row.units]), [
    ['strawberries', 3],
    ['raw honey', 2],
    ['eggs', 2],
    ['carrots', 1],
  ]);
  assert.equal(rankProducts(items, 'revenue')[0].name, 'raw honey');
  assert.equal(rankProducts(items, 'revenue')[0].revenueCents, 2800);
});

test('repeat buyers group by email or phone, and a single order does not count', () => {
  const buyers = repeatBuyers([
    order({ name: 'Ada Cole', email: 'Ada@example.com', phone: '801-555-0142', merchandiseCents: 1900, totalCents: 2495, createdAt: '2026-11-11 12:00:00' }),
    order({ name: 'Ada Cole', email: 'ada@example.com', phone: '', merchandiseCents: 1400, totalCents: 1470, createdAt: '2026-11-08 12:00:00' }),
    order({ name: 'Jo P.', email: '', phone: '801-555-0177', merchandiseCents: 700, totalCents: 735, createdAt: '2026-11-10 12:00:00' }),
    order({ name: 'Jo P.', email: 'neighbor@example.com', phone: '(801) 555-0177', merchandiseCents: 400, totalCents: 420, createdAt: '2026-11-03 12:00:00' }),
    order({ name: 'May', email: 'may@example.com', merchandiseCents: 600, totalCents: 630, createdAt: '2026-10-29 12:00:00' }),
  ]);
  assert.equal(buyers.length, 2);
  assert.equal(buyers[0].email, 'ada@example.com');
  assert.equal(buyers[0].orders, 2);
  assert.equal(buyers[0].totalCents, 3965);
  assert.equal(buyers[1].phone, '8015550177');
  assert.equal(buyers[1].orders, 2);
  assert.equal(buyers[1].totalCents, 1155);
  assert.equal(buyers.some((buyer) => buyer.email === 'may@example.com'), false);
});

test('the score line counts pass, needs work, and no', () => {
  assert.equal(scoreLine([
    { mark: 'pass' },
    { mark: 'pass' },
    { mark: 'needs_work' },
    { mark: 'no' },
    { mark: '' },
  ]), '2 pass · 1 needs work · 1 no · 1 not scored');
});
