import { HttpError, json } from './http';
import {
  DOCUMENTS,
  ONBOARDING_ITEMS,
  STANDARDS,
  assertDocument,
  assertDocumentStatus,
  assertMark,
  assertStage,
  assertStandard,
  canonicalStage,
  canTurnUdafOn,
  decisionEffect,
  documentHints,
  rankProducts,
  repeatBuyers,
  salesReport,
  scoreLine,
  stageDue,
  udafType,
  validExpiry,
  type FarmClock,
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
  stage_entered_at: string;
  sample_received_at: string;
  review_completed_at: string;
  approved_at: string;
  live_at: string;
  last_weekly_at: string;
  last_recheck_at: string;
  pause_reason: string;
  remove_reason: string;
  visited_on: string;
  onboarding_json: string;
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
  const sample = path.match(/^\/api\/admin\/farms\/(\d+)\/sample$/);
  if (method === 'POST' && sample) return markSample(env, Number(sample[1]), await readJson(request));
  const live = path.match(/^\/api\/admin\/farms\/(\d+)\/live$/);
  if (method === 'POST' && live) return goLive(env, Number(live[1]));
  const pause = path.match(/^\/api\/admin\/farms\/(\d+)\/pause$/);
  if (method === 'POST' && pause) return pauseFarm(env, Number(pause[1]), await readJson(request));
  const remove = path.match(/^\/api\/admin\/farms\/(\d+)\/remove$/);
  if (method === 'POST' && remove) return removeFarm(env, Number(remove[1]), await readJson(request));
  const weekly = path.match(/^\/api\/admin\/farms\/(\d+)\/weekly$/);
  if (method === 'POST' && weekly) return stamp(env, Number(weekly[1]), 'last_weekly_at', 'weekly');
  const recheck = path.match(/^\/api\/admin\/farms\/(\d+)\/recheck$/);
  if (method === 'POST' && recheck) return stamp(env, Number(recheck[1]), 'last_recheck_at', 'recheck');
  const visit = path.match(/^\/api\/admin\/farms\/(\d+)\/visit$/);
  if (method === 'POST' && visit) return visitFarm(env, Number(visit[1]), await readJson(request));
  const boarding = path.match(/^\/api\/admin\/farms\/(\d+)\/onboarding$/);
  if (method === 'POST' && boarding) return saveOnboarding(env, Number(boarding[1]), await readJson(request));
  const udaf = path.match(/^\/api\/admin\/farms\/(\d+)\/products\/(\d+)\/udaf$/);
  if (method === 'POST' && udaf) return setUdaf(env, Number(udaf[1]), Number(udaf[2]), await readJson(request));
  throw new HttpError('not found.', 404);
}

