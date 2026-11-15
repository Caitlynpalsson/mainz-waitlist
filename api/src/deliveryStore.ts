import {
  SHORT_RUN_NOTE,
  cleanRouteInput,
  closeRunDecision,
  cutoffInstantForRun,
  deliveryLine,
  followingRun,
  nextDelivery,
  offerForAddress,
  parseAddress,
  partnerSheet,
  restoreDeliveryFee,
  runCountLabel,
  waiveDeliveryFee,
  type AreaRoute,
  type RouteOffer,
  type SheetStop,
} from './delivery';
import { HttpError, json } from './http';

type Env = { DB: D1Database };

type RouteRow = {
  id: number;
  name: string;
  area_json: string;
  delivery_day: number;
  cutoff_day: number;
  cutoff_time: string;
  min_orders: number;
  target_orders: number;
  active: number;
  is_sample: number;
};

type RunRow = {
  id: number;
  route_id: number;
  run_date: string;
  status: string;
  closed_at: string;
  order_count: number;
};

type OrderRow = {
  id: number;
  public_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  merchandise_cents: number;
  delivery_fee_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  route_id: number | null;
  run_date: string;
  route_status: string;
  delivery_fee_state: string;
  delivery_fee_quoted_cents: number;
};

export async function adminRoutes(env: Env, now = new Date()): Promise<Response> {
  const routes = await loadRoutes(env);
  const runs = await env.DB.prepare(`SELECT * FROM route_runs`).all<RunRow>();
  const counts = await env.DB.prepare(
    `SELECT route_id, run_date, COUNT(*) AS n FROM orders WHERE route_status = 'pending_route' GROUP BY route_id, run_date`,
  ).all<{ route_id: number; run_date: string; n: number }>();
  const today = denverToday(now);
  return json({
    routes: routes.map((route) => {
      const own = runs.results.filter((run) => run.route_id === route.id);
      const next = nextDelivery(route, now);
      const shown = new Map<string, RunRow | null>();
      for (const run of own) {
        if (run.status === 'open' || run.run_date >= today) shown.set(run.run_date, run);
      }
      if (!shown.has(next.runDate)) shown.set(next.runDate, null);
      const list = [...shown.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([runDate, run]) => {
        const live = counts.results.find((row) => row.route_id === route.id && row.run_date === runDate)?.n || 0;
        const count = run && run.status !== 'open' ? run.order_count : live;
        const status = run?.status || 'open';
        return {
          id: run?.id || null,
          runDate,
          status,
          count,
          label: runCountLabel(count, route.minOrders, route.targetOrders),
          line: deliveryLine(runDate, route),
          canClose: status === 'open',
          sheetReady: status === 'confirmed',
        };
      });
      return {
        id: route.id,
        name: route.name,
        area: route.area.join(', '),
        deliveryDay: route.deliveryDay,
        cutoffDay: route.cutoffDay,
        cutoffTime: route.cutoffTime,
        minOrders: route.minOrders,
        targetOrders: route.targetOrders,
        active: route.active,
        isSample: route.name.toLowerCase().startsWith('sample'),
        runs: list,
      };
    }),
  });
}

export async function adminSaveRoute(env: Env, id: number | null, body: Record<string, unknown>): Promise<Response> {
  let input;
  try {
    input = cleanRouteInput(body);
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : 'check the route.');
  }
  const area = JSON.stringify(input.area);
  const sample = input.isSample ? 1 : 0;
  const active = input.active ? 1 : 0;
  if (id == null) {
    await env.DB.prepare(
      `INSERT INTO delivery_routes (
        name, area_json, delivery_day, cutoff_day, cutoff_time, min_orders, target_orders, active, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(input.name, area, input.deliveryDay, input.cutoffDay, input.cutoffTime, input.minOrders, input.targetOrders, active, sample).run();
  } else {
    const existing = await env.DB.prepare(`SELECT id FROM delivery_routes WHERE id = ?`).bind(id).first();
    if (!existing) throw new HttpError('no route with that id.', 404);
    await env.DB.prepare(
      `UPDATE delivery_routes
       SET name = ?, area_json = ?, delivery_day = ?, cutoff_day = ?, cutoff_time = ?, min_orders = ?, target_orders = ?, active = ?, is_sample = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(input.name, area, input.deliveryDay, input.cutoffDay, input.cutoffTime, input.minOrders, input.targetOrders, active, sample, id).run();
  }
  return adminRoutes(env);
}

export async function adminCloseRun(env: Env, routeId: number, runDate: string, now = new Date()): Promise<Response> {
  const routes = await loadRoutes(env);
  const route = routes.find((item) => item.id === routeId);
  if (!route) throw new HttpError('no route with that id.', 404);
  const date = runDate || nextDelivery(route, now).runDate;
  await env.DB.prepare(
    `INSERT INTO route_runs (route_id, run_date, status) VALUES (?, ?, 'open') ON CONFLICT (route_id, run_date) DO NOTHING`,
  ).bind(route.id, date).run();
  const run = await env.DB.prepare(
    `SELECT * FROM route_runs WHERE route_id = ? AND run_date = ?`,
  ).bind(route.id, date).first<RunRow>();
  if (!run) throw new HttpError('could not open that run.');
  if (run.status === 'open') await finishClose(env, route, run, now);
  return adminRoutes(env, now);
}

