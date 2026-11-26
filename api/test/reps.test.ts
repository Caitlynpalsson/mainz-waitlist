import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedOrigin } from '../src/cors.ts';
import { farmTransferAmountCents } from '../src/stripe.ts';
import {
  DEFAULT_REP_PERCENT,
  FARM_PITCH,
  RATE_COMING,
  SHOPPER_PITCH,
  REP_PAGE_LINES,
  REP_PAGE_TITLE,
  commissionCents,
  farmApprovalLine,
  isReferralCode,
  listingApprovalLine,
  milestoneProgress,
  parseCommissionPercent,
  friendlyStanding,
  portalStanding,
  referralCode,
  repPublicName,
  weekStart,
} from '../src/reps.ts';

test('the public rep page never names a percentage', () => {
  const text = `${REP_PAGE_TITLE} ${REP_PAGE_LINES.join(' ')}`;
  assert.equal(/\d+\s*%|percent|commission/i.test(text), false);
  assert.equal(text.includes('the main course') || text.includes('sell with us'), true);
});

test('commission is unset until staff save a rate', () => {
  assert.equal(parseCommissionPercent(''), null);
  assert.equal(parseCommissionPercent(null), null);
  assert.equal(parseCommissionPercent('nope'), null);
  assert.equal(parseCommissionPercent('10'), 10);
  assert.equal(parseCommissionPercent('101'), null);
  assert.equal(commissionCents(2000, null), null);
  assert.equal(commissionCents(2000, 10), 200);
  assert.equal(DEFAULT_REP_PERCENT, 3);
  const sales = 1900;
  const platformHold = sales - farmTransferAmountCents(sales, { percent: 10, flatCents: 0 });
  const repShare = commissionCents(sales, DEFAULT_REP_PERCENT);
  assert.equal(platformHold, 190);
  assert.equal(repShare, 57);
  assert.equal((repShare || 0) < platformHold, true);
  assert.equal(RATE_COMING, 'rate coming soon');
});

test('referral codes stay short and sample lane wording stays in the approval process', () => {
  assert.equal(referralCode(new Uint8Array([0, 1, 2, 3, 4, 5])).length, 6);
  assert.equal(isReferralCode('sample'), true);
  assert.equal(isReferralCode('no'), false);
  assert.equal(listingApprovalLine('sent'), 'waiting on the farm');
  assert.equal(portalStanding({ kind: 'listing', status: 'sent' }), 'in approval');
  assert.equal(portalStanding({ kind: 'farm', status: 'approved', active: true, bank: true }), 'selling');
  assert.equal(friendlyStanding('selling'), 'selling');
  assert.equal(friendlyStanding('in approval'), 'in review');
  assert.equal(friendlyStanding('applied'), 'applied');
  assert.equal(repPublicName('sample rep'), 'sample r');
  assert.equal(milestoneProgress(1, 0).earned[0]?.label, 'first farm');
  assert.equal(milestoneProgress(1, 0).next?.label, '5 farms');
  assert.equal(weekStart(new Date('2026-11-26T12:00:00Z')), '2026-11-23 00:00:00');
  assert.equal(/—/.test(`${FARM_PITCH} ${SHOPPER_PITCH}`), false);
  assert.equal(farmApprovalLine({ status: 'pending', active: false, decision: '', stage: 'application_received', removed: false }), 'application received');
  assert.equal(/goes live/i.test(listingApprovalLine('farm_approved')), false);
});

test('the shop domain and preview hosts may call the worker', () => {
  assert.equal(allowedOrigin('https://themaincoursemarket.com'), 'https://themaincoursemarket.com');
  assert.equal(allowedOrigin('https://www.themaincoursemarket.com'), 'https://www.themaincoursemarket.com');
  assert.equal(allowedOrigin('http://localhost:8081'), 'http://localhost:8081');
  assert.equal(allowedOrigin('https://preview.example.pages.dev'), 'https://preview.example.pages.dev');
  assert.equal(allowedOrigin('https://evil.example'), null);
  assert.equal(allowedOrigin('http://themaincoursemarket.com'), null);
});
