/**
 * The only place a real Stripe Connect account link should be created.
 * Hosted onboarding is an account link, then Stripe sends the farm to returnUrl.
 * This preview adapter never leaves the app and never collects bank details.
 */

export type PayoutLink = {
  mode: 'mock';
  returnUrl: string;
};

export function startPayoutOnboarding(returnUrl: string): PayoutLink {
  return { mode: 'mock', returnUrl: returnUrl || '/listing/payout-return' };
}

export function onPayoutReturn(): { payPref: 'bank transfer'; connected: true } {
  return { payPref: 'bank transfer', connected: true };
}
