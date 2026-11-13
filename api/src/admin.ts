import { HttpError, json } from './http';
import {
  DOCUMENTS,
  STANDARDS,
  assertDocument,
  assertDocumentStatus,
  assertMark,
  assertStage,
  assertStandard,
  decisionEffect,
  documentHints,
  rankProducts,
  repeatBuyers,
  salesReport,
  scoreLine,
  validExpiry,
  type LedgerOrder,
} from './review';

type Env = { DB: D1Database; ADMIN_TOKEN?: string };

type FarmRow = {
  id: number;
  slug: string;
  name: string;
  farmer_names: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  active: number;
  is_demo: number;
  access_token: string | null;
  what_you_sell: string;
  sell_now: string;
  fulfillment_pref: string;
  link: string;
  pipeline_stage: string;
  decision: string;
  decision_note: string;
  conditions_note: string;
  score_summary: string;
  created_at: string;
  reviewed_at: string | null;
};

export async function handleAdmin(request: Request, env: Env, method: string, path: string): Promise<Response> {
  requireAdmin(request, env);
  if (method === 'GET' && path === '/api/admin/dashboard') return dashboard(env);
  if (method === 'GET' && path === '/api/admin/farms') return listFarms(env);
  const detail = path.match(/^\/api\/admin\/farms\/(\d+)$/);
  if (method === 'GET' && detail) return farmReview(env, Number(detail[1]));
  const stage = path.match(/^\/api\/admin\/farms\/(\d+)\/stage$/);
  if (method === 'POST' && stage) return moveStage(env, Number(stage[1]), await readJson(request));
  const score = path.match(/^\/api\/admin\/farms\/(\d+)\/score$/);
  if (method === 'POST' && score) return saveScore(env, Number(score[1]), await readJson(request));
  const summary = path.match(/^\/api\/admin\/farms\/(\d+)\/summary$/);
  if (method === 'POST' && summary) return saveSummary(env, Number(summary[1]), await readJson(request));
  const document = path.match(/^\/api\/admin\/farms\/(\d+)\/document$/);
  if (method === 'POST' && document) return saveDocument(env, Number(document[1]), await readJson(request));
  const decision = path.match(/^\/api\/admin\/farms\/(\d+)\/decision$/);
  if (method === 'POST' && decision) return decide(env, Number(decision[1]), await readJson(request));
  const approve = path.match(/^\/api\/admin\/farms\/(\d+)\/approve$/);
  if (method === 'POST' && approve) return decide(env, Number(approve[1]), { decision: 'approve' });
  const reject = path.match(/^\/api\/admin\/farms\/(\d+)\/reject$/);
  if (method === 'POST' && reject) return decide(env, Number(reject[1]), { decision: 'decline' });
  const active = path.match(/^\/api\/admin\/farms\/(\d+)\/active$/);
  if (method === 'POST' && active) return setActive(env, Number(active[1]), await readJson(request));
  throw new HttpError('not found.', 404);
}