async function dashboard(env: Env): Promise<Response> {
  const farms = await env.DB.prepare(
    `SELECT id, name, city, pipeline_stage, decision, status, active, is_demo, what_you_sell, conditions_note, created_at,
            stage_entered_at, sample_received_at, review_completed_at, approved_at, live_at, last_weekly_at, last_recheck_at, pause_reason, remove_reason
     FROM farms ORDER BY created_at DESC`,
  ).all<Pick<FarmRow, 'id' | 'name' | 'city' | 'pipeline_stage' | 'decision' | 'status' | 'active' | 'is_demo' | 'what_you_sell' | 'conditions_note' | 'created_at' | 'stage_entered_at' | 'sample_received_at' | 'review_completed_at' | 'approved_at' | 'live_at' | 'last_weekly_at' | 'last_recheck_at' | 'pause_reason' | 'remove_reason'>>();
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
  const overdue = briefs.filter((farm) => farm.overdue);
  return json({
    overdue,
    test: true,
    testLabel: 'test orders. no payment was taken.',
    counts: {
      newApplications: briefs.filter((farm) => farm.stage === 'application_received' && !farm.decision).length,
      inReview: briefs.filter((farm) => !farm.decision && farm.stage !== 'application_received' && farm.stage !== 'ongoing').length,
      overdue: overdue.length,
      approved: briefs.filter((farm) => farm.status === 'approved').length,
      active: briefs.filter((farm) => farm.status === 'approved' && farm.active).length,
      waitlist: briefs.filter((farm) => farm.status === 'waitlist').length,
      declined: briefs.filter((farm) => farm.status === 'declined' || farm.status === 'rejected').length,
      pipeline,
    },
    newApplications: briefs.filter((farm) => farm.stage === 'application_received' && !farm.decision),
    inReview: briefs.filter((farm) => !farm.decision && farm.stage !== 'application_received' && farm.stage !== 'ongoing'),
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
      pipelineStage: canonicalStage(farm.pipeline_stage || 'application_received'),
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
    `SELECT p.id, p.active, p.needs_udaf, p.udaf_on, c.name, c.category
     FROM products p JOIN catalog_foods c ON c.id = p.food_id WHERE p.farm_id = ? ORDER BY p.id`,
  ).bind(id).all<{ id: number; active: number; needs_udaf: number; udaf_on: number; name: string; category: string }>();
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
      stage: canonicalStage(farm.pipeline_stage || 'application_received'),
      decision: farm.decision || '',
      decisionNote: farm.decision_note || '',
      conditionsNote: farm.conditions_note || '',
      summary: farm.score_summary || '',
      createdAt: farm.created_at,
      reviewedAt: farm.reviewed_at,
      sampleReceivedAt: farm.sample_received_at || '',
      visitedOn: farm.visited_on || '',
      pauseReason: farm.pause_reason || '',
      removeReason: farm.remove_reason || '',
      onboarding: parseOnboarding(farm.onboarding_json),
      ...stageDue(clockOf(farm)),
    },
    scoreLine: scoreLine(scoreRows),
    products: foods.results.map((food) => {
      const type = udafType(`${food.name} ${food.category}`);
      const needsUdaf = !!food.needs_udaf || !!type;
      return {
        id: food.id,
        name: food.name,
        active: !!food.active,
        needsUdaf,
        udafOn: !!food.udaf_on,
        udafDetail: type?.detail || (needsUdaf ? 'needs UDAF check' : ''),
        udafDocument: type?.document || '',
      };
    }),
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
  const current = canonicalStage(farm.pipeline_stage || 'application_received');
  if (stage === current && !note) return json({ ok: true, unchanged: true });
  const reviewStamp = stage === 'score' && !farm.review_completed_at ? ", review_completed_at = datetime('now')" : '';
  await env.DB.prepare(
    `UPDATE farms SET pipeline_stage = ?, stage_entered_at = datetime('now')${reviewStamp} WHERE id = ?`,
  ).bind(stage, id).run();
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
  const approved = effect.status === 'approved';
  const stayLive = approved && !!farm.active && !farm.remove_reason;
  const active = stayLive ? 1 : 0;
  const stage = approved ? (stayLive ? 'ongoing' : 'onboarding') : 'decision';
  const token = approved ? (farm.access_token || crypto.randomUUID()) : farm.access_token;
  await env.DB.prepare(
    `UPDATE farms
     SET status = ?, active = ?, decision = ?, decision_note = ?, conditions_note = ?, pipeline_stage = ?,
         access_token = ?, reviewed_at = datetime('now'), stage_entered_at = datetime('now'),
         approved_at = CASE WHEN ? = 1 AND approved_at = '' THEN datetime('now') ELSE approved_at END
     WHERE id = ?`,
  ).bind(effect.status, active, effect.decision, effect.decisionNote, effect.conditionsNote, stage, token, approved ? 1 : 0, id).run();
  await log(env, id, 'decision', farm.decision || farm.status, effect.decision, effect.decisionNote);
  return json({
    ok: true,
    status: effect.status,
    active: active === 1,
    stage,
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
  if (body.active && farm.remove_reason) throw new HttpError('this farm was removed. the reason is on the record.');
  if (body.active) return goLive(env, id);
  await env.DB.prepare(`UPDATE farms SET active = 0 WHERE id = ?`).bind(farm.id).run();
  await log(env, id, 'active', farm.active ? 'on' : 'off', 'off', '');
  return json({ ok: true, active: false });
}

async function goLive(env: Env, id: number): Promise<Response> {
  const farm = await mustFarm(env, id);
  if (farm.status !== 'approved') throw new HttpError('approve the farm before it goes live.');
  if (farm.remove_reason) throw new HttpError('this farm was removed. the reason is on the record.');
  await env.DB.prepare(
    `UPDATE farms
     SET active = 1, pause_reason = '', pipeline_stage = 'ongoing', stage_entered_at = datetime('now'),
         live_at = CASE WHEN live_at = '' THEN datetime('now') ELSE live_at END
     WHERE id = ?`,
  ).bind(id).run();
  await log(env, id, 'live', farm.pipeline_stage || '', 'ongoing', '');
  return json({ ok: true, active: true, stage: 'ongoing' });
}

async function markSample(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  await mustFarm(env, id);
  const at = clean(body.at, 10);
  if (at && !validExpiry(at)) throw new HttpError('the received date looks like 2026-11-13.');
  await env.DB.prepare(
    `UPDATE farms SET sample_received_at = CASE WHEN ? = '' THEN datetime('now') ELSE ? END WHERE id = ?`,
  ).bind(at, `${at} 12:00:00`, id).run();
  await log(env, id, 'sample', '', at || 'received', clean(body.note, 400));
  return json({ ok: true });
}

async function pauseFarm(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  if (farm.status !== 'approved') throw new HttpError('only a live farm can be paused.');
  if (body.resume) {
    if (farm.remove_reason) throw new HttpError('this farm was removed. the reason is on the record.');
    await env.DB.prepare(
      `UPDATE farms SET active = 1, pause_reason = '', pipeline_stage = 'ongoing' WHERE id = ?`,
    ).bind(id).run();
    await log(env, id, 'pause', 'paused', 'on', clean(body.reason, 400));
    return json({ ok: true, active: true, paused: false });
  }
  const reason = clean(body.reason, 400);
  if (!reason) throw new HttpError('a pause needs a reason.');
  await env.DB.prepare(`UPDATE farms SET active = 0, pause_reason = ? WHERE id = ?`).bind(reason, id).run();
  await log(env, id, 'pause', 'on', 'paused', reason);
  return json({ ok: true, active: false, paused: true });
}

async function removeFarm(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  if (farm.status !== 'approved') throw new HttpError('only a farm that was approved can be removed.');
  const reason = clean(body.reason, 400);
  if (!reason) throw new HttpError('removing a farm needs a reason.');
  await env.DB.prepare(`UPDATE farms SET active = 0, remove_reason = ? WHERE id = ?`).bind(reason, id).run();
  await log(env, id, 'remove', farm.active ? 'on' : 'off', 'removed', reason);
  return json({ ok: true, active: false, removed: true });
}

async function stamp(env: Env, id: number, column: 'last_weekly_at' | 'last_recheck_at', kind: string): Promise<Response> {
  await mustFarm(env, id);
  await env.DB.prepare(`UPDATE farms SET ${column} = datetime('now') WHERE id = ?`).bind(id).run();
  await log(env, id, kind, '', 'done', '');
  return json({ ok: true });
}

async function visitFarm(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  await mustFarm(env, id);
  const date = clean(body.date, 10);
  if (!validExpiry(date) || !date) throw new HttpError('a visit needs the date you were there.');
  await env.DB.prepare(`UPDATE farms SET visited_on = ? WHERE id = ?`).bind(date, id).run();
  await log(env, id, 'visit', '', date, clean(body.note, 400));
  return json({ ok: true, visitedOn: date });
}

async function saveOnboarding(env: Env, id: number, body: Record<string, unknown>): Promise<Response> {
  const farm = await mustFarm(env, id);
  const key = clean(body.key, 40);
  if (!ONBOARDING_ITEMS.some((item) => item.key === key)) throw new HttpError('that onboarding item is not on the list.');
  let current: Record<string, boolean> = {};
  try {
    current = JSON.parse(farm.onboarding_json || '{}') as Record<string, boolean>;
  } catch {
    current = {};
  }
  current[key] = !!body.done;
  await env.DB.prepare(`UPDATE farms SET onboarding_json = ? WHERE id = ?`).bind(JSON.stringify(current), id).run();
  await log(env, id, 'onboarding', key, body.done ? 'done' : 'open', '');
  if (key === 'live' && body.done) return goLive(env, id);
  return json({ ok: true, onboarding: current });
}

async function setUdaf(env: Env, farmId: number, productId: number, body: Record<string, unknown>): Promise<Response> {
  await mustFarm(env, farmId);
  const product = await env.DB.prepare(
    `SELECT p.id, p.needs_udaf, p.udaf_on, c.name, c.category
     FROM products p JOIN catalog_foods c ON c.id = p.food_id
     WHERE p.id = ? AND p.farm_id = ?`,
  ).bind(productId, farmId).first<{ id: number; needs_udaf: number; udaf_on: number; name: string; category: string }>();
  if (!product) throw new HttpError('that product is not on this farm.', 404);
  const type = udafType(`${product.name} ${product.category}`);
  if (!product.needs_udaf && !type) throw new HttpError('this product does not need a udaf check.');
  const document = type?.document || 'cottage_food';
  if (body.on) {
    const saved = await env.DB.prepare(
      `SELECT status FROM farm_documents WHERE farm_id = ? AND document_key = ?`,
    ).bind(farmId, document).first<{ status: string }>();
    if (!canTurnUdafOn(saved?.status || '')) {
      throw new HttpError(`verify the ${document.replace(/_/g, ' ')} before this can go on the shop.`);
    }
    await env.DB.prepare(`UPDATE products SET needs_udaf = 1, udaf_on = 1, active = 1 WHERE id = ?`).bind(productId).run();
    await log(env, farmId, 'udaf', product.name, 'on', '');
    return json({ ok: true, udafOn: true });
  }
  await env.DB.prepare(`UPDATE products SET needs_udaf = 1, udaf_on = 0, active = 0 WHERE id = ?`).bind(productId).run();
  await log(env, farmId, 'udaf', product.name, 'off', '');
  return json({ ok: true, udafOn: false });
}

function parseOnboarding(raw: string): Record<string, boolean> {
  try {
    const value = JSON.parse(raw || '{}') as Record<string, boolean>;
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function brief(farm: Pick<FarmRow, 'id' | 'name' | 'city' | 'pipeline_stage' | 'decision' | 'status' | 'active' | 'is_demo' | 'what_you_sell' | 'conditions_note' | 'created_at' | 'stage_entered_at' | 'sample_received_at' | 'review_completed_at' | 'approved_at' | 'live_at' | 'last_weekly_at' | 'last_recheck_at' | 'pause_reason' | 'remove_reason'>) {
  const due = stageDue(clockOf(farm));
  return {
    id: farm.id,
    name: farm.name,
    city: farm.city,
    stage: canonicalStage(farm.pipeline_stage || 'application_received'),
    decision: farm.decision || '',
    status: farm.status,
    active: !!farm.active,
    isDemo: !!farm.is_demo,
    whatYouSell: farm.what_you_sell,
    conditionsNote: farm.conditions_note || '',
    createdAt: farm.created_at,
    paused: !!farm.pause_reason,
    removed: !!farm.remove_reason,
    dueAt: due.dueAt,
    overdue: due.overdue,
    dueWaiting: due.waiting,
    quarterlyDueAt: due.quarterlyDueAt,
    quarterlyOverdue: due.quarterlyOverdue,
  };
}

function clockOf(farm: { pipeline_stage: string; decision: string; created_at: string; stage_entered_at: string; sample_received_at: string; review_completed_at: string; approved_at: string; live_at: string; last_weekly_at: string; last_recheck_at: string }): FarmClock {
  return {
    stage: farm.pipeline_stage || 'application_received',
    receivedAt: farm.created_at,
    stageEnteredAt: farm.stage_entered_at || '',
    sampleReceivedAt: farm.sample_received_at || '',
    reviewCompletedAt: farm.review_completed_at || '',
    approvedAt: farm.approved_at || '',
    liveAt: farm.live_at || '',
    lastWeeklyAt: farm.last_weekly_at || '',
    lastRecheckAt: farm.last_recheck_at || '',
    decided: !!farm.decision,
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
