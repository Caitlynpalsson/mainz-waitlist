import { handleAdmin } from './admin';
import { NEAR_MILES, haversineMiles, roundMiles, type LatLng } from './geo';
import { HttpError, json } from './http';
import { groupLines, isShopVisible, priceGroups, type Fulfillment, type IncomingItem, type Rates } from './orderMath';
import { PHOTO_RULES, assessPhoto, decodeJpegDataUrl, jpegSize } from './photoQuality';

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
  PLATFORM_FEE_BPS?: string;
  DELIVERY_FEE_CENTS?: string;
}

const PLACE = 'spanish fork, ut';
const CATEGORIES = new Set(['produce', 'eggs', 'honey', 'dairy', 'meat']);
const PHOTO_ROLES = new Set(['hero', 'hands', 'farm', 'packaging']);

type FarmRow = {
  id: number;
  slug: string;
  name: string;
  farmer_names: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  since_year: number | null;
  stat_value: string;
  stat_label: string;
  bio: string;
  about: string;
  miles_away: number | null;
  lat: number | null;
  lng: number | null;
  hero_photo: string;
  card_foods: string;
  offers_pickup: number;
  offers_delivery: number;
  pickup_summary: string;
  delivery_summary: string;
  pickup_days: string;
  delivery_days: string;
  pickup_address: string;
  pickup_spot: string;
  windows_json: string;
  status: string;
  active: number;
  is_demo: number;
  access_token: string | null;
  what_you_sell: string;
  sell_now: string;
  fulfillment_pref: string;
  link: string;
  stripe_account_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type ProductJoin = {
  id: number;
  farm_id: number;
  price_cents: number;
  unit: string;
  stock_qty: number;
  product_active: number;
  note: string;
  dek: string;
  headline: string;
  food_name: string;
  photo_key: string;
  photo: string | null;
  farm_name: string;
  farm_slug: string;
  city: string;
  status: string;
  farm_active: number;
  offers_pickup: number;
  offers_delivery: number;
  pickup_summary: string;
  delivery_summary: string;
  windows_json: string;
  stripe_account_id: string | null;
  category?: string;
  in_season?: number;
  farm_city?: string;
};

const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-farm-token',
  'access-control-max-age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    try {
      return withCors(await route(request, env));
    } catch (error) {
      if (error instanceof HttpError) return withCors(json({ error: error.message }, error.status));
      console.error(error);
      return withCors(json({ error: 'something went wrong.' }, 500));
    }
  },
};

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method === 'GET' && path === '/api/health') return json({ ok: true });
  if (method === 'GET' && path === '/api/browse') return browse(env, url);
  if (method === 'GET' && path === '/api/farms') return listFarms(env, url);
  if (method === 'GET' && path === '/api/catalog') return catalog(env, url);

  const farmPage = path.match(/^\/api\/farms\/([a-z0-9-]+)$/);
  if (method === 'GET' && farmPage) return farmDetail(env, farmPage[1], url);

  const productPage = path.match(/^\/api\/products\/(\d+)$/);
  if (method === 'GET' && productPage) return productDetail(env, Number(productPage[1]));

  const orderPage = path.match(/^\/api\/orders\/([a-z0-9_]+)$/);
  if (method === 'GET' && orderPage) return orderDetail(env, orderPage[1]);

  if (method === 'POST' && path === '/api/quote') return quote(env, await readJson(request));
  if (method === 'POST' && path === '/api/orders') return placeOrder(env, await readJson(request));
  if (method === 'POST' && path === '/api/applications') return apply(env, await readJson(request));

  if (path.startsWith('/api/admin/')) return handleAdmin(request, env, method, path);
  if (path.startsWith('/api/farm/')) return farmDesk(request, env, method, path);

  throw new HttpError('not found.', 404);
}

