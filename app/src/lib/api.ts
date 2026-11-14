const BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export function apiBase(): string {
  return BASE;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('the market is not reachable. is the api running?');
  }
  const text = await response.text();
  let data: { error?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      data = {};
    }
  }
  if (!response.ok) throw new Error(data.error || `something went wrong (${response.status}).`);
  return data as T;
}
