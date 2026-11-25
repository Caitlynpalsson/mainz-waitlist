import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bankConnected } from '../src/payout.ts';
import {
  SAMPLE_LISTING_TOKEN,
  isListingToken,
  approveListing,
  cleanListingProduct,
  cleanPriceFix,
  draftDisplayPrice,
  listingAppearsInBrowse,
  LISTING_CONFIRM_LINE,
  PICKUP_WORKS_LINE,
  howPickupWorks,
  WHY_MAINZ_LINES,
  ONBOARDING_DONE,
  ONBOARDING_SMS,
  ONBOARDING_TEXT_LINE,
  ONBOARDING_TEXT_US,
  ONBOARDING_WELCOME,
  farmPortrait,
  PAY_PREF_LABELS,
  PAY_STEP_LINE,
  PAY_STEP_TITLE,
  onboardingQuestions,
  onboardingStep,
  payPrefForSave,
  payPrefFromChoice,
  payPrefLabel,
  publicOnboarding,
  meetTheFarmLines,
  storyLines,
  LISTING_REMOVED_LINE,
  STAFF_PREVIEW_TAG,
  shopperPreviewPath,
  staffShopperFromDraft,
  LISTING_THANKS_LINE,
  cleanPageRemoval,
  denyListing,
  listingCanBePublished,
  listingInvite,
  LISTING_NEXT_BATCH,
  listingShowsForm,
  parseAvailability,
  listingStatusLabel,
  newListingToken,
  PREVIEW_PAY_LINE,
  previewCheckout,
  previewFarmCsv,
  previewItemAddable,
  priceNote,
  requestListingChanges,
  resendDeniedListing,
  staffApproveListing,
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
  assert.equal(listingAppearsInBrowse('farm_approved', false), false);
  assert.equal(isShopVisible('approved', 1), true);
  const staff = staffApproveListing('farm_approved', '2026-11-15T18:00:00Z');
  assert.equal(staff.staffApprovedAt, '2026-11-15T18:00:00Z');
  assert.equal(staff.shopVisible, false);
  assert.equal(listingAppearsInBrowse('farm_approved', true), false);
  assert.throws(() => staffApproveListing('sent', '2026-11-15T18:00:00Z'), /farm confirms/);
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
  assert.equal(isListingToken(SAMPLE_LISTING_TOKEN), true);
  assert.equal(isListingToken('lk_' + 'a'.repeat(32)), true);
  assert.equal(isListingToken('lk_' + 'a'.repeat(23)), false);
  assert.equal(isListingToken('lk_' + 'a'.repeat(33)), false);
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
  assert.equal(preview.farms[0].profilePhoto, '');
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
  assert.equal(LISTING_REMOVED_LINE, "thanks for letting us know 💛 if you ever change your mind, text us at 972-510-3326.");
  assert.equal(LISTING_REMOVED_LINE.includes('972-510-3326'), true);
  const shopper = staffShopperFromDraft({
    farmName: '87 Farms',
    location: 'Huntington, UT',
    story: 'a family dairy',
    status: 'sent',
    profilePhoto: 'profile-87-farms',
    pickupLine: 'pickup in huntington',
    products: [{ id: 2, name: 'eggs', priceCents: 700, unit: 'dozen', photoKey: '87-eggs' }],
  });
  assert.equal(shopper.shopVisible, false);
  assert.equal(shopper.tag, STAFF_PREVIEW_TAG);
  assert.equal(shopper.status, 'sent');
  assert.equal(shopper.farm.city, 'Huntington');
  assert.equal(listingAppearsInBrowse(shopper.status, false), false);
  assert.equal(JSON.stringify(shopper).includes('phone'), false);
  assert.equal(shopperPreviewPath('lk_b3f152461550767e5f9c0f5dbf2f6d97'), '/listing/lk_b3f152461550767e5f9c0f5dbf2f6d97/shopper');
  assert.deepEqual(cleanPageRemoval("  other  ", "  the prices  "), { denyReason: 'other', denyNote: 'the prices' });
  assert.deepEqual(cleanPageRemoval("i don't want this service", 'skip this'), { denyReason: "i don't want this service", denyNote: '' });
  assert.equal(cleanPageRemoval('other', 'x'.repeat(300)).denyNote.length, 280);
  assert.throws(() => cleanPageRemoval('nope', ''), /reason/);
  assert.equal(LISTING_CONFIRM_LINE, "once you confirm, our team gives your page a final look. thank you for growing such good food.");
  assert.equal(LISTING_THANKS_LINE, "thank you. we're so happy to have you. our team is giving your page a final look.");
  assert.equal(/launch|goes live|approved to receive orders|coming soon|not taking orders|orders open at launch|pre-launch/i.test(`${LISTING_CONFIRM_LINE} ${LISTING_THANKS_LINE} ${LISTING_REMOVED_LINE}`), false);
});