async function browse(env: Env, url: URL): Promise<Response> {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 80);
  const category = (url.searchParams.get('category') || 'all').toLowerCase();
  const fulfillment = (url.searchParams.get('fulfillment') || '').toLowerCase();
  const pickupToday = url.searchParams.get('pickup') === 'today';
  const season = url.searchParams.get('season') === 'all' ? 'all' : 'week';
  const cat = CATEGORIES.has(category) ? category : 'all';
  const day = utahWeekday();

  const farmWhere = ['f.status = \'approved\'', 'f.active = 1'];
  const farmBinds: unknown[] = [];
  if (fulfillment === 'pickup' || pickupToday) farmWhere.push('f.offers_pickup = 1');
  if (fulfillment === 'delivery') farmWhere.push('f.offers_delivery = 1');
  if (pickupToday) {
    farmWhere.push(`(',' || f.pickup_days || ',') LIKE ? ESCAPE '\\'`);
    farmBinds.push(`%,${day},%`);
  }
  if (cat !== 'all') {
    farmWhere.push(`f.id IN (
      SELECT p.farm_id FROM products p JOIN catalog_foods c ON c.id = p.food_id
      WHERE p.active = 1 AND c.category = ?
    )`);
    farmBinds.push(cat);
  }
  if (q) {
    const like = likeTerm(q);
    farmWhere.push(`(
      lower(f.name) LIKE ? ESCAPE '\\' OR lower(f.farmer_names) LIKE ? ESCAPE '\\'
      OR lower(f.city) LIKE ? ESCAPE '\\' OR lower(f.card_foods) LIKE ? ESCAPE '\\'
      OR lower(f.bio) LIKE ? ESCAPE '\\'
      OR f.id IN (
        SELECT p.farm_id FROM products p
        JOIN catalog_foods c ON c.id = p.food_id
        LEFT JOIN product_options o ON o.product_id = p.id
        WHERE p.active = 1 AND (
          lower(c.name) LIKE ? ESCAPE '\\' OR lower(c.synonyms) LIKE ? ESCAPE '\\'
          OR lower(p.headline) LIKE ? ESCAPE '\\' OR lower(o.name) LIKE ? ESCAPE '\\'
        )
      )
    )`);
    for (let i = 0; i < 9; i += 1) farmBinds.push(like);
  }

  const origin = readOrigin(url);
  const farms = await env.DB.prepare(
    `SELECT f.* FROM farms f WHERE ${farmWhere.join(' AND ')}`,
  ).bind(...farmBinds).all<FarmRow>();
  const farmCards = sortByDistance(farms.results.map((row) => farmCard(row, origin)));
  const nearIds = new Set(
    farmCards.filter((farm) => farm.milesAway != null && farm.milesAway <= NEAR_MILES).map((farm) => farm.id),
  );

  const productWhere = [`f.status = 'approved'`, `f.active = 1`, `p.active = 1`];
  const productBinds: unknown[] = [];
  if (season === 'week' && !q) productWhere.push('p.in_season = 1');
  if (cat !== 'all') {
    productWhere.push('c.category = ?');
    productBinds.push(cat);
  }
  if (fulfillment === 'pickup' || pickupToday) productWhere.push('f.offers_pickup = 1');
  if (fulfillment === 'delivery') productWhere.push('f.offers_delivery = 1');
  if (pickupToday) {
    productWhere.push(`(',' || f.pickup_days || ',') LIKE ? ESCAPE '\\'`);
    productBinds.push(`%,${day},%`);
  }
  if (q) {
    const like = likeTerm(q);
    productWhere.push(`(
      lower(c.name) LIKE ? ESCAPE '\\' OR lower(c.synonyms) LIKE ? ESCAPE '\\'
      OR lower(p.headline) LIKE ? ESCAPE '\\' OR lower(p.note) LIKE ? ESCAPE '\\'
      OR lower(f.name) LIKE ? ESCAPE '\\' OR lower(f.farmer_names) LIKE ? ESCAPE '\\'
      OR lower(f.city) LIKE ? ESCAPE '\\'
      OR EXISTS (SELECT 1 FROM product_options o WHERE o.product_id = p.id AND lower(o.name) LIKE ? ESCAPE '\\')
    )`);
    for (let i = 0; i < 8; i += 1) productBinds.push(like);
  }

  const products = await env.DB.prepare(
    `SELECT ${PRODUCT_CARD}
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN catalog_foods c ON c.id = p.food_id
     WHERE ${productWhere.join(' AND ')}
     ORDER BY p.sort_order, p.id
     LIMIT 60`,
  ).bind(...productBinds).all<ProductJoin>();

  const visibleProducts = origin && !q
    ? products.results.filter((row) => nearIds.has(row.farm_id))
    : products.results;

  return json({
    place: PLACE,
    nearMiles: NEAR_MILES,
    farmCount: origin ? nearIds.size : farmCards.length,
    weekday: day,
    products: visibleProducts.map(productCard),
    farms: origin && !q ? farmCards.filter((farm) => nearIds.has(farm.id)) : farmCards,
  });
}

async function listFarms(env: Env, url: URL): Promise<Response> {
  const fulfillment = (url.searchParams.get('fulfillment') || '').toLowerCase();
  const where = [`status = 'approved'`, `active = 1`];
  if (fulfillment === 'pickup') where.push('offers_pickup = 1');
  if (fulfillment === 'delivery') where.push('offers_delivery = 1');
  const origin = readOrigin(url);
  const farms = await env.DB.prepare(
    `SELECT * FROM farms WHERE ${where.join(' AND ')}`,
  ).all<FarmRow>();
  return json({
    place: PLACE,
    nearMiles: NEAR_MILES,
    farms: sortByDistance(farms.results.map((row) => farmCard(row, origin))),
  });
}

async function farmDetail(env: Env, slug: string, url: URL): Promise<Response> {
  const farm = await env.DB.prepare(
    `SELECT * FROM farms WHERE slug = ? AND status = 'approved' AND active = 1`,
  ).bind(slug).first<FarmRow>();
  if (!farm) throw new HttpError('that farm is not on mainz.', 404);
  const origin = readOrigin(url);
  const products = await env.DB.prepare(
    `SELECT ${PRODUCT_CARD}
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN catalog_foods c ON c.id = p.food_id
     WHERE p.farm_id = ? AND p.active = 1
     ORDER BY p.shop_order, p.id`,
  ).bind(farm.id).all<ProductJoin>();
  return json({
    farm: farmDetailCard(farm, products.results.length, origin),
    products: products.results.map(productCard),
  });
}

