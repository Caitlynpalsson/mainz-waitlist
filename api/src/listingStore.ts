import { HttpError, json } from './http';
import {
  approveListing,
  cleanFarmProduct,
  cleanListingProduct,
  denyListing,
  listingAppearsInBrowse,
  listingShowsForm,
  listingStatusLabel,
  newListingToken,
  parsePriceStatus,
  parseUdafFlag,
  previewFarmCsv,
  requestListingChanges,
  resendDeniedListing,
  type CatalogMatch,
  type ListingProductInput,
} from './listing';

type Env = { DB: D1Database };

type DraftRow = {
  id: number;
  token: string;
  farm_name: string;
  story: string;
  location: string;
  status: string;
  change_note: string;
  approved_at: string;
  denied_at: string;
  deny_reason: string;
  is_sample: number;
  farmer_names: string;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: number;
  name: string;
  price_cents: number;
  unit: string;
  photo_key: string;
  source_url: string;
  price_status: string;
  needs_udaf_check: number;
  sort_order: number;
};

export async function getPublicListing(env: Env, token: string): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) {
    if (await retiredToken(env, token)) return json(removedListingPayload());
    throw new HttpError('we cannot find that listing.', 404);
  }
  if (listing.status === 'farm_denied') return json(removedListingPayload());
  return json(await present(env, listing));
}

export async function approvePublicListing(env: Env, token: string): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  if (listing.status === 'farm_denied') throw new HttpError('this page was removed.');
  const next = approveListing(new Date().toISOString());
  await env.DB.prepare(
    `UPDATE listing_drafts SET status = ?, approved_at = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(next.status, next.approvedAt, listing.id).run();
  const saved = await byToken(env, token);
  return json(await present(env, saved!));
}

export async function denyPublicListing(env: Env, token: string, body: Record<string, unknown>): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  if (listing.status === 'farm_denied') return json(removedListingPayload());
  let next;
  try {
    next = denyListing(new Date().toISOString(), String(body.note ?? ''));
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : 'could not remove the page.');
  }
  await env.DB.prepare(
    `UPDATE listing_drafts SET status = ?, denied_at = ?, deny_reason = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(next.status, next.deniedAt, next.denyReason, listing.id).run();
  return json(removedListingPayload());
}

export async function changePublicListing(env: Env, token: string, body: Record<string, unknown>): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  if (listing.status === 'farm_denied') throw new HttpError('this page was removed.');
  let next;
  try {
    next = requestListingChanges(String(body.note ?? ''));
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : 'tell us what to change.');
  }
  await env.DB.prepare(
    `UPDATE listing_drafts SET status = ?, change_note = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(next.status, next.changeNote, listing.id).run();
  const saved = await byToken(env, token);
  return json(await present(env, saved!));
}

export async function adminListings(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT * FROM listing_drafts ORDER BY is_sample DESC, updated_at DESC`,
  ).all<DraftRow>();
  const listings = [];
  for (const row of rows.results) listings.push(await present(env, row));
  return json({ listings });
}

export async function adminGetListing(env: Env, id: number): Promise<Response> {
  const row = await byId(env, id);
  if (!row) throw new HttpError('no listing with that id.', 404);
  return json({ listing: await present(env, row) });
}

export async function adminSaveListing(env: Env, id: number | null, body: Record<string, unknown>): Promise<Response> {
  const farmName = String(body.farmName ?? '').trim().slice(0, 80);
  const farmerNames = String(body.farmerNames ?? '').trim().slice(0, 120);
  const story = String(body.story ?? '').trim().slice(0, 400);
  const location = String(body.location ?? '').trim().slice(0, 80);
  if (!farmName) throw new HttpError('the listing needs a farm name.');
  const products = readProducts(body.products);
  if (!products.length) throw new HttpError('add at least one product.');
  let listingId = id;
  if (listingId == null) {
    const token = newListingToken();
    const inserted = await env.DB.prepare(
      `INSERT INTO listing_drafts (token, farm_name, farmer_names, story, location, status) VALUES (?, ?, ?, ?, ?, 'draft')`,
    ).bind(token, farmName, farmerNames, story, location).run();
    listingId = inserted.meta.last_row_id;
  } else {
    const existing = await byId(env, listingId);
    if (!existing) throw new HttpError('no listing with that id.', 404);
    await env.DB.prepare(
      `UPDATE listing_drafts SET farm_name = ?, farmer_names = ?, story = ?, location = ?, updated_at = datetime('now') WHERE id = ?`,
    ).bind(farmName, farmerNames, story, location, listingId).run();
    await env.DB.prepare(`DELETE FROM listing_products WHERE listing_id = ?`).bind(listingId).run();
  }
  let sort = 0;
  for (const product of products) {
    await env.DB.prepare(
      `INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, sort_order) VALUES (?, ?, ?, ?, ?, '', ?, 0, ?)`,
    ).bind(listingId, product.name, product.priceCents, product.unit, product.photoKey, product.priceStatus || 'public', sort).run();
    sort += 1;
  }
  const saved = await byId(env, listingId);
  return json({ listing: await present(env, saved!) }, id == null ? 201 : 200);
}

