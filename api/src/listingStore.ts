import { HttpError, json } from './http';
import {
  approveListing,
  cleanListingProduct,
  listingAppearsInBrowse,
  listingStatusLabel,
  newListingToken,
  requestListingChanges,
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
  is_sample: number;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: number;
  name: string;
  price_cents: number;
  unit: string;
  photo_key: string;
  sort_order: number;
};

export async function getPublicListing(env: Env, token: string): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  return json(await present(env, listing));
}

export async function approvePublicListing(env: Env, token: string): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
  const next = approveListing(new Date().toISOString());
  await env.DB.prepare(
    `UPDATE listing_drafts SET status = ?, approved_at = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(next.status, next.approvedAt, listing.id).run();
  const saved = await byToken(env, token);
  return json(await present(env, saved!));
}

export async function changePublicListing(env: Env, token: string, body: Record<string, unknown>): Promise<Response> {
  const listing = await byToken(env, token);
  if (!listing) throw new HttpError('we cannot find that listing.', 404);
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
  const story = String(body.story ?? '').trim().slice(0, 400);
  const location = String(body.location ?? '').trim().slice(0, 80);
  if (!farmName) throw new HttpError('the listing needs a farm name.');
  const products = readProducts(body.products);
  if (!products.length) throw new HttpError('add at least one product.');
  let listingId = id;
  if (listingId == null) {
    const token = newListingToken();
    const inserted = await env.DB.prepare(
      `INSERT INTO listing_drafts (token, farm_name, story, location, status) VALUES (?, ?, ?, ?, 'draft')`,
    ).bind(token, farmName, story, location).run();
    listingId = inserted.meta.last_row_id;
  } else {
    const existing = await byId(env, listingId);
    if (!existing) throw new HttpError('no listing with that id.', 404);
    await env.DB.prepare(
      `UPDATE listing_drafts SET farm_name = ?, story = ?, location = ?, updated_at = datetime('now') WHERE id = ?`,
    ).bind(farmName, story, location, listingId).run();
    await env.DB.prepare(`DELETE FROM listing_products WHERE listing_id = ?`).bind(listingId).run();
  }
  let sort = 0;
  for (const product of products) {
    await env.DB.prepare(
      `INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(listingId, product.name, product.priceCents, product.unit, product.photoKey, sort).run();
    sort += 1;
  }
  const saved = await byId(env, listingId);
  return json({ listing: await present(env, saved!) }, id == null ? 201 : 200);
}

export async function adminMarkSent(env: Env, id: number): Promise<Response> {
  const existing = await byId(env, id);
  if (!existing) throw new HttpError('no listing with that id.', 404);
  if (existing.status === 'farm_approved') throw new HttpError('the farm already approved this listing.');
  await env.DB.prepare(
    `UPDATE listing_drafts SET status = 'sent', updated_at = datetime('now') WHERE id = ?`,
  ).bind(id).run();
  const saved = await byId(env, id);
  return json({ listing: await present(env, saved!) });
}

async function present(env: Env, row: DraftRow) {
  const products = await env.DB.prepare(
    `SELECT id, name, price_cents, unit, photo_key, sort_order FROM listing_products WHERE listing_id = ? ORDER BY sort_order, id`,
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
    isSample: !!row.is_sample,
    shopVisible: listingAppearsInBrowse(row.status, !!row.is_sample),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    products: products.results.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.price_cents,
      unit: product.unit,
      photoKey: product.photo_key,
    })),
  };
}

function readProducts(value: unknown): ListingProductInput[] {
  if (!Array.isArray(value)) throw new HttpError('add the products as a list.');
  try {
    return value.slice(0, 24).map((item) => cleanListingProduct(item as Record<string, unknown>));
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