async function productDetail(env: Env, id: number): Promise<Response> {
  const product = await env.DB.prepare(
    `SELECT p.*, c.name AS food_name, c.category, c.photo_key, c.slug AS food_slug,
            f.id AS farm_id, f.slug AS farm_slug, f.name AS farm_name, f.city AS farm_city,
            f.offers_pickup, f.offers_delivery, f.pickup_summary, f.delivery_summary, f.windows_json,
            f.status, f.active AS farm_active
     FROM products p
     JOIN catalog_foods c ON c.id = p.food_id
     JOIN farms f ON f.id = p.farm_id
     WHERE p.id = ? AND p.active = 1`,
  ).bind(id).first<Record<string, unknown>>();
  if (!product || !isShopVisible(String(product.status), Number(product.farm_active))) {
    throw new HttpError('that food is not for sale.', 404);
  }
  const photos = await env.DB.prepare(
    `SELECT role, photo_key, is_stock, sort_order FROM product_photos WHERE product_id = ? ORDER BY sort_order, id`,
  ).bind(id).all<{ role: string; photo_key: string; is_stock: number }>();
  const options = await env.DB.prepare(
    `SELECT id, kind, name, price_cents, unit FROM product_options WHERE product_id = ? ORDER BY sort_order, id`,
  ).bind(id).all<{ id: number; kind: string; name: string; price_cents: number; unit: string }>();
  const more = await env.DB.prepare(
    `SELECT ${PRODUCT_CARD}
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN catalog_foods c ON c.id = p.food_id
     WHERE p.farm_id = ? AND p.id != ? AND p.active = 1
     ORDER BY p.shop_order, p.id
     LIMIT 8`,
  ).bind(product.farm_id, id).all<ProductJoin>();

  const windows = parseWindows(String(product.windows_json || ''));
  return json({
    product: {
      id: product.id,
      name: product.food_name,
      headline: product.headline,
      note: product.note,
      dek: product.dek,
      priceCents: product.price_cents,
      unit: product.unit,
      priceSetter: product.price_setter,
      grownNote: product.grown_note,
      pickedLabel: product.picked_label,
      stockQty: product.stock_qty,
      category: product.category,
      photos: photos.results.length
        ? photos.results.map((photo) => ({ role: photo.role, photo: photo.photo_key, isStock: !!photo.is_stock }))
        : [{ role: 'hero', photo: product.photo_key, isStock: true }],
      options: options.results.map((option) => ({
        id: option.id,
        kind: option.kind,
        name: option.name,
        priceCents: option.price_cents,
        unit: option.unit,
      })),
      farm: {
        id: product.farm_id,
        slug: product.farm_slug,
        name: product.farm_name,
        city: product.farm_city,
        offersPickup: !!product.offers_pickup,
        offersDelivery: !!product.offers_delivery,
        pickupSummary: product.pickup_summary,
        deliverySummary: product.delivery_summary,
        windows,
      },
    },
    more: more.results.map(productCard),
  });
}

async function catalog(env: Env, url: URL): Promise<Response> {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 80);
  const binds: unknown[] = [];
  let where = '';
  if (q) {
    const like = likeTerm(q);
    where = `WHERE lower(c.name) LIKE ? ESCAPE '\\' OR lower(c.synonyms) LIKE ? ESCAPE '\\'
      OR c.id IN (SELECT food_id FROM catalog_varieties WHERE lower(name) LIKE ? ESCAPE '\\')`;
    binds.push(like, like, like);
  }
  const foods = await env.DB.prepare(
    `SELECT c.* FROM catalog_foods c ${where} ORDER BY c.needs_licensed_photo, c.name LIMIT 80`,
  ).bind(...binds).all<{
    id: number;
    slug: string;
    name: string;
    category: string;
    unit: string;
    photo_key: string;
    needs_licensed_photo: number;
  }>();
  const ids = foods.results.map((food) => food.id);
  let varieties: { food_id: number; name: string }[] = [];
  if (ids.length) {
    const got = await env.DB.prepare(
      `SELECT food_id, name FROM catalog_varieties WHERE food_id IN (${placeholders(ids.length)}) ORDER BY sort_order`,
    ).bind(...ids).all<{ food_id: number; name: string }>();
    varieties = got.results;
  }
  return json({
    foods: foods.results.map((food) => ({
      id: food.id,
      slug: food.slug,
      name: food.name,
      category: food.category,
      unit: food.unit,
      photo: food.photo_key,
      needsLicensedPhoto: !!food.needs_licensed_photo,
      varieties: varieties.filter((variety) => variety.food_id === food.id).map((variety) => variety.name),
    })),
  });
}

type CartBody = {
  items?: { productId?: number; optionId?: number | null; qty?: number }[];
  groups?: { farmId?: number; fulfillment?: string; windowLabel?: string }[];
  customer?: { name?: string; email?: string; phone?: string };
  address?: { line1?: string; cityZip?: string };
};

async function quote(env: Env, body: CartBody): Promise<Response> {
  const resolved = await resolveCart(env, body);
  return json(presentQuote(resolved));
}

