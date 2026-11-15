import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SAMPLE_LISTING_TOKEN,
  approveListing,
  cleanListingProduct,
  cleanPriceFix,
  listingAppearsInBrowse,
  LISTING_REMOVED_LINE,
  denyListing,
  listingCanBePublished,
  listingInvite,
  listingShowsForm,
  listingStatusLabel,
  newListingToken,
  previewFarmCsv,
  priceNote,
  requestListingChanges,
  resendDeniedListing,
  shopFlagsForUdafCheck,
} from '../src/listing.ts';
import { isShopVisible } from '../src/orderMath.ts';
import { shopperCanSeeProduct } from '../src/review.ts';

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

const foods = [
  { name: 'peaches', synonyms: 'peach', photoKey: 'peach' },
  { name: 'eggs', synonyms: 'egg', photoKey: 'eggs' },
  { name: 'kale', synonyms: '', photoKey: 'placeholder' },
];

test('csv rows group by farm and flag a missing price or unknown unit', () => {
  const csv = [
    'farm,farmer_names,town,story,product,unit,price,source_url',
    'Sample Meadow Farm,ada cole,sample town,a made-up meadow,eggs,dozen,7,https://example.com/a',
    'Sample Meadow Farm,ada cole,sample town,a made-up meadow,kale,bunch,4,https://example.com/a',
    'Sample Orchard Stand,len park,nowhere creek,a made-up stand,peaches,lb,,https://example.com/b',
    'Sample Orchard Stand,len park,nowhere creek,a made-up stand,honey,crate,12,https://example.com/b',
  ].join('\n');
  const preview = previewFarmCsv(csv, foods);
  assert.equal(preview.farms.length, 2);
  assert.equal(preview.farms[0].products.length, 2);
  assert.equal(preview.farms[0].farmerNames, 'ada cole');
  assert.equal(preview.farms[0].products[0].photoKey, 'eggs');
  assert.equal(preview.farms[0].products[1].photoKey, 'placeholder');
  assert.equal(preview.unmatched.includes('kale'), false);
  assert.ok(preview.rowProblems.some((row) => row.problems.includes('missing price')));
  assert.ok(preview.rowProblems.some((row) => row.problems.some((problem) => problem.startsWith('unknown unit'))));
  assert.equal(preview.unmatched.includes('honey'), true);
  assert.equal(preview.farms[0].products[0].priceStatus, 'public');
  assert.equal(preview.farms[0].products[0].needsUdafCheck, false);
  assert.equal(listingShowsForm(0), true);
  assert.equal(listingShowsForm(preview.farms[0].products.length), false);
});

test('price status defaults to public, and a udaf check stays off the shop', () => {
  const csv = [
    'farm,farmer_names,town,story,product,unit,price,source_url,price_status,needs_udaf_check',
    'Sample Meadow Farm,ada cole,sample town,a made-up meadow,eggs,dozen,7,https://example.com/a,,',
    'Sample Meadow Farm,ada cole,sample town,a made-up meadow,kale,bunch,4,https://example.com/a,suggested,yes',
    'Sample Meadow Farm,ada cole,sample town,a made-up meadow,peaches,lb,3,https://example.com/a,converted,no',
    'Sample Meadow Farm,ada cole,sample town,a made-up meadow,kale,bunch,4,https://example.com/a,wholesale,maybe',
  ].join('\n');
  const preview = previewFarmCsv(csv, foods);
  assert.equal(preview.farms[0].products[0].priceStatus, 'public');
  assert.equal(preview.farms[0].products[0].needsUdafCheck, false);
  assert.equal(preview.farms[0].products[1].priceStatus, 'suggested');
  assert.equal(preview.farms[0].products[1].needsUdafCheck, true);
  assert.equal(preview.farms[0].products[2].priceStatus, 'converted');
  assert.equal(priceNote('public'), '');
  assert.equal(priceNote('suggested'), "suggested price. tell us if it's different.");
  assert.equal(priceNote('converted'), "suggested price. tell us if it's different.");
  assert.ok(preview.rowProblems.some((row) => row.problems.includes('unknown price status')));
  assert.ok(preview.rowProblems.some((row) => row.problems.includes('unknown udaf check')));
  const hidden = shopFlagsForUdafCheck(true);
  assert.equal(shopperCanSeeProduct({ active: hidden.active, needsUdaf: hidden.needsUdaf, udafOn: hidden.udafOn }), false);
  const plain = shopFlagsForUdafCheck(false);
  assert.equal(shopperCanSeeProduct({ active: plain.active, needsUdaf: plain.needsUdaf, udafOn: plain.udafOn }), true);
});

test('denying a listing records the reason, hides the page, and cannot publish it', () => {
  const denied = denyListing('2026-11-15T15:00:00Z', '  not for us  ');
  assert.equal(denied.status, 'farm_denied');
  assert.equal(denied.deniedAt, '2026-11-15T15:00:00Z');
  assert.equal(denied.denyReason, 'not for us');
  assert.equal(denied.shopVisible, false);
  assert.equal(listingStatusLabel(denied.status), 'denied');
  assert.equal(listingAppearsInBrowse(denied.status, false), false);
  assert.equal(listingCanBePublished(denied.status), false);
  assert.equal(listingCanBePublished('farm_approved'), false);
  const blank = denyListing('2026-11-15T15:00:00Z', '   ');
  assert.equal(blank.denyReason, '');
  assert.throws(() => denyListing('2026-11-15T15:00:00Z', 'x'.repeat(161)), /one line/);
  const resent = resendDeniedListing({ status: 'farm_denied', nextToken: newListingToken() });
  assert.equal(resent.status, 'sent');
  assert.notEqual(resent.token, SAMPLE_LISTING_TOKEN);
  assert.equal(listingCanBePublished(resent.status), false);
  assert.throws(() => resendDeniedListing({ status: 'sent', nextToken: newListingToken() }), /denied page/);
  assert.equal(LISTING_REMOVED_LINE, "got it. we've removed your page. thank you for your time.");
});

test('a price fix stores the product and the cents and does not publish the draft', () => {
  const fix = cleanPriceFix({ productId: 4, productName: ' peaches ', price: '$4.50' });
  assert.deepEqual(fix, { productId: 4, productName: 'peaches', priceCents: 450 });
  assert.equal(cleanPriceFix({ productName: 'eggs', price: '7' }).productId, null);
  assert.throws(() => cleanPriceFix({ productName: 'eggs', price: 'nope' }), /price/);
  assert.equal(listingCanBePublished('farm_approved'), false);
  assert.equal(listingAppearsInBrowse('farm_approved', false), false);
});

test('the invite uses the first farmer name and the private link', () => {
  const text = listingInvite({
    farmerNames: 'ada cole',
    farmName: 'Sample Meadow Farm',
    link: 'https://mainz.example/listing/lk_abc',
  });
  assert.equal(text, "hi ada, it's caty from mainz. we love what you grow and made your farm its own page. take a peek and tap approve if it feels right. if anything's off, just tell us and we'll fix it: https://mainz.example/listing/lk_abc");
  const farmOnly = listingInvite({ farmerNames: '', farmName: 'Sample Orchard Stand', link: '/listing/lk_abc' });
  assert.ok(farmOnly.startsWith('hi Sample'));
});
