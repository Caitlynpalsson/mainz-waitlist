export function authorized(request: Request, secret: string | undefined): boolean {
  if (!secret) {
    console.error("STAFF_TOKEN is not set");
    return false;
  }
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return false;
  return timingSafeEqual(token, secret);
}

export function staffName(request: Request): string {
  const raw = (request.headers.get("X-Staff-Name") || "staff").replace(/[\r\n\t]/g, " ").trim();
  return raw.slice(0, 80) || "staff";
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i++) mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return mismatch === 0;
}