test('a price fix stores the product and the cents and does not publish the draft', () => {
  const fix = cleanPriceFix({ productId: 4, productName: ' peaches ', price: '$4.50' });
  assert.deepEqual(fix, { productId: 4, productName: 'peaches', priceCents: 450 });
  assert.equal(cleanPriceFix({ productName: 'eggs', price: '7' }).productId, null);
  assert.throws(() => cleanPriceFix({ productName: 'eggs', price: 'nope' }), /price/);
  assert.equal(listingCanBePublished('farm_approved'), false);
  assert.equal(listingAppearsInBrowse('farm_approved', false), false);
  const shown = draftDisplayPrice(
    { id: 4, name: 'peaches', priceCents: 300 },
    [{ productId: 4, productName: 'peaches', priceCents: 450 }, { productId: 4, productName: 'peaches', priceCents: 500 }],
  );
  assert.deepEqual(shown, { priceCents: 500, updated: true });
  assert.deepEqual(draftDisplayPrice({ name: 'eggs', priceCents: 700 }, []), { priceCents: 700, updated: false });
});

test('a draft preview cannot create an order or take payment', () => {
  const preview = previewCheckout();
  assert.equal(preview.createsOrder, false);
  assert.equal(preview.charges, false);
  assert.equal(preview.line, PREVIEW_PAY_LINE);
  assert.equal(preview.line, 'this is a preview of what shoppers see');
  assert.equal(/stripe|card|payment|launch/i.test(preview.line), false);
  assert.equal(previewItemAddable(''), true);
  assert.equal(previewItemAddable('next batch coming'), false);
});

test('an optional profile photo column is kept on the farm, not the product', () => {
  const csv = [
    'farm,farmer_names,town,story,product,unit,price,source_url,profile_photo',
    'Anderson Family Farms (87 Farms),ada,provo,beef,eggs,dozen,7,https://87farms.com,profile-87-farms',
    'Anderson Family Farms (87 Farms),ada,provo,beef,kale,bunch,4,https://87farms.com,',
  ].join('\n');
  const preview = previewFarmCsv(csv, foods);
  assert.equal(preview.farms.length, 1);
  assert.equal(preview.farms[0].profilePhoto, 'profile-87-farms');
});

test('the invite uses the first farmer name and the private link', () => {
  const text = listingInvite({
    farmerNames: 'ada cole',
    farmName: 'Sample Meadow Farm',
    link: 'https://mainz.example/listing/lk_abc',
  });
  assert.equal(text, "hi ada, it's caty from the main course. we love what you grow and made your farm its own page. take a peek and tap approve if it feels right. if anything's off, just tell us and we'll fix it: https://mainz.example/listing/lk_abc");
  const farmOnly = listingInvite({ farmerNames: '', farmName: 'Sample Orchard Stand', link: '/listing/lk_abc' });
  assert.ok(farmOnly.startsWith('hi Sample'));
});

test('a draft product can be marked next batch coming', () => {
  assert.equal(parseAvailability(''), '');
  assert.equal(parseAvailability('next_batch'), LISTING_NEXT_BATCH);
  assert.equal(parseAvailability('Next batch coming'), LISTING_NEXT_BATCH);
  assert.throws(() => parseAvailability('sold out'), /availability/);
});

