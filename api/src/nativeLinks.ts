/** Pure helpers for the installable app. Push stays off. */

export const PUSH_ENABLED = false;

const STRIPE_HOSTS = new Set(['connect.stripe.com', 'checkout.stripe.com', 'billing.stripe.com']);

export function isStripeUrl(url: string): boolean {
  try {
    return STRIPE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function isNativeShell(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Inside the wrapper, Stripe must return to the public site so the app can catch it. */
export function shopOrigin(webOrigin: string): string {
  return isNativeShell() ? 'https://themaincoursemarket.com' : webOrigin;
}

/** Rep links and Stripe return urls that should open inside the app. */
export function appPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', '');
    if (scheme === 'mainz') {
      const path = parsed.hostname
        ? `/${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`
        : parsed.pathname || '/';
      return `${path}${parsed.search}`;
    }
    if (scheme !== 'https') return null;
    if (parsed.hostname !== 'themaincoursemarket.com' && parsed.hostname !== 'www.themaincoursemarket.com') return null;
    const path = `${parsed.pathname}${parsed.search}`;
    if (parsed.pathname.startsWith('/r/') || parsed.pathname.startsWith('/listing/') || parsed.searchParams.has('payout')) return path;
    return null;
  } catch {
    return null;
  }
}
