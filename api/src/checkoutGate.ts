export const CHECKOUT_CLOSED_LINE = 'checkout opens soon 🌱 add what you love and we\'ll let you know.';

const DEFAULT_CLOSED = 'themaincoursemarket.com,www.themaincoursemarket.com';

export function closedHosts(raw: string | undefined): string[] {
  return (raw && raw.trim() ? raw : DEFAULT_CLOSED).split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
}

export function hostName(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Closed only when the shopper's host is on the list. Preview hosts are not on it. */
export function checkoutClosed(input: {
  hosts?: string;
  origin?: string | null;
  referer?: string | null;
  host?: string | null;
  returnOrigin?: string | null;
}): boolean {
  const closed = new Set(closedHosts(input.hosts));
  const seen = [input.origin, input.referer, input.host, input.returnOrigin].map(hostName).filter(Boolean);
  return seen.some((host) => closed.has(host));
}
