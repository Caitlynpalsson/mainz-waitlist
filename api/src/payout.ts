/**
 * A farm's bank is connected only when Stripe has enabled charges and payouts.
 * The Worker creates the Express account and the Account Link. This file does not.
 */

export function bankConnected(chargesEnabled: boolean, payoutsEnabled: boolean): boolean {
  return chargesEnabled === true && payoutsEnabled === true;
}
