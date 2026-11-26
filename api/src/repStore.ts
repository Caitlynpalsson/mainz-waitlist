import { HttpError, json } from './http';
import { sha256Hex } from './staffPreview';
import {
  DEFAULT_REP_PERCENT,
  PAYOUT_PLACEHOLDER,
  commissionCents,
  countSince,
  isReferralCode,
  milestoneProgress,
  monthStart,
  parseCommissionPercent,
  portalStanding,
  referralCode,
  repPublicName,
  weekStart,
} from './reps';

type Env = { DB: D1Database };

type FarmCredit = {
  name: string;
  status: string;
  sold_cents: number;
  commission_cents: number;
  sample: number;
  created_at: string;
};

export async function joinRep(env: Env, body: Record<string, unknown>): Promise<Response> {
  const name = String(body.name || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 20);
  if (name.length < 2) throw new HttpError('add your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('add an email.');
  if (phone.replace(/\D/g, '').length < 7) throw new HttpError('add a phone number.');
  const existing = await env.DB.prepare(`SELECT id FROM reps WHERE lower(email) = ?`).bind(email).first();
  if (existing) throw new HttpError('that email already joined. ask the team for a new private link.');
  const code = await uniqueCode(env);
  const view = await newViewToken();
  await env.DB.prepare(
    `INSERT INTO reps (name, email, phone, code, is_sample, view_token_hash) VALUES (?, ?, ?, ?, 0, ?)`,
  ).bind(name, email, phone, code, view.hash).run();
  return json({
    code,
    applyPath: `/apply?rep=${code}`,
    shortPath: `/r/${code}`,
    viewPath: `/reps/desk/${view.token}`,
  }, 201);
}

export async function repIdForCode(env: Env, code: string): Promise<number | null> {
  const clean = code.trim().toLowerCase();
  if (!isReferralCode(clean)) return null;
  const row = await env.DB.prepare(`SELECT id FROM reps WHERE code = ?`).bind(clean).first<{ id: number }>();
  return row ? Number(row.id) : null;
}

export async function repDesk(env: Env, token: string): Promise<Response> {
  const clean = token.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new HttpError('that link is not right.', 404);
  const rep = await env.DB.prepare(
    `SELECT id, name, code, is_sample FROM reps WHERE view_token_hash = ?`,
  ).bind(await sha256Hex(clean)).first<{ id: number; name: string; code: string; is_sample: number }>();
  if (!rep) throw new HttpError('that link is not right.', 404);
  return json(await portalPayload(env, rep));
}

export async function joinShopper(env: Env, body: Record<string, unknown>): Promise<Response> {
  const name = String(body.name || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  if (name.length < 2) throw new HttpError('add your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('add an email.');
  const code = String(body.rep || '').trim().toLowerCase();
  const repId = code ? await repIdForCode(env, code) : null;
  if (code && !repId) throw new HttpError('that referral code is not one of ours.');
  if (repId) {
    const dupe = await env.DB.prepare(`SELECT id FROM rep_shoppers WHERE rep_id = ? AND lower(email) = ?`).bind(repId, email).first();
    if (!dupe) {
      await env.DB.prepare(`INSERT INTO rep_shoppers (rep_id, name, email, is_sample) VALUES (?, ?, ?, 0)`).bind(repId, name, email).run();
    }
  }
  return json({ ok: true, counted: !!repId });
}

export async function saveRepSettings(env: Env, token: string, body: Record<string, unknown>): Promise<Response> {
  const rep = await repByToken(env, token);
  const goal = body.weeklyGoal == null ? null : Math.max(0, Math.min(500, Math.round(Number(body.weeklyGoal) || 0)));
  const hide = body.leaderboardOptOut == null ? null : (body.leaderboardOptOut ? 1 : 0);
  if (goal != null) await env.DB.prepare(`UPDATE reps SET weekly_goal = ? WHERE id = ?`).bind(goal, rep.id).run();
  if (hide != null) await env.DB.prepare(`UPDATE reps SET leaderboard_opt_out = ? WHERE id = ?`).bind(hide, rep.id).run();
  const next = await env.DB.prepare(`SELECT id, name, code, is_sample FROM reps WHERE id = ?`).bind(rep.id).first<{ id: number; name: string; code: string; is_sample: number }>();
  return json(await portalPayload(env, next || rep));
}

export async function adminRepList(env: Env): Promise<Response> {
  const percent = await readPercent(env);
  const reps = await env.DB.prepare(
    `SELECT id, name, email, phone, code, is_sample FROM reps ORDER BY is_sample DESC, id`,
  ).all<{ id: number; name: string; email: string; phone: string; code: string; is_sample: number }>();
  const listed = [];
  for (const rep of reps.results) {
    listed.push({
      id: Number(rep.id),
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      code: rep.code,
      sample: Number(rep.is_sample) === 1,
      farms: (await credits(env, Number(rep.id))).map((farm) => ({
        name: farm.name,
        status: farm.status,
        soldCents: Number(farm.sold_cents) || 0,
        commissionCents: Number(farm.commission_cents) || 0,
        sample: Number(farm.sample) === 1,
      })),
      shoppers: await shopperCount(env, Number(rep.id)),
    });
  }
  return json({ percent, reps: listed });
}

export async function setRepCommission(env: Env, body: Record<string, unknown>): Promise<Response> {
  const raw = body.percent == null ? '' : String(body.percent);
  if (raw.trim() && parseCommissionPercent(raw) == null) throw new HttpError('use a rate from 0 to 100, or leave it blank.');
  const value = raw.trim() ? String(parseCommissionPercent(raw)) : '';
  await env.DB.prepare(
    `INSERT INTO admin_settings (key, value) VALUES ('REP_COMMISSION_PERCENT', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).bind(value).run();
  return json({ percent: value ? parseCommissionPercent(value) : null });
}

export async function reissueRepView(env: Env, body: Record<string, unknown>): Promise<Response> {
  const id = Number(body.id);
  const code = String(body.code || '').trim().toLowerCase();
  const rep = Number.isFinite(id) && id > 0
    ? await env.DB.prepare(`SELECT id, code FROM reps WHERE id = ?`).bind(id).first<{ id: number; code: string }>()
    : await env.DB.prepare(`SELECT id, code FROM reps WHERE code = ?`).bind(code).first<{ id: number; code: string }>();
  if (!rep) throw new HttpError('no rep with that code.', 404);
  const view = await newViewToken();
  await env.DB.prepare(`UPDATE reps SET view_token_hash = ? WHERE id = ?`).bind(view.hash, rep.id).run();
  return json({ path: `/reps/desk/${view.token}`, code: rep.code });
}

async function credits(env: Env, repId: number): Promise<FarmCredit[]> {
  const farms = await env.DB.prepare(
    `SELECT f.name, f.status, f.active, f.decision, f.pipeline_stage, f.remove_reason, f.is_demo, f.created_at,
            COALESCE(f.stripe_charges_enabled, 0) AS charges, COALESCE(f.stripe_payouts_enabled, 0) AS payouts,
            COALESCE((SELECT SUM(l.sales_cents) FROM rep_ledger l WHERE l.farm_id = f.id AND l.rep_id = f.rep_id), 0) AS sold_cents,
            COALESCE((SELECT SUM(l.commission_cents) FROM rep_ledger l WHERE l.farm_id = f.id AND l.rep_id = f.rep_id), 0) AS commission_cents
     FROM farms f WHERE f.rep_id = ? ORDER BY f.id`,
  ).bind(repId).all<{ name: string; status: string; active: number; decision: string; pipeline_stage: string; remove_reason: string; is_demo: number; created_at: string; charges: number; payouts: number; sold_cents: number; commission_cents: number }>();
  const drafts = await env.DB.prepare(
    `SELECT farm_name, status, is_sample, created_at, COALESCE(stripe_charges_enabled, 0) AS charges, COALESCE(stripe_payouts_enabled, 0) AS payouts
     FROM listing_drafts WHERE rep_id = ? ORDER BY id`,
  ).bind(repId).all<{ farm_name: string; status: string; is_sample: number; created_at: string; charges: number; payouts: number }>();
  return [
    ...farms.results.map((farm) => ({
      name: farm.name,
      status: portalStanding({
        kind: 'farm',
        status: farm.status,
        active: Number(farm.active) === 1,
        stage: farm.pipeline_stage || '',
        decision: farm.decision || '',
        removed: !!farm.remove_reason,
        bank: Number(farm.charges) === 1 && Number(farm.payouts) === 1,
      }),
      sold_cents: Number(farm.sold_cents) || 0,
      commission_cents: Number(farm.commission_cents) || 0,
      sample: Number(farm.is_demo) === 1 ? 1 : 0,
      created_at: farm.created_at || '',
    })),
    ...drafts.results.map((draft) => ({
      name: draft.farm_name,
      status: portalStanding({
        kind: 'listing',
        status: draft.status,
        bank: Number(draft.charges) === 1 && Number(draft.payouts) === 1,
      }),
      sold_cents: 0,
      commission_cents: 0,
      sample: Number(draft.is_sample) === 1 ? 1 : 0,
      created_at: draft.created_at || '',
    })),
  ];
}

async function portalPayload(env: Env, rep: { id: number; name: string; code: string; is_sample: number }) {
  const percent = await readPercent(env);
  const farms = await credits(env, Number(rep.id));
  const settings = await env.DB.prepare(`SELECT leaderboard_opt_out, weekly_goal FROM reps WHERE id = ?`).bind(rep.id).first<{ leaderboard_opt_out: number; weekly_goal: number }>();
  const money = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(commission_cents), 0) AS all_time,
       COALESCE(SUM(CASE WHEN created_at >= ? THEN commission_cents ELSE 0 END), 0) AS month,
       COALESCE(SUM(CASE WHEN paid_at = '' THEN commission_cents ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN paid_at != '' THEN commission_cents ELSE 0 END), 0) AS paid
     FROM rep_ledger WHERE rep_id = ?`,
  ).bind(monthStart(), rep.id).first<{ all_time: number; month: number; pending: number; paid: number }>();
  const history = await env.DB.prepare(
    `SELECT l.created_at, l.sales_cents, l.commission_cents, l.paid_at, f.name AS farm_name
     FROM rep_ledger l JOIN farms f ON f.id = l.farm_id
     WHERE l.rep_id = ? ORDER BY l.id DESC`,
  ).bind(rep.id).all<{ created_at: string; sales_cents: number; commission_cents: number; paid_at: string; farm_name: string }>();
  const shoppers = await env.DB.prepare(`SELECT created_at FROM rep_shoppers WHERE rep_id = ?`).bind(rep.id).all<{ created_at: string }>();
  const board = await leaderboardRows(env, Number(rep.id));
  const week = weekStart();
  const weekFarms = countSince(farms.map((farm) => farm.created_at), week);
  const weekShoppers = countSince(shoppers.results.map((row) => row.created_at), week);
  const progress = milestoneProgress(farms.length, shoppers.results.length);
  return {
    name: rep.name,
    code: rep.code,
    sample: Number(rep.is_sample) === 1,
    applyPath: `/apply?rep=${rep.code}`,
    shortPath: `/r/${rep.code}`,
    shopperPath: `/you?rep=${rep.code}`,
    ratePercent: percent,
    payoutNote: PAYOUT_PLACEHOLDER,
    earnings: {
      monthCents: Number(money?.month) || 0,
      allTimeCents: Number(money?.all_time) || 0,
      pendingCents: Number(money?.pending) || 0,
      paidCents: Number(money?.paid) || 0,
    },
    farms: farms.map((farm) => ({
      name: farm.name,
      status: farm.status,
      soldCents: Number(farm.sold_cents) || 0,
      commissionCents: percent == null && !Number(farm.commission_cents) ? null : Number(farm.commission_cents) || 0,
      sample: Number(farm.sample) === 1,
    })),
    shoppersBrought: shoppers.results.length,
    ledger: history.results.map((row) => ({
      at: row.created_at,
      farmName: row.farm_name,
      salesCents: Number(row.sales_cents) || 0,
      commissionCents: Number(row.commission_cents) || 0,
      paid: !!row.paid_at,
    })),
    leaderboardOptOut: Number(settings?.leaderboard_opt_out) === 1,
    weeklyGoal: Number(settings?.weekly_goal) || 0,
    weekProgress: weekFarms + weekShoppers,
    badges: progress,
    leaderboard: board,
  };
}

async function leaderboardRows(env: Env, viewerId: number) {
  const reps = await env.DB.prepare(`SELECT id, name, leaderboard_opt_out FROM reps`).all<{ id: number; name: string; leaderboard_opt_out: number }>();
  const farmDates = await env.DB.prepare(`SELECT rep_id, created_at FROM farms WHERE rep_id IS NOT NULL`).all<{ rep_id: number; created_at: string }>();
  const listingDates = await env.DB.prepare(`SELECT rep_id, created_at FROM listing_drafts WHERE rep_id IS NOT NULL`).all<{ rep_id: number; created_at: string }>();
  const shopperDates = await env.DB.prepare(`SELECT rep_id, created_at FROM rep_shoppers WHERE rep_id IS NOT NULL`).all<{ rep_id: number; created_at: string }>();
  const month = monthStart();
  const pack = (from: string | null) => reps.results
    .filter((rep) => Number(rep.leaderboard_opt_out) !== 1 || Number(rep.id) === viewerId)
    .map((rep) => {
      const farms = countSince([
        ...farmDates.results.filter((row) => Number(row.rep_id) === Number(rep.id)).map((row) => row.created_at),
        ...listingDates.results.filter((row) => Number(row.rep_id) === Number(rep.id)).map((row) => row.created_at),
      ], from);
      const shoppers = countSince(shopperDates.results.filter((row) => Number(row.rep_id) === Number(rep.id)).map((row) => row.created_at), from);
      return {
        label: repPublicName(rep.name),
        farms,
        shoppers,
        you: Number(rep.id) === viewerId,
        hidden: Number(rep.leaderboard_opt_out) === 1,
      };
    })
    .sort((a, b) => (b.farms + b.shoppers) - (a.farms + a.shoppers) || b.farms - a.farms || a.label.localeCompare(b.label));
  return { month: pack(month), allTime: pack(null) };
}

async function shopperCount(env: Env, repId: number): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM rep_shoppers WHERE rep_id = ?`).bind(repId).first<{ n: number }>();
  return Number(row?.n) || 0;
}

async function repByToken(env: Env, token: string): Promise<{ id: number; name: string; code: string; is_sample: number }> {
  const clean = token.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new HttpError('that link is not right.', 404);
  const rep = await env.DB.prepare(
    `SELECT id, name, code, is_sample FROM reps WHERE view_token_hash = ?`,
  ).bind(await sha256Hex(clean)).first<{ id: number; name: string; code: string; is_sample: number }>();
  if (!rep) throw new HttpError('that link is not right.', 404);
  return rep;
}

async function readPercent(env: Env): Promise<number | null> {
  const row = await env.DB.prepare(`SELECT value FROM admin_settings WHERE key = 'REP_COMMISSION_PERCENT'`).first<{ value: string }>();
  if (!row) return DEFAULT_REP_PERCENT;
  return parseCommissionPercent(row.value);
}

/** One row per farm on a paid order. The rate is stored on the row. Nothing expires. */
export async function recordRepLedger(env: Env, orderId: number): Promise<void> {
  const percent = (await readPercent(env)) ?? DEFAULT_REP_PERCENT;
  const rows = await env.DB.prepare(
    `SELECT ofm.id AS order_farm_id, ofm.farm_id, ofm.merchandise_cents, f.rep_id
     FROM order_farms ofm JOIN farms f ON f.id = ofm.farm_id
     WHERE ofm.order_id = ? AND f.rep_id IS NOT NULL`,
  ).bind(orderId).all<{ order_farm_id: number; farm_id: number; merchandise_cents: number; rep_id: number }>();
  for (const row of rows.results) {
    const sales = Math.max(0, Number(row.merchandise_cents) || 0);
    const commission = commissionCents(sales, percent) ?? 0;
    await env.DB.prepare(
      `INSERT INTO rep_ledger (rep_id, farm_id, order_id, order_farm_id, sales_cents, rate_percent, commission_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(order_farm_id) DO NOTHING`,
    ).bind(row.rep_id, row.farm_id, orderId, row.order_farm_id, sales, String(percent), commission).run();
  }
}

async function uniqueCode(env: Env): Promise<string> {
  for (let n = 0; n < 6; n += 1) {
    const code = referralCode();
    const taken = await env.DB.prepare(`SELECT id FROM reps WHERE code = ?`).bind(code).first();
    if (!taken) return code;
  }
  throw new HttpError('try again.');
}

async function newViewToken(): Promise<{ token: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { token, hash: await sha256Hex(token) };
}