export async function adminMarkSent(env: Env, id: number): Promise<Response> {
  const existing = await byId(env, id);
  if (!existing) throw new HttpError('no listing with that id.', 404);
  if (existing.status === 'farm_approved') throw new HttpError('the farm already approved this listing.');
  if (existing.status === 'farm_denied') {
    const next = resendDeniedListing({ status: existing.status, nextToken: newListingToken() });
    await env.DB.prepare(`INSERT INTO listing_retired_tokens (token) VALUES (?)`).bind(existing.token).run();
    await env.DB.prepare(
      `UPDATE listing_drafts SET token = ?, status = ?, denied_at = '', deny_reason = '', updated_at = datetime('now') WHERE id = ?`,
    ).bind(next.token, next.status, id).run();
  } else {
    await env.DB.prepare(
      `UPDATE listing_drafts SET status = 'sent', updated_at = datetime('now') WHERE id = ?`,
    ).bind(id).run();
  }
  const saved = await byId(env, id);
  return json({ listing: await present(env, saved!) });
}

async function present(env: Env, row: DraftRow) {
  const products = await env.DB.prepare(
    `SELECT id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, sort_order FROM listing_products WHERE listing_id = ? ORDER BY sort_order, id`,
  ).bind(row.id).all<ProductRow>();
  return {
    id: row.id,
    token: row.token,
    path: `/listing/${row.token}`,
    farmName: row.farm_name,
    story: row.story,
    location: row.location,
    status: row.status,
    statusLabel: listingStatusLabel(row.status),
    changeNote: row.change_note,
    approvedAt: row.approved_at,
    deniedAt: row.denied_at || '',
    denyReason: row.deny_reason || '',
    farmerNames: row.farmer_names || '',
    isSample: !!row.is_sample,
    needsForm: listingShowsForm(products.results.length),
    shopVisible: listingAppearsInBrowse(row.status, !!row.is_sample),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    products: products.results.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.price_cents,
      unit: product.unit,
      photoKey: product.photo_key,
      sourceUrl: product.source_url || '',
      priceStatus: product.price_status || 'public',
      needsUdafCheck: !!product.needs_udaf_check,
    })),
  };
}