export async function adminRunSheet(env: Env, routeId: number, runDate: string): Promise<Response> {
  const routes = await loadRoutes(env);
  const route = routes.find((item) => item.id === routeId);
  if (!route) throw new HttpError('no route with that id.', 404);
  const run = await env.DB.prepare(
    `SELECT * FROM route_runs WHERE route_id = ? AND run_date = ?`,
  ).bind(routeId, runDate).first<RunRow>();
  if (!run || run.status !== 'confirmed') throw new HttpError('that run is not confirmed.');
  const orders = await env.DB.prepare(
    `SELECT * FROM orders WHERE route_id = ? AND run_date = ? AND route_status = 'confirmed' ORDER BY id`,
  ).bind(routeId, runDate).all<OrderRow>();
  const stops: SheetStop[] = [];
  for (const order of orders.results) stops.push(await sheetStop(env, order));
  return json({ text: partnerSheet({ name: route.name, runDate, status: 'confirmed' }, stops) });
}

export async function closeDueRuns(env: Env, now = new Date()): Promise<{ closed: number }> {
  const routes = await loadRoutes(env);
  const runs = await env.DB.prepare(`SELECT * FROM route_runs WHERE status = 'open'`).all<RunRow>();
  let closed = 0;
  for (const run of runs.results) {
    const route = routes.find((item) => item.id === run.route_id);
    if (!route) continue;
    const cutoff = cutoffInstantForRun(run.run_date, route);
    if (now.getTime() < cutoff.getTime()) continue;
    await finishClose(env, route, run, now);
    closed += 1;
  }
  return { closed };
}

export async function lookupRoute(env: Env, line1: string, cityZip: string, delivering: boolean, now = new Date()): Promise<RouteOffer | null> {
  if (!delivering) return null;
  const routes = (await loadRoutes(env)).filter((route) => route.active);
  return offerForAddress(parseAddress(line1, cityZip), routes, now);
}

export async function ensureRun(env: Env, routeId: number, runDate: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO route_runs (route_id, run_date, status) VALUES (?, ?, 'open') ON CONFLICT (route_id, run_date) DO NOTHING`,
  ).bind(routeId, runDate).run();
}

export async function orderRouteSummary(env: Env, order: {
  id: number;
  route_id: number | null;
  run_date: string;
  route_status: string;
  delivery_fee_state: string;
}): Promise<{ name: string; runDate: string; status: string; line: string; feeState: string; notes: string[]; choiceOpen: boolean }> {
  const notes = await orderRouteNotes(env, order.id);
  const base = {
    name: '',
    runDate: order.run_date || '',
    status: order.route_status || '',
    line: '',
    feeState: order.delivery_fee_state || '',
    notes,
    choiceOpen: order.route_status === 'short',
  };
  if (!order.route_id) return base;
  const row = await env.DB.prepare(`SELECT * FROM delivery_routes WHERE id = ?`).bind(order.route_id).first<RouteRow>();
  if (!row || !order.run_date) return { ...base, name: row?.name || '' };
  const clock = { deliveryDay: row.delivery_day, cutoffDay: row.cutoff_day, cutoffTime: row.cutoff_time };
  return { ...base, name: row.name, line: deliveryLine(order.run_date, clock) };
}

export async function orderRouteNotes(env: Env, orderId: number): Promise<string[]> {
  const notes = await env.DB.prepare(
    `SELECT body FROM outbox WHERE order_id = ? ORDER BY id`,
  ).bind(orderId).all<{ body: string }>();
  return notes.results.map((note) => note.body);
}

export async function routeName(env: Env, routeId: number | null): Promise<string> {
  if (!routeId) return '';
  const row = await env.DB.prepare(`SELECT name FROM delivery_routes WHERE id = ?`).bind(routeId).first<{ name: string }>();
  return row?.name || '';
}

export async function chooseOrderRoute(env: Env, publicId: string, choice: string, now = new Date()): Promise<Response> {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE public_id = ?`).bind(publicId).first<OrderRow>();
  if (!order) throw new HttpError('no order with that id.', 404);
  if (order.route_status !== 'short') throw new HttpError('this order is not waiting on a route.');
  if (choice === 'pickup') {
    await env.DB.prepare(
      `UPDATE orders SET route_status = 'pickup', delivery_fee_state = 'waived', delivery_fee_cents = 0, total_cents = ? WHERE id = ?`,
    ).bind(order.merchandise_cents + order.platform_fee_cents, order.id).run();
    await env.DB.prepare(
      `UPDATE order_farms SET fulfillment = 'pickup', delivery_fee_cents = 0 WHERE order_id = ? AND fulfillment = 'delivery'`,
    ).bind(order.id).run();
    return json({ ok: true, routeStatus: 'pickup' });
  }
  if (choice !== 'next') throw new HttpError('pick pickup or the next delivery.');
  const routes = await loadRoutes(env);
  const route = routes.find((item) => item.id === order.route_id);
  if (!route) throw new HttpError('that route is gone.');
  const runDate = followingRun(route, order.run_date);
  const restored = restoreDeliveryFee({
    merchandiseCents: order.merchandise_cents,
    platformFeeCents: order.platform_fee_cents,
    quotedDeliveryFeeCents: order.delivery_fee_quoted_cents,
  });
  await ensureRun(env, route.id, runDate);
  await env.DB.prepare(
    `UPDATE orders SET route_status = 'pending_route', run_date = ?, delivery_fee_state = ?, delivery_fee_cents = ?, total_cents = ? WHERE id = ?`,
  ).bind(runDate, restored.deliveryFeeState, restored.deliveryFeeCents, restored.totalCents, order.id).run();
  const farms = await env.DB.prepare(
    `SELECT id FROM order_farms WHERE order_id = ? AND fulfillment = 'delivery' ORDER BY id`,
  ).bind(order.id).all<{ id: number }>();
  let left = restored.deliveryFeeCents;
  const share = farms.results.length ? Math.floor(restored.deliveryFeeCents / farms.results.length) : 0;
  for (let i = 0; i < farms.results.length; i += 1) {
    const cents = i === farms.results.length - 1 ? left : share;
    left -= cents;
    await env.DB.prepare(`UPDATE order_farms SET delivery_fee_cents = ? WHERE id = ?`).bind(cents, farms.results[i].id).run();
  }
  return json({ ok: true, routeStatus: 'pending_route', runDate, line: deliveryLine(runDate, route) });
}