async function dashboard(env: Env): Promise<Response> {
  const farms = await env.DB.prepare(
    `SELECT id, name, city, pipeline_stage, decision, status, active, is_demo, what_you_sell, conditions_note, created_at
     FROM farms ORDER BY created_at DESC`,
  ).all<Pick<FarmRow, 'id' | 'name' | 'city' | 'pipeline_stage' | 'decision' | 'status' | 'active' | 'is_demo' | 'what_you_sell' | 'conditions_note' | 'created_at'>>();
  const orders = await env.DB.prepare(
    `SELECT id, customer_name, customer_email, customer_phone, merchandise_cents, total_cents, created_at
     FROM orders WHERE status = 'placed_test' OR payment_status = 'unpaid_test'`,
  ).all<{ id: number; customer_name: string; customer_email: string; customer_phone: string; merchandise_cents: number; total_cents: number; created_at: string }>();
  const items = await env.DB.prepare(
    `SELECT i.food_name AS name, i.quantity AS units, i.line_cents AS revenueCents
     FROM order_items i
     JOIN order_farms ofm ON ofm.id = i.order_farm_id
     JOIN orders o ON o.id = ofm.order_id
     WHERE o.status = 'placed_test' OR o.payment_status = 'unpaid_test'`,
  ).all<{ name: string; units: number; revenueCents: number }>();
  const briefs = farms.results.map(brief);
  const ledger: LedgerOrder[] = orders.results.map((order) => ({
    email: order.customer_email,
    phone: order.customer_phone,
    name: order.customer_name,
    merchandiseCents: order.merchandise_cents,
    totalCents: order.total_cents,
    createdAt: order.created_at,
  }));
  const pipeline: Record<string, number> = {};
  for (const farm of briefs) {
    if (farm.decision) continue;
    pipeline[farm.stage] = (pipeline[farm.stage] || 0) + 1;
  }
  const decided = new Set(['approved', 'waitlist', 'declined', 'rejected']);
  return json({
    test: true,
    testLabel: 'test orders. no payment was taken.',
    counts: {
      newApplications: briefs.filter((farm) => farm.stage === 'new' && !farm.decision).length,
      inReview: briefs.filter((farm) => !farm.decision && farm.stage !== 'new').length,
      approved: briefs.filter((farm) => farm.status === 'approved').length,
      active: briefs.filter((farm) => farm.status === 'approved' && farm.active).length,
      waitlist: briefs.filter((farm) => farm.status === 'waitlist').length,
      declined: briefs.filter((farm) => farm.status === 'declined' || farm.status === 'rejected').length,
      pipeline,
    },
    newApplications: briefs.filter((farm) => farm.stage === 'new' && !farm.decision),
    inReview: briefs.filter((farm) => !farm.decision && farm.stage !== 'new'),
    approved: briefs.filter((farm) => farm.status === 'approved'),
    other: briefs.filter((farm) => decided.has(farm.status) && farm.status !== 'approved'),
    sales: salesReport(ledger),
    topByUnits: rankProducts(items.results, 'units'),
    topByRevenue: rankProducts(items.results, 'revenue'),
    repeatBuyers: repeatBuyers(ledger),
  });
}

async function listFarms(env: Env): Promise<Response> {
  const farms = await env.DB.prepare(
    `SELECT * FROM farms ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC`,
  ).all<FarmRow>();
  return json({
    farms: farms.results.map((farm) => ({
      id: farm.id,
      slug: farm.slug,
      name: farm.name,
      city: farm.city,
      email: farm.email,
      phone: farm.phone,
      status: farm.status,
      active: !!farm.active,
      whatYouSell: farm.what_you_sell,
      sellNow: farm.sell_now,
      fulfillmentPref: farm.fulfillment_pref,
      link: farm.link,
      accessToken: farm.access_token,
      isDemo: !!farm.is_demo,
      pipelineStage: farm.pipeline_stage || 'new',
      decision: farm.decision || '',
      conditionsNote: farm.conditions_note || '',
      createdAt: farm.created_at,
      reviewedAt: farm.reviewed_at,
    })),
  });
}