async function placeOrder(env: Env, body: CartBody): Promise<Response> {
  const resolved = await resolveCart(env, body);
  const name = (body.customer?.name || '').trim();
  const email = (body.customer?.email || '').trim();
  const phone = (body.customer?.phone || '').trim().slice(0, 40);
  if (name.length < 2) throw new HttpError('add your name so the farm knows it is you.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('add an email the farm can use.');
  const needsAddress = resolved.priced.groups.some((group) => group.fulfillment === 'delivery');
  const line1 = (body.address?.line1 || '').trim();
  const cityZip = (body.address?.cityZip || '').trim();
  if (needsAddress && (line1.length < 4 || cityZip.length < 4)) throw new HttpError('add a delivery address.');
  const deliveryAddress = needsAddress ? `${line1}, ${cityZip}`.slice(0, 200) : '';
  const publicId = makePublicId();
  const priced = resolved.priced;
  const inserted = await env.DB.prepare(
    `INSERT INTO orders (
      public_id, status, payment_status, customer_name, customer_email, customer_phone, delivery_address,
      merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency
    ) VALUES (?, 'placed_test', 'unpaid_test', ?, ?, ?, ?, ?, ?, ?, ?, 'usd')`,
  ).bind(
    publicId, name.slice(0, 80), email.slice(0, 120), phone, deliveryAddress,
    priced.merchandiseCents, priced.deliveryFeeCents, priced.platformFeeCents, priced.totalCents,
  ).run();
  const orderId = inserted.meta.last_row_id;
  for (const group of priced.groups) {
    const farm = resolved.farms.get(group.farmId);
    const sub = await env.DB.prepare(
      `INSERT INTO order_farms (
        order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents,
        platform_fee_cents, farm_transfer_cents, stripe_account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      orderId, group.farmId, group.fulfillment, group.windowLabel,
      group.merchandiseCents, group.deliveryFeeCents, group.platformFeeCents, group.farmTransferCents,
      farm?.stripe_account_id || null,
    ).run();
    for (const line of group.lines) {
      await env.DB.prepare(
        `INSERT INTO order_items (
          order_farm_id, product_id, option_id, food_name, option_label, unit, quantity, unit_price_cents, line_cents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        sub.meta.last_row_id, line.productId, line.optionId, line.name, line.optionLabel, line.unit,
        line.qty, line.unitPriceCents, line.lineCents,
      ).run();
    }
  }
  return json({
    order: {
      publicId,
      status: 'placed_test',
      paymentStatus: 'unpaid_test',
      ...presentQuote(resolved),
      customerName: name,
      deliveryAddress,
    },
  }, 201);
}

async function orderDetail(env: Env, publicId: string): Promise<Response> {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE public_id = ?`).bind(publicId).first<Record<string, unknown>>();
  if (!order) throw new HttpError('no order with that id.', 404);
  const groups = await env.DB.prepare(
    `SELECT ofm.*, f.name AS farm_name, f.slug AS farm_slug, f.city AS farm_city
     FROM order_farms ofm JOIN farms f ON f.id = ofm.farm_id
     WHERE ofm.order_id = ? ORDER BY ofm.id`,
  ).bind(order.id).all<Record<string, unknown>>();
  const presented = [];
  for (const group of groups.results) {
    const items = await env.DB.prepare(
      `SELECT * FROM order_items WHERE order_farm_id = ? ORDER BY id`,
    ).bind(group.id).all<Record<string, unknown>>();
    presented.push({
      farmId: group.farm_id,
      farmName: group.farm_name,
      farmSlug: group.farm_slug,
      farmCity: group.farm_city,
      fulfillment: group.fulfillment,
      windowLabel: group.window_label,
      merchandiseCents: group.merchandise_cents,
      deliveryFeeCents: group.delivery_fee_cents,
      platformFeeCents: group.platform_fee_cents,
      farmTransferCents: group.farm_transfer_cents,
      lines: items.results.map((item) => ({
        name: item.food_name,
        optionLabel: item.option_label,
        unit: item.unit,
        qty: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineCents: item.line_cents,
      })),
    });
  }
  return json({
    order: {
      publicId: order.public_id,
      status: order.status,
      paymentStatus: order.payment_status,
      customerName: order.customer_name,
      deliveryAddress: order.delivery_address,
      merchandiseCents: order.merchandise_cents,
      deliveryFeeCents: order.delivery_fee_cents,
      platformFeeCents: order.platform_fee_cents,
      totalCents: order.total_cents,
      currency: order.currency,
      createdAt: order.created_at,
      groups: presented,
    },
  });
}

async function apply(env: Env, body: Record<string, unknown>): Promise<Response> {
  if (typeof body.company === 'string' && body.company.trim()) return json({ ok: true, status: 'pending' });
  const name = clean(body.farmName, 80);
  const contact = clean(body.contactName, 80);
  const email = clean(body.email, 120);
  const city = clean(body.city, 60);
  const what = clean(body.whatYouSell, 400);
  if (!name || !contact || !city || !what) throw new HttpError('farm name, your name, city, and what you sell are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('add a real email.');
  const fulfillment = ['pickup', 'delivery', 'both', 'not sure yet'].includes(String(body.fulfillment))
    ? String(body.fulfillment)
    : 'not sure yet';
  const sellNow = Array.isArray(body.sellNow) ? body.sellNow.map((item) => clean(item, 40)).filter(Boolean).join(', ').slice(0, 200) : '';
  const offersPickup = fulfillment === 'pickup' || fulfillment === 'both' ? 1 : 0;
  const offersDelivery = fulfillment === 'delivery' || fulfillment === 'both' ? 1 : 0;
  const farmSlug = await uniqueSlug(env, name);
  await env.DB.prepare(
    `INSERT INTO farms (
      slug, name, farmer_names, email, phone, city, state, what_you_sell, sell_now, fulfillment_pref, link,
      offers_pickup, offers_delivery, bio, status, active, is_demo, card_foods
    ) VALUES (?, ?, ?, ?, ?, ?, 'UT', ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, ?)`,
  ).bind(
    farmSlug, name, contact, email, clean(body.phone, 40), city, what, sellNow, fulfillment, clean(body.link, 200),
    offersPickup, offersDelivery, `${contact}. ${what}`.slice(0, 240), what,
  ).run();
  return json({ ok: true, status: 'pending', slug: farmSlug }, 201);
}

async function farmDesk(request: Request, env: Env, method: string, path: string): Promise<Response> {
  const farm = await requireFarm(request, env);
  if (method === 'GET' && path === '/api/farm/me') {
    const products = await farmProducts(env, farm.id);
    return json({ farm: privateFarm(farm), products });
  }
  if (method === 'PATCH' && path === '/api/farm/me') {
    const body = await readJson<Record<string, unknown>>(request);
    const offersPickup = body.offersPickup === undefined ? farm.offers_pickup : (body.offersPickup ? 1 : 0);
    const offersDelivery = body.offersDelivery === undefined ? farm.offers_delivery : (body.offersDelivery ? 1 : 0);
    if (!offersPickup && !offersDelivery) throw new HttpError('choose pickup, delivery, or both.');
    await env.DB.prepare(
      `UPDATE farms SET offers_pickup = ?, offers_delivery = ?, pickup_summary = ?, delivery_summary = ?, bio = ?, pickup_spot = ?, pickup_address = ? WHERE id = ?`,
    ).bind(
      offersPickup,
      offersDelivery,
      body.pickupSummary === undefined ? farm.pickup_summary : clean(body.pickupSummary, 40),
      body.deliverySummary === undefined ? farm.delivery_summary : clean(body.deliverySummary, 40),
      body.bio === undefined ? farm.bio : clean(body.bio, 400),
      body.pickupSpot === undefined ? farm.pickup_spot : clean(body.pickupSpot, 400),
      body.pickupAddress === undefined ? farm.pickup_address : clean(body.pickupAddress, 160),
      farm.id,
    ).run();
    const next = await mustFarm(env, farm.id);
    return json({ farm: privateFarm(next) });
  }
  if (method === 'POST' && path === '/api/farm/products') return addProduct(env, farm, await readJson(request));
  const edit = path.match(/^\/api\/farm\/products\/(\d+)$/);
  if (method === 'PATCH' && edit) return editProduct(env, farm, Number(edit[1]), await readJson(request));
  const photo = path.match(/^\/api\/farm\/products\/(\d+)\/photo$/);
  if (method === 'POST' && photo) return uploadPhoto(env, farm, Number(photo[1]), await readJson(request, PHOTO_RULES.maxStoredChars + 20_000));
  throw new HttpError('not found.', 404);
}

async function addProduct(env: Env, farm: FarmRow, body: Record<string, unknown>): Promise<Response> {
  const foodId = Number(body.foodId);
  const food = await env.DB.prepare(`SELECT * FROM catalog_foods WHERE id = ?`).bind(foodId).first<{
    id: number; name: string; unit: string; photo_key: string;
  }>();
  if (!food) throw new HttpError('pick a food from the mainz catalog.');
  const existing = await env.DB.prepare(
    `SELECT id FROM products WHERE farm_id = ? AND food_id = ?`,
  ).bind(farm.id, food.id).first();
  if (existing) throw new HttpError('you already sell that. edit the price below.', 409);
  const price = money(body.priceCents);
  const unit = clean(body.unit, 24) || food.unit;
  const headline = clean(body.headline, 80) || food.name;
  const note = clean(body.note, 80);
  const dek = clean(body.dek, 140) || note;
  const stock = clampInt(body.stockQty, 0, 9999, 0);
  const inserted = await env.DB.prepare(
    `INSERT INTO products (
      farm_id, food_id, headline, note, dek, price_cents, unit, price_setter, grown_note, picked_label, stock_qty, in_season, sort_order, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 80, 1)`,
  ).bind(
    farm.id, food.id, headline, note, dek, price, unit,
    farm.farmer_names.split(' ')[0] || 'the farm',
    clean(body.grownNote, 80), clean(body.pickedLabel, 40) || 'this week', stock,
  ).run();
  const productId = inserted.meta.last_row_id;
  const varietyNames = Array.isArray(body.varietyNames) ? body.varietyNames.map((name) => clean(name, 40)).filter(Boolean).slice(0, 6) : [];
  let sort = 0;
  for (const name of varietyNames) {
    await env.DB.prepare(
      `INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (?, 'variety', ?, ?, ?, ?)`,
    ).bind(productId, name, price, unit, sort).run();
    sort += 1;
  }
  if (Array.isArray(body.packs)) {
    for (const pack of body.packs.slice(0, 5) as Record<string, unknown>[]) {
      const packName = clean(pack.name, 40);
      if (!packName) continue;
      await env.DB.prepare(
        `INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (?, 'pack', ?, ?, ?, ?)`,
      ).bind(productId, packName, money(pack.priceCents), clean(pack.unit, 24) || packName, sort).run();
      sort += 1;
    }
  }
  const shots: [string, string][] = [
    ['hero', food.photo_key],
    ['hands', food.photo_key],
    ['farm', 'placeholder'],
    ['packaging', 'placeholder'],
  ];
  for (let i = 0; i < shots.length; i += 1) {
    await env.DB.prepare(
      `INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (?, ?, ?, ?, 1)`,
    ).bind(productId, i, shots[i][0], shots[i][1]).run();
  }
  return json({ product: await oneProduct(env, farm.id, Number(productId)) }, 201);
}

async function editProduct(env: Env, farm: FarmRow, productId: number, body: Record<string, unknown>): Promise<Response> {
  const product = await env.DB.prepare(`SELECT * FROM products WHERE id = ? AND farm_id = ?`).bind(productId, farm.id).first<Record<string, unknown>>();
  if (!product) throw new HttpError('that product is not yours.', 404);
  const price = body.priceCents === undefined ? product.price_cents : money(body.priceCents);
  const stock = body.stockQty === undefined ? product.stock_qty : clampInt(body.stockQty, 0, 9999, 0);
  const active = body.active === undefined ? product.active : (body.active ? 1 : 0);
  await env.DB.prepare(
    `UPDATE products SET price_cents = ?, stock_qty = ?, active = ?, headline = ?, note = ?, dek = ?, unit = ?, grown_note = ? WHERE id = ?`,
  ).bind(
    price, stock, active,
    body.headline === undefined ? product.headline : clean(body.headline, 80),
    body.note === undefined ? product.note : clean(body.note, 80),
    body.dek === undefined ? product.dek : clean(body.dek, 140),
    body.unit === undefined ? product.unit : clean(body.unit, 24),
    body.grownNote === undefined ? product.grown_note : clean(body.grownNote, 80),
    productId,
  ).run();
  if (body.priceCents !== undefined) {
    await env.DB.prepare(`UPDATE product_options SET price_cents = ? WHERE product_id = ? AND kind = 'variety'`).bind(price, productId).run();
  }
  return json({ product: await oneProduct(env, farm.id, productId) });
}

async function uploadPhoto(env: Env, farm: FarmRow, productId: number, body: Record<string, unknown>): Promise<Response> {
  const product = await env.DB.prepare(`SELECT id FROM products WHERE id = ? AND farm_id = ?`).bind(productId, farm.id).first();
  if (!product) throw new HttpError('that product is not yours.', 404);
  const role = PHOTO_ROLES.has(String(body.role)) ? String(body.role) : 'hero';
  const dataUrl = String(body.dataUrl || '');
  if (dataUrl.length > PHOTO_RULES.maxStoredChars) {
    return json({ accepted: false, reason: 'that photo is too heavy to store in this preview. stock photo kept.' });
  }
  const check = assessPhoto({
    width: Number(body.width),
    height: Number(body.height),
    byteSize: Number(body.byteSize),
  });
  if (!check.ok) return json({ accepted: false, reason: check.reason });
  let bytes: Uint8Array;
  try {
    bytes = decodeJpegDataUrl(dataUrl);
  } catch {
    return json({ accepted: false, reason: 'photo must be a jpeg. stock photo kept.' });
  }
  const size = jpegSize(bytes);
  if (!size || Math.min(size.width, size.height) < PHOTO_RULES.minEdge) {
    return json({ accepted: false, reason: 'the saved photo is still under 800px on the short side. stock photo kept.' });
  }
  const existing = await env.DB.prepare(
    `SELECT id FROM product_photos WHERE product_id = ? AND role = ?`,
  ).bind(productId, role).first<{ id: number }>();
  if (existing) {
    await env.DB.prepare(`UPDATE product_photos SET photo_key = ?, is_stock = 0 WHERE id = ?`).bind(dataUrl, existing.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (?, 0, ?, ?, 0)`,
    ).bind(productId, role, dataUrl).run();
  }
  return json({ accepted: true, role, product: await oneProduct(env, farm.id, productId) });
}