export async function savePublicListing(env: Env, token: string, body: Record<string, unknown>): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  if (listing.status === 'farm_denied') throw new HttpError('this page was removed.');
  if (!canEdit(listing.status)) throw new HttpError('this listing is approved. ask for changes if something is off.');
  const farmName = String(body.farmName ?? listing.farm_name).trim().slice(0, 80);
  const farmerNames = String(body.farmerNames ?? listing.farmer_names ?? '').trim().slice(0, 120);
  const story = String(body.story ?? listing.story).trim().slice(0, 200);
  const location = String(body.location ?? listing.location).trim().slice(0, 80);
  if (!farmName) throw new HttpError('the listing needs a farm name.');
  const products = readFarmProducts(body.products);
  await env.DB.prepare(
    `UPDATE listing_drafts SET farm_name = ?, farmer_names = ?, story = ?, location = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(farmName, farmerNames, story, location, listing.id).run();
  await replaceProducts(env, listing.id, products);
  const saved = await byToken(env, token);
  return json(await present(env, saved!));
}

export async function previewListingCsv(env: Env, body: Record<string, unknown>): Promise<Response> {
  const foods = await catalogFoods(env);
  return json(previewFarmCsv(String(body.csv ?? ''), foods));
}

export async function importListingCsv(env: Env, body: Record<string, unknown>): Promise<Response> {
  const foods = await catalogFoods(env);
  const preview = previewFarmCsv(String(body.csv ?? ''), foods);
  const created = [];
  for (const farm of preview.farms) {
    const products = farm.products.filter((product) => product.problems.length === 0 && product.priceCents);
    if (!products.length) continue;
    const token = newListingToken();
    const sample = farm.farm.toLowerCase().startsWith('sample');
    const inserted = await env.DB.prepare(
      `INSERT INTO listing_drafts (token, farm_name, farmer_names, story, location, status, is_sample)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
    ).bind(token, farm.farm, farm.farmerNames, farm.story, farm.town, sample ? 1 : 0).run();
    const id = inserted.meta.last_row_id;
    let sort = 0;
    for (const product of products) {
      await env.DB.prepare(
        `INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, product.name, product.priceCents, product.unit, product.photoKey, product.sourceUrl, product.priceStatus, product.needsUdafCheck ? 1 : 0, sort).run();
      sort += 1;
    }
    const saved = await byId(env, id);
    if (saved) created.push(await present(env, saved));
  }
  return json({ created, preview }, 201);
}

async function catalogFoods(env: Env): Promise<CatalogMatch[]> {
  const rows = await env.DB.prepare(
    `SELECT name, synonyms, photo_key FROM catalog_foods`,
  ).all<{ name: string; synonyms: string; photo_key: string }>();
  return rows.results.map((food) => ({ name: food.name, synonyms: food.synonyms || '', photoKey: food.photo_key || 'placeholder' }));
}

function canEdit(status: string): boolean {
  return status !== 'farm_approved' && status !== 'farm_denied';
}

function removedListingPayload() {
  return {
    status: 'farm_denied' as const,
    statusLabel: 'denied',
    removed: true,
    shopVisible: false,
    products: [] as [],
    farmName: '',
    farmerNames: '',
    story: '',
    location: '',
    changeNote: '',
    needsForm: false,
  };
}

async function retiredToken(env: Env, token: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT token FROM listing_retired_tokens WHERE token = ?`).bind(token).first<{ token: string }>();
  return !!row;
}

function readFarmProducts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((item) => cleanFarmProduct(item as Record<string, unknown>));
}

async function replaceProducts(env: Env, listingId: number, products: ListingProductInput[]) {
  await env.DB.prepare(`DELETE FROM listing_products WHERE listing_id = ?`).bind(listingId).run();
  let sort = 0;
  for (const product of products) {
    await env.DB.prepare(
      `INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      listingId,
      product.name,
      product.priceCents,
      product.unit,
      product.photoKey,
      product.sourceUrl,
      product.priceStatus || 'public',
      product.needsUdafCheck ? 1 : 0,
      sort,
    ).run();
    sort += 1;
  }
}

function readProducts(value: unknown): ListingProductInput[] {
  if (!Array.isArray(value)) throw new HttpError('add the products as a list.');
  try {
    return value.slice(0, 24).map((item) => {
      const raw = item as Record<string, unknown>;
      const base = cleanListingProduct(raw);
      const priceStatus = parsePriceStatus(String(raw.priceStatus ?? 'public'));
      const needsUdafCheck = parseUdafFlag(raw.needsUdafCheck === true ? 'yes' : String(raw.needsUdafCheck ?? 'no'));
      if (!priceStatus) throw new Error('unknown price status');
      if (needsUdafCheck == null) throw new Error('unknown udaf check');
      return {
        ...base,
        sourceUrl: String(raw.sourceUrl ?? '').trim().slice(0, 300),
        priceStatus,
        needsUdafCheck,
      };
    });
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : 'check the products.');
  }
}

async function byToken(env: Env, token: string): Promise<DraftRow | null> {
  return env.DB.prepare(`SELECT * FROM listing_drafts WHERE token = ?`).bind(token).first<DraftRow>();
}

async function byId(env: Env, id: number): Promise<DraftRow | null> {
  return env.DB.prepare(`SELECT * FROM listing_drafts WHERE id = ?`).bind(id).first<DraftRow>();
}