async function farmReview(env: Env, id: number): Promise<Response> {
  const farm = await mustFarm(env, id);
  const scores = await env.DB.prepare(
    `SELECT standard_key, mark, note FROM farm_scores WHERE farm_id = ?`,
  ).bind(id).all<{ standard_key: string; mark: string; note: string }>();
  const documents = await env.DB.prepare(
    `SELECT document_key, status, note, expires_on FROM farm_documents WHERE farm_id = ?`,
  ).bind(id).all<{ document_key: string; status: string; note: string; expires_on: string }>();
  const activity = await env.DB.prepare(
    `SELECT id, kind, from_value, to_value, note, created_at FROM farm_activity WHERE farm_id = ? ORDER BY id DESC`,
  ).bind(id).all<{ id: number; kind: string; from_value: string; to_value: string; note: string; created_at: string }>();
  const foods = await env.DB.prepare(
    `SELECT c.name, c.category FROM products p JOIN catalog_foods c ON c.id = p.food_id WHERE p.farm_id = ?`,
  ).bind(id).all<{ name: string; category: string }>();
  const hintText = [farm.what_you_sell, farm.sell_now, ...foods.results.map((food) => `${food.name} ${food.category}`)].join(' ');
  const hints = documentHints(hintText);
  const scoreByKey = new Map(scores.results.map((row) => [row.standard_key, row]));
  const docByKey = new Map(documents.results.map((row) => [row.document_key, row]));
  const scoreRows = STANDARDS.map((standard) => {
    const row = scoreByKey.get(standard.key);
    return { key: standard.key, mark: row?.mark || '', note: row?.note || '' };
  });
  return json({
    farm: {
      id: farm.id,
      slug: farm.slug,
      name: farm.name,
      farmerNames: farm.farmer_names,
      email: farm.email,
      phone: farm.phone,
      city: farm.city,
      whatYouSell: farm.what_you_sell,
      sellNow: farm.sell_now,
      fulfillmentPref: farm.fulfillment_pref,
      link: farm.link,
      status: farm.status,
      active: !!farm.active,
      isDemo: !!farm.is_demo,
      accessToken: farm.access_token,
      stage: farm.pipeline_stage || 'new',
      decision: farm.decision || '',
      decisionNote: farm.decision_note || '',
      conditionsNote: farm.conditions_note || '',
      summary: farm.score_summary || '',
      createdAt: farm.created_at,
      reviewedAt: farm.reviewed_at,
    },
    scoreLine: scoreLine(scoreRows),
    scores: scoreRows,
    documents: DOCUMENTS.map((document) => {
      const row = docByKey.get(document.key);
      return {
        key: document.key,
        status: row?.status || '',
        note: row?.note || '',
        expiresOn: row?.expires_on || '',
        hinted: hints.includes(document.key),
      };
    }),
    activity: activity.results.map((row) => ({
      id: row.id,
      kind: row.kind,
      from: row.from_value,
      to: row.to_value,
      note: row.note,
      createdAt: row.created_at,
    })),
  });
}

async function moveStage(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  let stage: string;
  try {
    stage = assertStage(clean(body.stage, 40));
  } catch (error) {
    throw new HttpError(messageOf(error));
  }
  const note = clean(body.note, 400);
  const current = farm.pipeline_stage || 'new';
  if (stage === current && !note) return json({ ok: true, unchanged: true });
  await env.DB.prepare(`UPDATE farms SET pipeline_stage = ? WHERE id = ?`).bind(stage, id).run();
  await log(env, id, stage === current ? 'note' : 'stage', current, stage, note);
  return json({ ok: true, stage });
}

async function saveScore(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  await mustFarm(env, id);
  let standard: string;
  let mark = clean(body.mark, 20);
  try {
    standard = assertStandard(clean(body.standard, 40));
    if (mark) mark = assertMark(mark);
  } catch (error) {
    throw new HttpError(messageOf(error));
  }
  const note = clean(body.note, 400);
  const previous = await env.DB.prepare(
    `SELECT mark FROM farm_scores WHERE farm_id = ? AND standard_key = ?`,
  ).bind(id, standard).first<{ mark: string }>();
  await env.DB.prepare(
    `INSERT INTO farm_scores (farm_id, standard_key, mark, note, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (farm_id, standard_key) DO UPDATE SET mark = excluded.mark, note = excluded.note, updated_at = datetime('now')`,
  ).bind(id, standard, mark, note).run();
  await log(env, id, 'score', `${standard}:${previous?.mark || ''}`, `${standard}:${mark}`, note);
  return json({ ok: true });
}

async function saveSummary(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  const summary = clean(body.summary, 600);
  await env.DB.prepare(`UPDATE farms SET score_summary = ? WHERE id = ?`).bind(summary, id).run();
  await log(env, id, 'summary', farm.score_summary || '', summary, '');
  return json({ ok: true });
}

