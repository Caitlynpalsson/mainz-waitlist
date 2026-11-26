import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PICKUP_ONLY_LINE,
  SHORT_RUN_NOTE,
  cleanRouteInput,
  closeRunDecision,
  cutoffInstantForRun,
  deliveryFeeLabel,
  deliveryFeeOnPlace,
  followingRun,
  nextDelivery,
  offerForAddress,
  parseAddress,
  routeWeekdayForStops,
  partnerSheet,
  routeDeliverySlots,
  restoreDeliveryFee,
  runCountLabel,
  waiveDeliveryFee,
  zonedInstant,
  type AreaRoute,
} from '../src/delivery.ts';
import { priceGroups } from '../src/orderMath.ts';

const provo: AreaRoute = {
  id: 1,
  name: 'sample provo',
  area: ['84601', '84604', '84606', 'provo'],
  deliveryDay: 2,
  cutoffDay: 1,
  cutoffTime: '18:00',
  active: true,
  minOrders: 3,
  targetOrders: 5,
};

const fork: AreaRoute = {
  id: 2,
  name: 'sample spanish fork',
  area: ['84660', 'spanish fork'],
  deliveryDay: 4,
  cutoffDay: 3,
  cutoffTime: '18:00',
  active: true,
  minOrders: 3,
  targetOrders: 5,
};

const sundayMorning = zonedInstant(2026, 11, 15, 10, 0);

test('a provo order on sunday still makes tuesday, and monday 6pm closes it', () => {
  const open = nextDelivery(provo, sundayMorning);
  assert.equal(open.runDate, '2026-11-17');
  assert.equal(open.line, 'delivers tue, nov 17. order by mon 6pm.');
  assert.equal(cutoffInstantForRun('2026-11-17', provo).toISOString(), zonedInstant(2026, 11, 16, 18, 0).toISOString());
  const stillOpen = nextDelivery(provo, zonedInstant(2026, 11, 16, 17, 59));
  assert.equal(stillOpen.runDate, '2026-11-17');
  const closed = nextDelivery(provo, zonedInstant(2026, 11, 16, 18, 0));
  assert.equal(closed.runDate, '2026-11-24');
  assert.equal(closed.line, 'delivers tue, nov 24. order by mon 6pm.');
  assert.equal(followingRun(provo, '2026-11-17'), '2026-11-24');
  const slots = routeDeliverySlots(provo, sundayMorning, 2);
  assert.deepEqual(slots.map((slot) => slot.label), ['tue, nov 17', 'tue, nov 24']);
  assert.equal(slots[0].runDate, open.runDate);
});

test('spanish fork delivers thursday and a zip match beats the town', () => {
  const next = nextDelivery(fork, sundayMorning);
  assert.equal(next.runDate, '2026-11-19');
  assert.equal(next.line, 'delivers thu, nov 19. order by wed 6pm.');
  const byZip = offerForAddress(parseAddress('10 center st', 'spanish fork 84601'), [provo, fork], sundayMorning);
  assert.equal(byZip.routeId, 1);
  assert.equal(byZip.line, 'delivers tue, nov 17. order by mon 6pm.');
  const byTown = offerForAddress(parseAddress('10 center st', 'spanish fork, ut'), [provo, fork], sundayMorning);
  assert.equal(byTown.name, 'sample spanish fork');
  const none = offerForAddress(parseAddress('10 center st', 'logan ut 84321'), [provo, fork], sundayMorning);
  assert.equal(none.pickupOnly, true);
  assert.equal(none.line, PICKUP_ONLY_LINE);
  const off = offerForAddress(parseAddress('10 center st', '84601'), [{ ...provo, active: false }], sundayMorning);
  assert.equal(off.matched, false);
});

