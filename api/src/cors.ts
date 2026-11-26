const SITE_ORIGINS = new Set([
  'https://themaincoursemarket.com',
  'https://www.themaincoursemarket.com',
]);

/** Shop origins that may call the worker. Preview hosts stay allowed. */
export function allowedOrigin(origin: string | null | undefined): string | null {
  const value = String(origin || '').trim();
  if (!value) return null;
  if (SITE_ORIGINS.has(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname;
  if (url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1')) return value;
  if (url.protocol === 'https:' && (host === 'pages.dev' || host.endsWith('.pages.dev'))) return value;
  return null;
}