async function resolveCart(env: Env, body: CartBody) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > 40) throw new HttpError(items.length ? 'that is a lot for one bag.' : 'your bag is empty.');
  const ids = [...new Set(items.map((item) => Number(item.productId)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) throw new HttpError('your bag is empty.');
  const products = await env.DB.prepare(
    `SELECT p.id, p.farm_id, p.price_cents, p.unit, p.stock_qty, p.active AS product_active, p.note, p.dek, p.headline,
            c.name AS food_name, c.photo_key,
            f.name AS farm_name, f.slug AS farm_slug, f.city, f.status, f.active AS farm_active,
            f.offers_pickup, f.offers_delivery, f.pickup_summary, f.delivery_summary, f.windows_json, f.stripe_account_id,
            (SELECT ph.photo_key FROM product_photos ph WHERE ph.product_id = p.id ORDER BY ph.sort_order, ph.id LIMIT 1) AS photo
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN catalog_foods c ON c.id = p.food_id
     WHERE p.id IN (${placeholders(ids.length)})`,
  ).bind(...ids).all<ProductJoin>();
  const byId = new Map(products.results.map((row) => [row.id, row]));
  const optionIds = [...new Set(items.map((item) => Number(item.optionId)).filter((id) => Number.isInteger(id) && id > 0))];
  const optionById = new Map<number, { id: number; product_id: number; name: string; price_cents: number; unit: string }>();
  if (optionIds.length) {
    const options = await env.DB.prepare(
      `SELECT id, product_id, name, price_cents, unit FROM product_options WHERE id IN (${placeholders(optionIds.length)})`,
    ).bind(...optionIds).all<{ id: number; product_id: number; name: string; price_cents: number; unit: string }>();
    for (const option of options.results) optionById.set(option.id, option);
  }
  const counts = await env.DB.prepare(
    `SELECT product_id, COUNT(*) AS n FROM product_options WHERE product_id IN (${placeholders(ids.length)}) GROUP BY product_id`,
  ).bind(...ids).all<{ product_id: number; n: number }>();
  const hasOptions = new Map(counts.results.map((row) => [row.product_id, row.n]));

  const incoming: IncomingItem[] = [];
  for (const item of items) {
    const product = byId.get(Number(item.productId));
    if (!product || !product.product_active || !isShopVisible(product.status, product.farm_active)) {
      throw new HttpError('something in your bag is no longer for sale.');
    }
    const qty = Math.floor(Number(item.qty));
    if (qty < 1 || qty > 99) throw new HttpError('pick a quantity between 1 and 99.');
    let unitPrice = product.price_cents;
    let optionLabel = '';
    let unit = product.unit;
    let optionId: number | null = null;
    if (item.optionId) {
      const option = optionById.get(Number(item.optionId));
      if (!option || option.product_id !== product.id) throw new HttpError('pick a size or variety that this farm sells.');
      unitPrice = option.price_cents;
      optionLabel = option.name;
      unit = option.unit;
      optionId = option.id;
    } else if ((hasOptions.get(product.id) || 0) > 0) {
      throw new HttpError(`pick a size or variety for ${product.food_name}.`);
    }
    incoming.push({
      farmId: product.farm_id,
      productId: product.id,
      optionId,
      qty,
      unitPriceCents: unitPrice,
      name: product.food_name,
      optionLabel,
      unit,
    });
  }

  const grouped = groupLines(incoming);
  for (const lines of grouped) {
    const totals = new Map<number, number>();
    for (const line of lines) totals.set(line.productId, (totals.get(line.productId) || 0) + line.qty);
    for (const [productId, qty] of totals) {
      const product = byId.get(productId)!;
      if (qty > product.stock_qty) throw new HttpError(`only ${product.stock_qty} left of ${product.food_name}.`);
    }
  }

  const requested = new Map((body.groups || []).map((group) => [Number(group.farmId), group]));
  const farms = new Map<number, ProductJoin>();
  const input = grouped.map((lines) => {
    const row = byId.get(lines[0].productId)!;
    farms.set(row.farm_id, row);
    const ask = requested.get(row.farm_id);
    let fulfillment: Fulfillment;
    if (ask?.fulfillment === 'pickup' || ask?.fulfillment === 'delivery') fulfillment = ask.fulfillment;
    else if (row.offers_delivery) fulfillment = 'delivery';
    else if (row.offers_pickup) fulfillment = 'pickup';
    else throw new HttpError(`${row.farm_name} is not selling right now.`);
    if (fulfillment === 'delivery' && !row.offers_delivery) throw new HttpError(`${row.farm_name} does not deliver.`);
    if (fulfillment === 'pickup' && !row.offers_pickup) throw new HttpError(`${row.farm_name} does not offer pickup.`);
    const windows = parseWindows(row.windows_json);
    const choices = fulfillment === 'delivery' ? windows.delivery : windows.pickup;
    const requestedLabel = (ask?.windowLabel || '').trim();
    let windowLabel = choices[0]?.label || '';
    if (requestedLabel) {
      if (choices.length && !choices.some((choice) => choice.label === requestedLabel)) {
        throw new HttpError(`that window is not open at ${row.farm_name}.`);
      }
      windowLabel = requestedLabel.slice(0, 80);
    }
    return { farmId: row.farm_id, fulfillment, windowLabel, lines };
  });
  return { priced: priceGroups(input, readRates(env)), byId, farms };
}

function presentQuote(resolved: Awaited<ReturnType<typeof resolveCart>>) {
  const { priced, byId } = resolved;
  return {
    groups: priced.groups.map((group) => {
      const row = byId.get(group.lines[0].productId)!;
      return {
        farmId: group.farmId,
        farmName: row.farm_name,
        farmSlug: row.farm_slug,
        farmCity: row.city,
        fulfillment: group.fulfillment,
        windowLabel: group.windowLabel,
        offersPickup: !!row.offers_pickup,
        offersDelivery: !!row.offers_delivery,
        pickupSummary: row.pickup_summary,
        deliverySummary: row.delivery_summary,
        windows: parseWindows(row.windows_json),
        merchandiseCents: group.merchandiseCents,
        deliveryFeeCents: group.deliveryFeeCents,
        platformFeeCents: group.platformFeeCents,
        farmTransferCents: group.farmTransferCents,
        lines: group.lines.map((line) => {
          const product = byId.get(line.productId)!;
          return { ...line, photo: product.photo || product.photo_key, note: product.note };
        }),
      };
    }),
    merchandiseCents: priced.merchandiseCents,
    deliveryFeeCents: priced.deliveryFeeCents,
    platformFeeCents: priced.platformFeeCents,
    totalCents: priced.totalCents,
    currency: 'usd',
  };
}

async function farmProducts(env: Env, farmId: number) {
  const products = await env.DB.prepare(
    `SELECT p.*, c.name AS food_name, c.photo_key
     FROM products p JOIN catalog_foods c ON c.id = p.food_id
     WHERE p.farm_id = ? ORDER BY p.shop_order, p.id`,
  ).bind(farmId).all<Record<string, unknown>>();
  const out = [];
  for (const product of products.results) out.push(await shapeOwned(env, product));
  return out;
}

async function oneProduct(env: Env, farmId: number, productId: number) {
  const product = await env.DB.prepare(
    `SELECT p.*, c.name AS food_name, c.photo_key
     FROM products p JOIN catalog_foods c ON c.id = p.food_id
     WHERE p.id = ? AND p.farm_id = ?`,
  ).bind(productId, farmId).first<Record<string, unknown>>();
  if (!product) throw new HttpError('product not found.', 404);
  return shapeOwned(env, product);
}

async function shapeOwned(env: Env, product: Record<string, unknown>) {
  const photos = await env.DB.prepare(
    `SELECT role, photo_key, is_stock FROM product_photos WHERE product_id = ? ORDER BY sort_order, id`,
  ).bind(product.id).all<{ role: string; photo_key: string; is_stock: number }>();
  const options = await env.DB.prepare(
    `SELECT id, kind, name, price_cents, unit FROM product_options WHERE product_id = ? ORDER BY sort_order, id`,
  ).bind(product.id).all<{ id: number; kind: string; name: string; price_cents: number; unit: string }>();
  return {
    id: product.id,
    name: product.food_name,
    headline: product.headline,
    note: product.note,
    dek: product.dek,
    priceCents: product.price_cents,
    unit: product.unit,
    stockQty: product.stock_qty,
    active: !!product.active,
    grownNote: product.grown_note,
    photo: photos.results[0]?.photo_key || product.photo_key,
    photos: photos.results.map((photo) => ({ role: photo.role, photo: photo.photo_key, isStock: !!photo.is_stock })),
    options: options.results,
  };
}

const PRODUCT_CARD = `p.id, p.headline, p.note, p.dek, p.price_cents, p.unit, p.stock_qty, p.in_season,
  c.name AS food_name, c.category, c.photo_key,
  f.id AS farm_id, f.slug AS farm_slug, f.name AS farm_name, f.city AS farm_city,
  (SELECT ph.photo_key FROM product_photos ph WHERE ph.product_id = p.id ORDER BY ph.sort_order, ph.id LIMIT 1) AS photo`;

function productCard(row: ProductJoin) {
  return {
    id: row.id,
    name: row.food_name,
    headline: row.headline,
    note: row.note,
    dek: row.dek,
    priceCents: row.price_cents,
    unit: row.unit,
    stockQty: row.stock_qty,
    inSeason: !!row.in_season,
    category: row.category,
    photo: row.photo || row.photo_key,
    farmId: row.farm_id,
    farmSlug: row.farm_slug,
    farmName: row.farm_name,
    farmCity: row.farm_city,
  };
}

function farmCard(row: FarmRow, origin: LatLng | null) {
  const milesAway = origin && row.lat != null && row.lng != null
    ? roundMiles(haversineMiles(origin, { lat: row.lat, lng: row.lng }))
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    state: row.state,
    milesAway,
    offersPickup: !!row.offers_pickup,
    offersDelivery: !!row.offers_delivery,
    pickupSummary: row.pickup_summary,
    deliverySummary: row.delivery_summary,
    heroPhoto: row.hero_photo,
    cardFoods: row.card_foods,
    isDemo: !!row.is_demo,
    statValue: row.stat_value,
    statLabel: row.stat_label,
    sinceYear: row.since_year,
  };
}

