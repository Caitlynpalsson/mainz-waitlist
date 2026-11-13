// End-to-end check against a running worker.
// Covers approval gating (pending farms stay hidden) and a multi-farm test order.
//
//   ADMIN_TOKEN=local-dev-token API_URL=http://127.0.0.1:8787 node scripts/smoke.mjs

const base = (process.env.API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const admin = process.env.ADMIN_TOKEN || 'local-dev-token';

async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const stamp = Date.now().toString(36);
const farmName = `Smoke Orchard ${stamp}`;

const health = await api('/api/health');
assert(health.status === 200 && health.data.ok, 'health failed');

const locked = await api('/api/admin/farms');
assert(locked.status === 401, `admin without a token should be 401, got ${locked.status}`);

const applied = await api('/api/applications', {
  method: 'POST',
  body: JSON.stringify({
    farmName,
    contactName: 'smoke tester',
    email: `smoke-${stamp}@example.com`,
    city: 'Provo',
    whatYouSell: 'apples',
    fulfillment: 'pickup',
    sellNow: ['just starting'],
  }),
});
assert(applied.status === 201 && applied.data.status === 'pending', `apply failed ${applied.status} ${JSON.stringify(applied.data)}`);

const hidden = await api(`/api/browse?q=${encodeURIComponent(farmName)}`);
assert(hidden.status === 200, 'browse failed');
assert(!hidden.data.farms.some((farm) => farm.name === farmName), 'pending farm showed up in browse');

const adminList = await api('/api/admin/farms', { headers: { authorization: `Bearer ${admin}` } });
assert(adminList.status === 200, `admin list failed ${adminList.status} ${JSON.stringify(adminList.data)}`);
const pending = adminList.data.farms.find((farm) => farm.name === farmName);
assert(pending, 'application missing from the admin list');

const approved = await api(`/api/admin/farms/${pending.id}/approve`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}` },
});
assert(approved.status === 200 && approved.data.accessToken, 'approve failed');

const visible = await api(`/api/browse?q=${encodeURIComponent(farmName)}`);
assert(visible.data.farms.some((farm) => farm.slug === pending.slug), 'approved farm did not appear');

const off = await api(`/api/admin/farms/${pending.id}/active`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}` },
  body: JSON.stringify({ active: false }),
});
assert(off.status === 200 && off.data.active === false, 'could not switch the farm off');
const hiddenAgain = await api(`/api/browse?q=${encodeURIComponent(farmName)}`);
assert(!hiddenAgain.data.farms.some((farm) => farm.slug === pending.slug), 'switched-off farm still listed');

const on = await api(`/api/admin/farms/${pending.id}/active`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}` },
  body: JSON.stringify({ active: true }),
});
assert(on.data.active === true, 'could not switch the farm back on');

const direct = await api(`/api/farms/${pending.slug}`);
assert(direct.status === 200, 'approved farm page missing');

const willow = await api('/api/farms/willow-creek-farm');
const bees = await api('/api/farms/bee-loud-honey-co');
assert(willow.status === 200 && bees.status === 200, 'demo farms missing');
const strawberries = willow.data.products.find((product) => product.name === 'strawberries');
const eggs = willow.data.products.find((product) => product.name === 'eggs');
const honey = bees.data.products.find((product) => product.name === 'raw honey');
const detail = await api(`/api/products/${strawberries.id}`);
const pint = detail.data.product.options.find((option) => option.name === 'pint');
assert(pint, 'strawberry pint option missing');

const order = await api('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    customer: { name: 'Smoke Shopper', email: 'shopper@example.com' },
    address: { line1: '1420 e canyon rd', cityZip: 'spanish fork, ut 84660' },
    items: [
      { productId: strawberries.id, optionId: pint.id, qty: 2 },
      { productId: eggs.id, optionId: null, qty: 1 },
      { productId: honey.id, optionId: null, qty: 1 },
    ],
    groups: [
      { farmId: willow.data.farm.id, fulfillment: 'delivery', windowLabel: 'wed · 9–11 am' },
      { farmId: bees.data.farm.id, fulfillment: 'pickup', windowLabel: 'fri · 10 am–4 pm' },
    ],
  }),
});
assert(order.status === 201, `order failed ${order.status} ${JSON.stringify(order.data)}`);
assert(order.data.order.groups.length === 2, 'order was not grouped into two farm sub-orders');
assert(order.data.order.merchandiseCents === 3300, `merchandise ${order.data.order.merchandiseCents}`);
assert(order.data.order.deliveryFeeCents === 500, `delivery fee ${order.data.order.deliveryFeeCents}`);
assert(order.data.order.platformFeeCents === 165, `platform fee ${order.data.order.platformFeeCents}`);
assert(order.data.order.totalCents === 3965, `total ${order.data.order.totalCents}`);
assert(order.data.order.paymentStatus === 'unpaid_test', 'payment should stay unpaid');
const saved = await api(`/api/orders/${order.data.order.publicId}`);
assert(saved.status === 200 && saved.data.order.groups.length === 2, 'saved order could not be read back');

const wasatch = await api('/api/farms/wasatch-dairy');
assert(wasatch.status === 404, 'pending demo dairy should stay off the shop');

console.log('smoke ok');
console.log(`order ${order.data.order.publicId} total $${(order.data.order.totalCents / 100).toFixed(2)}`);
