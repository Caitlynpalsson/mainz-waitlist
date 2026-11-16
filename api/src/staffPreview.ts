const FIFTEEN_MINUTES = 15 * 60 * 1000;

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
    expiresAt: new Date(nowMs + FIFTEEN_MINUTES).toISOString(),
  };
}

export async function makeStaffSession(nowMs: number): Promise<{ session: string; sessionHash: string; expiresAt: string }> {
  const session = randomSecret();
  return {
    session,
    sessionHash: await sha256Hex(session),
    expiresAt: new Date(nowMs + FIFTEEN_MINUTES).toISOString(),
  };
}

export function staffCodeStatus(input: { expiresAt: string; usedAt: string; nowMs: number }): 'ok' | 'expired' {
  if (input.usedAt) return 'expired';
  if (Date.parse(input.expiresAt) <= input.nowMs) return 'expired';
  return 'ok';
}

export function sessionCookie(session: string): string {
  return `mainz_staff=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900`;
}

export function readStaffSession(request: Request): string {
  const header = request.headers.get('x-staff-session') || '';
  if (/^[0-9a-f]{64}$/.test(header.trim())) return header.trim();
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)mainz_staff=([0-9a-f]{64})/);
  return match?.[1] || '';
}