async function saveDocument(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  await mustFarm(env, id);
  let key: string;
  let status: string;
  try {
    key = assertDocument(clean(body.key, 40));
    status = assertDocumentStatus(clean(body.status, 40));
  } catch (error) {
    throw new HttpError(messageOf(error));
  }
  const note = clean(body.note, 400);
  const expiresOn = clean(body.expiresOn, 10);
  if (!validExpiry(expiresOn)) throw new HttpError('expiry is a date, like 2027-06-01.');
  const previous = await env.DB.prepare(
    `SELECT status FROM farm_documents WHERE farm_id = ? AND document_key = ?`,
  ).bind(id, key).first<{ status: string }>();
  await env.DB.prepare(
    `INSERT INTO farm_documents (farm_id, document_key, status, note, expires_on, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (farm_id, document_key) DO UPDATE SET status = excluded.status, note = excluded.note, expires_on = excluded.expires_on, updated_at = datetime('now')`,
  ).bind(id, key, status, note, expiresOn).run();
  await log(env, id, 'document', `${key}:${previous?.status || ''}`, `${key}:${status}`, note);
  return json({ ok: true });
}

async function decide(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  let effect;
  try {
    effect = decisionEffect(clean(body.decision, 40), clean(body.note, 600));
  } catch (error) {
    throw new HttpError(messageOf(error));
  }
  const token = effect.active ? (farm.access_token || crypto.randomUUID()) : farm.access_token;
  await env.DB.prepare(
    `UPDATE farms
     SET status = ?, active = ?, decision = ?, decision_note = ?, conditions_note = ?, pipeline_stage = 'decision',
         access_token = ?, reviewed_at = datetime('now')
     WHERE id = ?`,
  ).bind(effect.status, effect.active, effect.decision, effect.decisionNote, effect.conditionsNote, token, id).run();
  await log(env, id, 'decision', farm.decision || farm.status, effect.decision, effect.decisionNote);
  return json({
    ok: true,
    status: effect.status,
    active: effect.active === 1,
    decision: effect.decision,
    conditionsNote: effect.conditionsNote,
    accessToken: token,
    slug: farm.slug,
    name: farm.name,
  });
}

async function setActive(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  if (farm.status !== 'approved') throw new HttpError('approve the farm before switching it on.');
  await env.DB.prepare(`UPDATE farms SET active = ? WHERE id = ?`).bind(body.active ? 1 : 0, farm.id).run();
  await log(env, id, 'active', farm.active ? 'on' : 'off', body.active ? 'on' : 'off', '');
  return json({ ok: true, active: !!body.active });
}

function brief(farm: Pick<FarmRow, 'id' | 'name' | 'city' | 'pipeline_stage' | 'decision' | 'status' | 'active' | 'is_demo' | 'what_you_sell' | 'conditions_note' | 'created_at'>) {
  return {
    id: farm.id,
    name: farm.name,
    city: farm.city,
    stage: farm.pipeline_stage || 'new',
    decision: farm.decision || '',
    status: farm.status,
    active: !!farm.active,
    isDemo: !!farm.is_demo,
    whatYouSell: farm.what_you_sell,
    conditionsNote: farm.conditions_note || '',
    createdAt: farm.created_at,
  };
}

async function log(env: Env, farmId: number, kind: string, from: string, to: string, note: string) {
  await env.DB.prepare(
    `INSERT INTO farm_activity (farm_id, kind, from_value, to_value, note) VALUES (?, ?, ?, ?, ?)`,
  ).bind(farmId, kind, from, to, note).run();
}

async function mustFarm(env: Env, id: number): Promise<FarmRow> {
  const farm = await env.DB.prepare(`SELECT * FROM farms WHERE id = ?`).bind(id).first<FarmRow>();
  if (!farm) throw new HttpError('no farm with that id.', 404);
  return farm;
}

function requireAdmin(request: Request, env: Env) {
  if (!env.ADMIN_TOKEN) throw new HttpError('admin token is not set on the worker.', 503);
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || !safeEqual(token, env.ADMIN_TOKEN)) throw new HttpError('that admin token does not match.', 401);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text) return {};
  if (text.length > 20_000) throw new HttpError('that is too large.');
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError('that was not valid.');
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'that did not work.';
}