async function finishClose(env: Env, route: AreaRoute, run: RunRow, now: Date): Promise<void> {
  const orders = await env.DB.prepare(
    `SELECT * FROM orders WHERE route_id = ? AND run_date = ? AND route_status = 'pending_route' ORDER BY id`,
  ).bind(route.id, run.run_date).all<OrderRow>();
  const count = orders.results.length;
  const decision = closeRunDecision(count, route.minOrders);
  await env.DB.prepare(
    `UPDATE route_runs SET status = ?, closed_at = ?, order_count = ? WHERE id = ?`,
  ).bind(decision, now.toISOString(), count, run.id).run();
  if (decision === 'confirmed') {
    await env.DB.prepare(
      `UPDATE orders SET route_status = 'confirmed' WHERE route_id = ? AND run_date = ? AND route_status = 'pending_route'`,
    ).bind(route.id, run.run_date).run();
    return;
  }
  for (const order of orders.results) {
    const waived = waiveDeliveryFee({
      merchandiseCents: order.merchandise_cents,
      platformFeeCents: order.platform_fee_cents,
      deliveryFeeCents: order.delivery_fee_cents,
    });
    await env.DB.prepare(
      `UPDATE orders SET route_status = 'short', delivery_fee_state = 'waived', delivery_fee_cents = 0, delivery_fee_quoted_cents = ?, total_cents = ? WHERE id = ?`,
    ).bind(waived.quotedDeliveryFeeCents, waived.totalCents, order.id).run();
    await env.DB.prepare(
      `UPDATE order_farms SET delivery_fee_cents = 0 WHERE order_id = ? AND fulfillment = 'delivery'`,
    ).bind(order.id).run();
    await env.DB.prepare(
      `INSERT INTO outbox (order_id, kind, body) VALUES (?, 'route_short', ?)`,
    ).bind(order.id, SHORT_RUN_NOTE).run();
  }
}

async function sheetStop(env: Env, order: OrderRow): Promise<SheetStop> {
  const rows = await env.DB.prepare(
    `SELECT oi.quantity, oi.food_name, f.name AS farm_name, f.pickup_address, f.city
     FROM order_items oi
     JOIN order_farms ofm ON ofm.id = oi.order_farm_id
     JOIN farms f ON f.id = ofm.farm_id
     WHERE ofm.order_id = ?
     ORDER BY oi.id`,
  ).bind(order.id).all<{ quantity: number; food_name: string; farm_name: string; pickup_address: string; city: string }>();
  const notes = await orderRouteNotes(env, order.id);
  const pickups = [...new Set(rows.results.map((row) => {
    const where = row.pickup_address || row.city;
    return `${row.farm_name}, ${where}`.trim();
  }))];
  return {
    name: order.customer_name,
    address: order.delivery_address,
    phone: order.customer_phone,
    items: rows.results.map((row) => ({ qty: row.quantity, name: row.food_name })),
    pickups,
    note: notes.join(' '),
  };
}

async function loadRoutes(env: Env): Promise<AreaRoute[]> {
  const rows = await env.DB.prepare(`SELECT * FROM delivery_routes ORDER BY is_sample DESC, name`).all<RouteRow>();
  return rows.results.map((row) => ({
    id: row.id,
    name: row.name,
    area: parseAreaJson(row.area_json),
    deliveryDay: row.delivery_day,
    cutoffDay: row.cutoff_day,
    cutoffTime: row.cutoff_time,
    minOrders: row.min_orders,
    targetOrders: row.target_orders,
    active: !!row.active,
  }));
}

function parseAreaJson(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function denverToday(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts;
}
