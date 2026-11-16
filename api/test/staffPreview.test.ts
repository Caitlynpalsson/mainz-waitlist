import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shopperHero } from '../src/listing.ts';
import { STAFF_LINK_EXPIRED, STAFF_LINK_RETRY, makeStaffPreviewCode, sessionCookie, sha256Hex, staffCodeStatus, staffLinkMessage } from '../src/staffPreview.ts';

test('a staff preview code is hashed, single use, and lasts 15 minutes', async () => {
  const now = Date.parse('2026-11-16T00:00:00.000Z');
  const made = await makeStaffPreviewCode(now);
  assert.equal(made.codeHash, await sha256Hex(made.code));
  assert.notEqual(made.code, made.codeHash);
  assert.equal(made.path, `/staff/go/${made.code}`);
  assert.equal(made.path.includes('Bearer'), false);
  assert.equal(made.path.includes('ADMIN'), false);
  assert.equal(made.expiresAt, '2026-11-16T00:15:00.000Z');
  assert.equal(staffCodeStatus({ expiresAt: made.expiresAt, usedAt: '', nowMs: now + 1000 }), 'ok');
  assert.equal(staffCodeStatus({ expiresAt: made.expiresAt, usedAt: '2026-11-16T00:01:00.000Z', nowMs: now + 1000 }), 'expired');
  assert.equal(staffCodeStatus({ expiresAt: made.expiresAt, usedAt: '', nowMs: now + 15 * 60 * 1000 }), 'expired');
  assert.equal(STAFF_LINK_EXPIRED, 'this link expired');
  assert.equal(sessionCookie('abc').includes('HttpOnly'), true);
  assert.equal(sessionCookie('abc').includes('ADMIN'), false);
});

test('a failed redeem is expired only when the server says so', () => {
  assert.equal(staffLinkMessage(STAFF_LINK_EXPIRED), 'this link expired');
  assert.equal(staffLinkMessage('the market is not reachable. is the api running?'), STAFF_LINK_RETRY);
  assert.equal(staffLinkMessage(''), STAFF_LINK_RETRY);
  assert.equal(STAFF_LINK_RETRY, 'something went wrong, try again');
});

test('a missing hero uses a real product photo, and a steak photo wins', () => {
  assert.equal(shopperHero({
    heroPhoto: '',
    products: [
      { name: 'eggs', photoKey: 'placeholder' },
      { name: 'steak', photoKey: 'ribeye-steak' },
    ],
  }), 'ribeye-steak');
  assert.equal(shopperHero({
    heroPhoto: 'profile-87-farms',
    products: [{ name: 'milk', photoKey: '87-milk' }],
  }), '87-milk');
  assert.equal(shopperHero({ heroPhoto: '', products: [{ name: 'milk', photoKey: 'stock-milk' }] }), '');
  assert.equal(shopperHero({ heroPhoto: 'ribeye-steak', products: [] }), 'ribeye-steak');
});
