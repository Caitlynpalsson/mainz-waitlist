import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHECKOUT_CLOSED_LINE, checkoutClosed } from '../src/checkoutGate.ts';

test('the public host is closed and the preview host stays open', () => {
  assert.equal(checkoutClosed({ origin: 'https://themaincoursemarket.com' }), true);
  assert.equal(checkoutClosed({ origin: 'https://www.themaincoursemarket.com' }), true);
  assert.equal(checkoutClosed({ returnOrigin: 'https://themaincoursemarket.com' }), true);
  assert.equal(checkoutClosed({ origin: 'https://preview.mainz-j4b.pages.dev' }), false);
  assert.equal(checkoutClosed({ origin: 'https://branch.mainz-j4b.pages.dev' }), false);
  assert.equal(checkoutClosed({ origin: 'http://localhost:8081' }), false);
  assert.equal(checkoutClosed({ host: 'mainz-api.guidedapp.workers.dev', origin: 'https://preview.mainz-j4b.pages.dev' }), false);
  assert.equal(/—|percent|\$/.test(CHECKOUT_CLOSED_LINE), false);
});
