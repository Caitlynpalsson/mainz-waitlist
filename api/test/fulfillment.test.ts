import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  checkoutChoices,
  defaultFulfillment,
  checkoutSpots,
  nearestPickupChoices,
  orderPickupOptions,
  parseFulfillment,
  pickupCardLine,
  pickupTownLine,
  renderPickupOption,
  showDeliveryFee,
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

test('nearest pickup spot is the closest zip, then the rest stay in order', () => {
  const riverton = orderPickupOptions(farms.options, '84065');
  assert.equal(riverton[0].name, "Marie's");
  assert.equal(riverton[riverton.length - 1].name, 'the farm');
  const huntington = orderPickupOptions(farms.options, '84528');
  assert.equal(huntington[0].name, 'the farm');
  assert.notEqual(huntington[1].name, 'the farm');
  const woodsCross = orderPickupOptions(farms.options, '84087');
  assert.equal(woodsCross[0].name, 'ABL Trucking');
  const westValley = orderPickupOptions(farms.options, '84119');
  assert.equal(westValley[0].schedule, 'sunday');
  assert.equal(westValley[0].name, 'Vanguard');
  assert.equal(westValley[1].name, 'Vanguard');
  assert.ok(westValley.findIndex((option) => option.name === 'the farm') > westValley.findIndex((option) => option.name === "Marie's"));
  const card = pickupCardLine(farms.options.find((option) => option.name === 'Vanguard' && option.schedule === 'wednesday')!);
  assert.equal(card, 'pick up wed 3:30-5:30pm · vanguard, west valley · order by mon 5pm');
  assert.equal(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(farms.options.map(pickupCardLine).join('\n')), false);
});

test('missing pickup coordinates fall back to the zip, not 0,0', () => {
  const withNulls = parseFulfillment({
    offersDelivery: false,
    options: [
      { name: 'the farm', address: '987 Utah 31, Huntington, UT 84528', zip: '84528', lat: null, lng: null, schedule: 'any day by appointment', windows: [], cutoff: '', feeCents: 0 },
      { name: "Marie's", address: '3568 New Private Drive, Riverton, UT', zip: '84065', lat: null, lng: null, schedule: 'wednesday', windows: [], cutoff: 'order by mon 5pm', feeCents: 0 },
    ],
  });
  assert.equal(withNulls.options[0].lat, null);
  assert.equal(withNulls.options[0].lng, null);
  const provo = orderPickupOptions(withNulls.options, '84601');
  assert.equal(provo[0].name, "Marie's");
  assert.equal(provo[1].name, 'the farm');
});

test('the farm page names pickup towns once, and does not list the stops', () => {
  assert.equal(pickupTownLine(farms.options), 'pickup in huntington and the salt lake valley');
  assert.equal(pickupTownLine(farms.options, 'Pickup in town'), 'pickup in town');
  assert.equal(pickupTownLine([]), '');
  assert.equal(pickupTownLine([], 'pickup in town'), '');
  const line = pickupTownLine(farms.options);
  assert.equal(line.includes('vanguard'), false);
  assert.equal(line.includes('84119'), false);
  assert.equal(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line), false);
  const near = nearestPickupChoices(farms.options, '84065');
  assert.equal(near.length, 2);
  assert.equal(near[0].name, "Marie's");
  assert.notEqual(near[1].name, 'the farm');
});

test('see other spots lists every stop, with the nearest one first', () => {
  const spots = checkoutSpots(farms.options, '84119');
  assert.equal(spots.nearest?.name, 'Vanguard');
  assert.equal(spots.alternative?.name, 'Vanguard');
  assert.equal(spots.all.length, farms.options.length);
  assert.equal(spots.all[spots.all.length - 1].name, 'the farm');
  assert.ok(spots.all.some((option) => option.address.includes('Huntington')));
});

test('a farm with its own pickup spots starts on pickup, and the delivery fee waits', () => {
  assert.equal(defaultFulfillment(true, true), 'pickup');
  assert.equal(defaultFulfillment(false, true), 'delivery');
  assert.equal(showDeliveryFee('pickup', true), false);
  assert.equal(showDeliveryFee('delivery', false), false);
  assert.equal(showDeliveryFee('delivery', true), true);
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
