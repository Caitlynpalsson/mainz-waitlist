const DAY = 24 * 60 * 60 * 1000;
const LINK_LIFE = DAY;
const SESSION_LIFE = 30 * DAY;

export const STAFF_SESSION_KEY = 'mainz.staffSession';

export const STAFF_LINK_EXPIRED = 'this link expired';
export const STAFF_LINK_RETRY = 'something went wrong, try again';

/** Only a used or expired code gets the expired line. Network and other failures stay separate. */
export function staffLinkMessage(serverMessage: string): string {
  return serverMessage === STAFF_LINK_EXPIRED ? STAFF_LINK_EXPIRED : STAFF_LINK_RETRY;
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function staffGoPath(code: string): string {
  return `/staff/go/${code}`;
}

/** A one-time code. Only the hash is stored. The path never carries the admin token. */
export async function makeStaffPreviewCode(nowMs: number): Promise<{ code: string; codeHash: string; path: string; expiresAt: string }> {
  const code = randomSecret();
  return {
    code,
    codeHash: await sha256Hex(code),
    path: staffGoPath(code),
    expiresAt: new Date(nowMs + LINK_LIFE).toISOString(),
  };
}

export async function makeStaffSession(nowMs: number): Promise<{ session: string; sessionHash: string; expiresAt: string }> {
  const session = randomSecret();
  return {
    session,
    sessionHash: await sha256Hex(session),
    expiresAt: new Date(nowMs + SESSION_LIFE).toISOString(),
  };
}

/** A saved session opens any hidden draft until it expires. It is not tied to one listing. */
export function staffSessionOpen(expiresAt: string, nowMs: number): boolean {
  return Date.parse(expiresAt) > nowMs;
}

export function staffCodeStatus(input: { expiresAt: string; usedAt: string; nowMs: number }): 'ok' | 'expired' {
  if (input.usedAt) return 'expired';
  if (Date.parse(input.expiresAt) <= input.nowMs) return 'expired';
  return 'ok';
}

export function readStaffSession(request: Request): string {
  const header = request.headers.get('x-staff-session') || '';
  const value = header.trim();
  return /^[0-9a-f]{64}$/.test(value) ? value : '';
}
