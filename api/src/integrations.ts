/**
 * Optional services. Every one stays off until its env var or binding is set.
 * Nothing here collects a farm phone or a bank number.
 */

import type { WorkersAiBinding } from './guide';

export type OrderMail = { to: string; orderId: string; summary: string };
export type FarmOrderMail = { to: string; farmName: string; summary: string };
export type RepWelcomeMail = { to: string; name: string; path: string };

export interface EmailProvider {
  sendOrderConfirmation(mail: OrderMail): Promise<void>;
  sendFarmNewOrder(mail: FarmOrderMail): Promise<void>;
  sendRepWelcome(mail: RepWelcomeMail): Promise<void>;
}

const noopEmail: EmailProvider = {
  async sendOrderConfirmation() { console.log('email off: order confirmation'); },
  async sendFarmNewOrder() { console.log('email off: farm order'); },
  async sendRepWelcome() { console.log('email off: rep welcome'); },
};

export function scrubMail(text: string): string {
  return text
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone]')
    .replace(/\b\d{8,17}\b/g, '[number]')
    .replace(/acct_[A-Za-z0-9]+/g, '[account]');
}

export function emailFromEnv(env: { RESEND_API_KEY?: string; EMAIL_FROM?: string }, fetchImpl: typeof fetch = fetch): EmailProvider {
  const key = (env.RESEND_API_KEY || '').trim();
  const from = (env.EMAIL_FROM || '').trim();
  if (!key || !from) return noopEmail;
  const send = async (to: string, subject: string, text: string) => {
    await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text: scrubMail(text) }),
    });
  };
  return {
    sendOrderConfirmation: (mail) => send(mail.to, 'your order from the main course', scrubMail(mail.summary)),
    sendFarmNewOrder: (mail) => send(mail.to, `new order for ${mail.farmName}`, scrubMail(mail.summary)),
    sendRepWelcome: (mail) => send(mail.to, 'your desk at the main course', scrubMail(`${mail.name}, your desk is ${mail.path}`)),
  };
}

export async function verifyTurnstile(secret: string | undefined, token: string | undefined, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = await response.json().catch(() => ({})) as { success?: boolean };
  return data.success === true;
}

export interface PhotoStore {
  kind: 'd1' | 'r2';
  put(name: string, bytes: Uint8Array, type: string): Promise<string>;
}

export type R2BucketLike = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
};

export function photoStore(env: { R2?: R2BucketLike }): PhotoStore {
  if (!env.R2) return { kind: 'd1', async put() { return ''; } };
  const bucket = env.R2;
  return {
    kind: 'r2',
    async put(name, bytes, type) {
      const key = `photos/${name}`;
      await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
      return `/api/media/${encodeURIComponent(key)}`;
    },
  };
}

export async function readMedia(env: { R2?: R2BucketLike }, key: string): Promise<Response | null> {
  if (!env.R2 || !key.startsWith('photos/')) return null;
  const object = await env.R2.get(key);
  if (!object) return null;
  const bytes = await object.arrayBuffer();
  return new Response(bytes, { headers: { 'content-type': object.httpMetadata?.contentType || 'image/jpeg' } });
}

export interface AddressAutocomplete {
  suggest(query: string): Promise<string[]>;
}

/** Not implemented. Do not call this from a form. */
export const addressAutocomplete: AddressAutocomplete = {
  async suggest() { return []; },
};

export interface TaxCalculator {
  quote(cents: number): Promise<{ label: string; cents: number }>;
}

export const taxCalculator: TaxCalculator = {
  async quote() { return { label: 'tax not collected', cents: 0 }; },
};

export interface AiHelper {
  ask(question: string): Promise<string>;
}

export function aiHelper(ai?: WorkersAiBinding): AiHelper {
  if (!ai) return { async ask() { return ''; } };
  return {
    async ask(question) {
      const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: question.slice(0, 400) }],
      });
      return String(result.response || '').slice(0, 600);
    },
  };
}

export const WEB_PUSH_ENABLED = false;

export function scrubTelemetry(text: string): string {
  return scrubMail(text).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

export async function observe(env: { SENTRY_DSN?: string; POSTHOG_KEY?: string; POSTHOG_HOST?: string }, error: unknown, fetchImpl: typeof fetch = fetch): Promise<void> {
  const message = scrubTelemetry(error instanceof Error ? error.message : 'error');
  if (env.SENTRY_DSN) {
    await fetchImpl(env.SENTRY_DSN, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
    }).catch(() => undefined);
  }
  if (env.POSTHOG_KEY) {
    const host = env.POSTHOG_HOST || 'https://us.i.posthog.com';
    await fetchImpl(`${host}/capture/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: env.POSTHOG_KEY, event: 'worker_error', properties: { message }, distinct_id: 'worker' }),
    }).catch(() => undefined);
  }
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function ordersCsv(db: D1Database): Promise<Response> {
  const rows = await db.prepare(
    `SELECT public_id, payment_status, merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, created_at
     FROM orders ORDER BY id DESC LIMIT 500`,
  ).all<Record<string, unknown>>();
  return csvResponse('orders.csv', rows.results);
}

export async function transfersCsv(db: D1Database): Promise<Response> {
  const rows = await db.prepare(
    `SELECT f.name AS farm, ft.amount_cents, ofm.platform_fee_cents AS fee_cents, ft.status, ft.created_at
     FROM farm_transfers ft
     JOIN farms f ON f.id = ft.farm_id
     JOIN order_farms ofm ON ofm.id = ft.order_farm_id
     ORDER BY ft.id DESC LIMIT 500`,
  ).all<Record<string, unknown>>();
  return csvResponse('transfers.csv', rows.results);
}

export async function repLedgerCsv(db: D1Database): Promise<Response> {
  const rows = await db.prepare(
    `SELECT r.code, f.name AS farm, l.sales_cents, l.commission_cents, l.created_at
     FROM rep_ledger l JOIN reps r ON r.id = l.rep_id JOIN farms f ON f.id = l.farm_id
     ORDER BY l.id DESC LIMIT 500`,
  ).all<Record<string, unknown>>();
  return csvResponse('rep-ledger.csv', rows.results);
}

function csvResponse(name: string, rows: Record<string, unknown>[]): Response {
  return new Response(toCsv(rows), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}"` },
  });
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(','))].join('\n');
}