test('a short run waives the delivery fee and a full run confirms', () => {
  assert.equal(closeRunDecision(2, 3), 'short');
  assert.equal(closeRunDecision(3, 3), 'confirmed');
  assert.equal(runCountLabel(2, 3, 5), '2 of 3 min, target 5');
  const waived = waiveDeliveryFee({ merchandiseCents: 3000, platformFeeCents: 150, deliveryFeeCents: 500 });
  assert.equal(waived.deliveryFeeState, 'waived');
  assert.equal(waived.deliveryFeeCents, 0);
  assert.equal(waived.totalCents, 3150);
  assert.equal(waived.quotedDeliveryFeeCents, 500);
  const moved = restoreDeliveryFee({ merchandiseCents: 3000, platformFeeCents: 150, quotedDeliveryFeeCents: waived.quotedDeliveryFeeCents });
  assert.equal(moved.deliveryFeeState, 'not_charged');
  assert.equal(moved.totalCents, 3650);
  assert.equal(moved.routeStatus, 'pending_route');
  assert.equal(deliveryFeeOnPlace(false), 'not_charged');
  assert.equal(deliveryFeeOnPlace(true), 'held');
  assert.equal(deliveryFeeLabel('not_charged', 500), 'delivery fee');
  assert.equal(deliveryFeeLabel('not_charged', 0), 'delivery fee, not charged yet');
  assert.equal(deliveryFeeLabel('waived', 0), 'delivery fee, not charged');
  assert.match(SHORT_RUN_NOTE, /switch to pickup/);
  const priced = priceGroups([{
    farmId: 1,
    fulfillment: 'delivery',
    windowLabel: 'tue',
    lines: [{ farmId: 1, productId: 1, optionId: null, qty: 1, unitPriceCents: 1000, name: 'eggs', optionLabel: '', unit: 'dozen' }],
  }], { platformFeeBps: 500, deliveryFeeCents: 500 });
  assert.equal(priced.deliveryFeeCents, 500);
});

test('a new route defaults to 3 and 5, and the partner list is plain text', () => {
  const cleaned = cleanRouteInput({ name: 'sample orem', area: '84057, orem', deliveryDay: 'tue', cutoffDay: 'mon', cutoffTime: '6pm' });
  assert.equal(cleaned.minOrders, 3);
  assert.equal(cleaned.targetOrders, 5);
  assert.equal(cleaned.cutoffTime, '18:00');
  assert.deepEqual(cleaned.area, ['84057', 'orem']);
  assert.equal(cleaned.isSample, true);
  const text = partnerSheet({ name: 'sample provo', runDate: '2026-11-17', status: 'confirmed' }, [
    {
      name: 'Ada Cole',
      address: '10 Center St, Provo 84601',
      phone: '8015550100',
      items: [{ qty: 2, name: 'Peaches' }],
      pickups: ['Willow Creek Farm, 4100 S 1700 W'],
      note: 'gate code 12',
    },
    {
      name: 'Len Park',
      address: '4 Orchard Rd, Provo 84601',
      phone: '8015550199',
      items: [{ qty: 1, name: 'Eggs' }],
      pickups: ['Willow Creek Farm, 4100 S 1700 W'],
      note: '',
    },
  ]);
  assert.match(text, /sample provo · tue, nov 17 · confirmed/);
  assert.equal(text.indexOf('pick up from: willow creek farm, 4100 s 1700 w'), text.lastIndexOf('pick up from: willow creek farm, 4100 s 1700 w'));
  assert.ok(text.indexOf('pick up from:') < text.indexOf('ada cole'));
  assert.match(text, /ada cole/);
  assert.match(text, /10 center st, provo 84601/);
  assert.match(text, /8015550100/);
  assert.match(text, /2 peaches/);
  assert.match(text, /note: gate code 12/);
  assert.doesNotMatch(text, /pickup:/);
});

test('a delivery pill appears only when a stop sits on a route', () => {
  assert.equal(routeWeekdayForStops([{ zip: '84601', town: 'provo' }], [provo, fork]), 'tue');
  assert.equal(routeWeekdayForStops([{ zip: '84660', town: 'spanish fork' }], [provo, fork]), 'thu');
  assert.equal(routeWeekdayForStops([{ zip: '84119', town: 'west valley' }], [provo, fork]), '');
  assert.equal(routeWeekdayForStops([], [provo]), '');
});
