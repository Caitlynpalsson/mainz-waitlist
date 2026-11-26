import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PUSH_ENABLED, appPathFromUrl, isStripeUrl } from '../src/nativeLinks.ts';

test('the wrapper opens rep links and stripe returns, and push stays off', () => {
  assert.equal(PUSH_ENABLED, false);
  assert.equal(isStripeUrl('https://connect.stripe.com/setup/s/sample'), true);
  assert.equal(isStripeUrl('https://checkout.stripe.com/c/pay/cs_test'), true);
  assert.equal(isStripeUrl('https://themaincoursemarket.com/r/sample'), false);
  assert.equal(appPathFromUrl('https://themaincoursemarket.com/r/sample'), '/r/sample');
  assert.equal(appPathFromUrl('https://www.themaincoursemarket.com/listing/lk_abc?payout=return'), '/listing/lk_abc?payout=return');
  assert.equal(appPathFromUrl('mainz://r/sample'), '/r/sample');
  assert.equal(appPathFromUrl('https://evil.example/r/sample'), null);
});