test('farm pages keep a short story and never promise a launch', () => {
  assert.deepEqual(storyLines(''), []);
  assert.deepEqual(storyLines('one line about the farm.'), ['one line about the farm.']);
  const many = storyLines('First. Second! Third? Fourth. Fifth.');
  assert.deepEqual(many, ['first.', 'second!', 'third?']);
  assert.deepEqual(meetTheFarmLines({
    story: 'a family dairy in huntington. they raise jersey cows.',
    alreadyShown: 'a family dairy in huntington.',
  }), ['they raise jersey cows.']);
  assert.deepEqual(meetTheFarmLines({
    story: 'a family dairy in huntington.',
    alreadyShown: 'a family dairy in huntington.',
    town: 'huntington, ut',
    grows: ['tallow'],
    sinceYear: 1998,
  }), ['tallow from huntington, ut farming there since 1998.']);
  assert.deepEqual(meetTheFarmLines({
    story: 'tallow.',
    alreadyShown: 'tallow.',
    grows: ['tallow'],
  }), []);
  assert.deepEqual(meetTheFarmLines({
    meetLine: 'a family dairy raising jersey cows in huntington.',
    alreadyShown: 'tallow.',
  }), ['a family dairy raising jersey cows in huntington.']);
  assert.equal(farmPortrait(''), '');
  assert.equal(farmPortrait('placeholder', 'hero'), '');
  assert.equal(farmPortrait('profile-mcarthur-farms', 'profile-mcarthur-farms'), '');
  assert.equal(farmPortrait('profile-mcarthur-farms', 'mcarthur-tallow'), 'profile-mcarthur-farms');
  const copy = `${PICKUP_WORKS_LINE} ${WHY_MAINZ_LINES.join(' ')} ${howPickupWorks('pickup at the farm in huntington, any day by appointment, and at spots in the salt lake valley')}`;
  assert.equal(/launch|approved to receive orders|goes live/i.test(copy), false);
  assert.equal(PICKUP_WORKS_LINE, "we'll confirm pickup with you. nothing is set until the farm says so.");
  assert.equal(howPickupWorks(''), PICKUP_WORKS_LINE);
  assert.equal(howPickupWorks('pickup at the farm in huntington, any day by appointment, and at spots in the salt lake valley'), 'pickup at the farm in huntington, any day by appointment, and at spots in the salt lake valley.');
  assert.equal(WHY_MAINZ_LINES.length, 3);
});

test('onboarding saves a preference and never shows a stored phone', () => {
  assert.equal(onboardingStep('pay'), 'pay');
  assert.equal(onboardingStep('nope'), null);
  assert.equal(ONBOARDING_WELCOME, 'yay, welcome to the main course! 🌱');
  const shown = publicOnboarding({
    reach_via: 'text',
    reach_email: 'ada@farm.test',
    reach_phone: '435-609-1700',
    pay_pref: 'set this up later',
    pickup_ok: 1,
    pickup_note: '',
    onboarding_done: 0,
  });
  const text = JSON.stringify(shown);
  assert.equal(text.includes('435'), false);
  assert.equal(text.includes('phone'), false);
  assert.equal(shown.payPref, 'set this up later');
  assert.equal(shown.reachVia, 'text');
  const copy = `${ONBOARDING_WELCOME} ${ONBOARDING_DONE} ${onboardingQuestions()}`;
  assert.equal(/launch|approved to receive orders/i.test(copy), false);
  assert.equal(onboardingQuestions(), ONBOARDING_TEXT_LINE);
  assert.equal(ONBOARDING_TEXT_LINE, 'text us at 972-510-3326 to stay in touch with the main course team 💬');
  assert.equal(ONBOARDING_SMS, 'sms:+19725103326');
  assert.equal(ONBOARDING_TEXT_LINE.includes(ONBOARDING_TEXT_US), true);
  assert.equal(PAY_STEP_TITLE, 'how do you want to get paid?');
  assert.equal(PAY_STEP_LINE, 'takes about 2 minutes. stripe keeps your bank info safe. we never see it.');
  assert.equal(payPrefForSave('set this up later'), '');
  assert.equal(payPrefForSave("i'll decide later"), '');
  assert.equal(payPrefForSave('bank transfer'), 'bank transfer');
  assert.equal(payPrefForSave('rather get a check?'), 'check');
  assert.equal(payPrefForSave('021000021'), '');
  assert.equal(payPrefFromChoice('set this up later'), 'set this up later');
  assert.equal(payPrefLabel('check'), 'check');
  assert.equal(bankConnected(true, true), true);
  assert.equal(bankConnected(true, false), false);
  assert.equal(bankConnected(false, true), false);
  assert.equal(publicOnboarding({ pay_pref: 'bank transfer', payout_connected: 1 }).payoutConnected, true);
  assert.equal(/routing|account number|goes live|launch/i.test(`${PAY_STEP_TITLE} ${PAY_STEP_LINE}`), false);
  assert.equal(PAY_PREF_LABELS['bank transfer'].includes('set up later'), false);
});