function farmDetailCard(row: FarmRow, productCount: number, origin: LatLng | null = null) {
  return {
    ...farmCard(row, origin),
    farmerNames: row.farmer_names,
    bio: row.bio,
    about: row.about,
    pickupAddress: row.pickup_address,
    pickupSpot: row.pickup_spot,
    windows: parseWindows(row.windows_json),
    productCount,
  };
}

function privateFarm(row: FarmRow) {
  return {
    ...farmDetailCard(row, 0),
    email: row.email,
    status: row.status,
    active: !!row.active,
  };
}

function parseWindows(raw: string): { pickup: { day: string; label: string }[]; delivery: { day: string; label: string }[] } {
  try {
    const value = JSON.parse(raw) as { pickup?: { day: string; label: string }[]; delivery?: { day: string; label: string }[] };
    return {
      pickup: Array.isArray(value.pickup) ? value.pickup : [],
      delivery: Array.isArray(value.delivery) ? value.delivery : [],
    };
  } catch {
    return { pickup: [], delivery: [] };
  }
}

function readOrigin(url: URL): LatLng | null {
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function sortByDistance<T extends { milesAway: number | null; name: string }>(farms: T[]): T[] {
  return farms.sort((a, b) => {
    if (a.milesAway == null && b.milesAway == null) return a.name.localeCompare(b.name);
    if (a.milesAway == null) return 1;
    if (b.milesAway == null) return -1;
    return a.milesAway - b.milesAway || a.name.localeCompare(b.name);
  });
}

function readRates(env: Env): Rates {
  const bps = Number(env.PLATFORM_FEE_BPS || 500);
  const delivery = Number(env.DELIVERY_FEE_CENTS || 500);
  return {
    platformFeeBps: Number.isFinite(bps) ? bps : 500,
    deliveryFeeCents: Number.isFinite(delivery) ? delivery : 500,
  };
}

async function requireFarm(request: Request, env: Env): Promise<FarmRow> {
  const token = (request.headers.get('x-farm-token') || '').trim();
  if (!token) throw new HttpError('add the farm token.', 401);
  const farm = await env.DB.prepare(`SELECT * FROM farms WHERE access_token = ?`).bind(token).first<FarmRow>();
  if (!farm) throw new HttpError('that farm token does not match.', 401);
  return farm;
}

async function mustFarm(env: Env, id: number): Promise<FarmRow> {
  const farm = await env.DB.prepare(`SELECT * FROM farms WHERE id = ?`).bind(id).first<FarmRow>();
  if (!farm) throw new HttpError('no farm with that id.', 404);
  return farm;
}

async function uniqueSlug(env: Env, name: string): Promise<string> {
  const base = slugify(name) || 'farm';
  let candidate = base;
  let n = 2;
  while (await env.DB.prepare(`SELECT id FROM farms WHERE slug = ?`).bind(candidate).first()) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function utahWeekday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short' }).format(now).toLowerCase();
}

function likeTerm(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function placeholders(count: number): string {
  return new Array(count).fill('?').join(',');
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function money(value: unknown): number {
  const cents = Math.round(Number(value));
  if (!Number.isFinite(cents) || cents < 50 || cents > 500_000) throw new HttpError('use a price between $0.50 and $5,000.');
  return cents;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function makePublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `mz_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function readJson<T>(request: Request, max = 20_000): Promise<T> {
  const text = await request.text();
  if (text.length > max) throw new HttpError('that is too large.');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('that was not valid.');
  }
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}
