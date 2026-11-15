import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SAMPLE_LISTING_TOKEN,
  approveListing,
  cleanListingProduct,
  listingAppearsInBrowse,
  listingStatusLabel,
  requestListingChanges,
} from '../src/listing.ts';
import { isShopVisible } from '../src/orderMath.ts';

test('approving a listing records the time and stays off the public shop', () => {
  const approved = approveListing('2026-11-15T12:00:00Z');
  assert.equal(approved.status, 'farm_approved');
  assert.equal(approved.approvedAt, '2026-11-15T12:00:00Z');
  assert.equal(listingStatusLabel(approved.status), 'approved');
  assert.equal(listingAppearsInBrowse(approved.status, true), false);
  assert.equal(listingAppearsInBrowse(approved.status, false), false);
  assert.equal(approved.shopVisible, false);
  assert.equal(isShopVisible('approved', 1), true);
  assert.notEqual(approved.status, 'approved');
});

test('asking for changes stores the note and does not publish', () => {
  const asked = requestListingChanges('  the peach price should be $4  ');
  assert.equal(asked.status, 'changes_requested');
  assert.equal(asked.changeNote, 'the peach price should be $4');
  assert.equal(listingStatusLabel(asked.status), 'changes requested');
  assert.equal(listingAppearsInBrowse(asked.status, true), false);
  assert.throws(() => requestListingChanges('   '), /tell us what to change/);
});

test('a listing product uses a catalog photo and a real price', () => {
  const product = cleanListingProduct({ name: ' peaches ', priceCents: 300, unit: 'lb', photoKey: 'peach' });
  assert.deepEqual(product, { name: 'peaches', priceCents: 300, unit: 'lb', photoKey: 'peach' });
  assert.throws(() => cleanListingProduct({ name: 'milk', priceCents: 10, unit: 'jug', photoKey: 'cow' }), /price/);
  assert.throws(() => cleanListingProduct({ name: 'milk', priceCents: 400, unit: 'jug', photoKey: 'not-a-photo' }), /catalog/);
  assert.equal(SAMPLE_LISTING_TOKEN.startsWith('lk_'), true);
  assert.equal(SAMPLE_LISTING_TOKEN.length > 16, true);
});
