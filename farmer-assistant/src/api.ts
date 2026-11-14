import { authorized, staffName } from "./auth.ts";
import { D1Repo } from "./d1.ts";
import { canonUnit } from "./format.ts";
import { HttpError, json } from "./http.ts";
import type { Repo } from "./repo.ts";
import {
  addProduct,
  approveCatalog,
  approveInventory,
  assertSampleFarmer,
  createFarmer,
  createStaffIssue,
  editInventory,
  farmerFromToken,
  handleInbound,
  issueMagicLink,
  parseContactMethod,
  resetSamples,
  resolveStaffIssue,
  saveFarmCatalog,
  setApplicationStatus,
  setAutomationPaused,
  setTakeover,
  staffDesk,
  staffReply,
  startWeeklyCheck,
  submitApplication,
  updateFarmerProfile,
  updateProduct,
  type FarmerInput,
} from "./service.ts";
import { activeMarketWeekStart, formatWeekLabel, isYmd } from "./time.ts";
import type { ApplicationStatus, Consent, InventoryStatus } from "./types.ts";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  STAFF_TOKEN?: string;
}

const CONSENTS: Consent[] = ["none", "pending", "granted", "revoked"];
const STATUSES: InventoryStatus[] = ["estimate", "confirmed", "needs_verification", "unavailable"];

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "GET" && path === "/api/health") {
    return json({ ok: true, service: "mainz-assistant" });
  }

  // Phase 3 seam. Disabled until consent records, STOP, A2P 10DLC, and rate limits exist.
  // The live handler should resolve the farmer and call handleInbound(..., channel: "sms").
  if (path === "/api/sms/inbound") {
    return json(
      {
        enabled: false,
        error:
          "sms is disabled until phase 3. that phase must record consent, honor STOP, finish A2P 10DLC, and rate-limit before this route calls handleInbound.",
      },
      501,
    );
  }

  if (method === "POST" && path === "/api/applications") {
    try {
      const body = await readJson(request);
      const result = await submitApplication(repoFrom(env), applicationBody(body), new Date());
      return json(result, 201);
    } catch (err) {
      return apiError(err);
    }
  }
  if (path === "/api/farm/session" || path === "/api/farm/me" || path === "/api/farm/products" || path.startsWith("/api/farm/products/")) {
    try {
      return await farmRoute(request, method, path, repoFrom(env), new Date());
    } catch (err) {
      return apiError(err);
    }
  }

  if (!authorized(request, env.STAFF_TOKEN)) return json({ error: "unauthorized" }, 401);
  if (!env.DB) return json({ error: "database is not configured" }, 500);

  const repo = new D1Repo(env.DB);
  const actor = staffName(request);
  const now = new Date();
  try {
    return await route(request, method, path, url, repo, actor, now);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "something went wrong" }, 500);
  }
}

async function route(
  request: Request,
  method: string,
  path: string,
  url: URL,
  repo: Repo,
  actor: string,
  now: Date,
): Promise<Response> {
  if (method === "GET" && path === "/api/session") return json({ ok: true, name: actor });
  if (method === "GET" && path === "/api/desk") {
    const weekStart = activeMarketWeekStart(now);
    return json({ weekStart, items: await staffDesk(repo, weekStart) });
  }
  if (method === "GET" && path === "/api/outbox") return json(await repo.listEmails());
  const emailPath = path.match(/^\/api\/outbox\/(\d+)$/);
  if (emailPath && method === "GET") {
    const email = await repo.getEmail(parseId(emailPath[1]));
    if (!email) throw new HttpError(404, "email not found");
    return json(email);
  }
  if (method === "GET" && path === "/api/applications") return json(await repo.listApplications());
  const applicationStatus = path.match(/^\/api\/applications\/(\d+)\/status$/);
  if (applicationStatus && method === "POST") {
    const body = await readJson(request);
    const status = String(body.status || "");
    if (!["received", "in_review", "approved", "needs_info", "declined"].includes(status)) {
      throw new HttpError(400, "invalid application status");
    }
    return json(await setApplicationStatus(repo, parseId(applicationStatus[1]), status as ApplicationStatus, actor, now));
  }
  if (method === "GET" && path === "/api/calls") return json(await repo.listCalls("open"));
  const callDone = path.match(/^\/api\/calls\/(\d+)\/done$/);
  if (callDone && method === "POST") return json(await repo.completeCall(parseId(callDone[1]), actor, now.toISOString()));

  if (method === "GET" && path === "/api/overview") {
    const weekStart = activeMarketWeekStart(now);
    const counts = await repo.overview(weekStart);
    return json({ ...counts, weekStart, weekLabel: formatWeekLabel(weekStart) });
  }
  if (method === "GET" && path === "/api/farmers") return json(await repo.listFarmers());
  if (method === "POST" && path === "/api/farmers") {
    return json(await createFarmer(repo, await farmerInput(request), actor, now), 201);
  }

  const farmerAction = path.match(/^\/api\/farmers\/(\d+)\/(pause|takeover|reply|products|magic-link)$/);
  if (farmerAction) {
    const id = parseId(farmerAction[1]);
    const action = farmerAction[2];
    if (method === "POST" && action === "pause") {
      const body = await readJson(request);
      if (typeof body.paused !== "boolean") throw new HttpError(400, "paused must be true or false");
      return json(await setAutomationPaused(repo, id, body.paused, actor, now));
    }
    if (method === "POST" && action === "takeover") {
      const body = await readJson(request);
      if (typeof body.active !== "boolean") throw new HttpError(400, "active must be true or false");
      await setTakeover(repo, id, body.active, actor, now);
      return json(await farmerPayload(repo, id, now));
    }
    if (method === "POST" && action === "reply") {
      const body = await readJson(request);
      return json(await staffReply(repo, id, String(body.body ?? ""), actor, now), 201);
    }
    if (method === "POST" && action === "products") {
      return json(await addProduct(repo, id, await productInput(request), actor, now), 201);
    }
    if (method === "POST" && action === "magic-link") {
      return json(await issueMagicLink(repo, id, url.origin, now), 201);
    }
  }

  const farmerPath = path.match(/^\/api\/farmers\/(\d+)$/);
  if (farmerPath) {
    const id = parseId(farmerPath[1]);
    if (method === "GET") return json(await farmerPayload(repo, id, now, url.searchParams.get("week")));
    if (method === "PATCH") return json(await updateFarmerProfile(repo, id, await farmerInput(request), actor, now));
  }

  const productApprove = path.match(/^\/api\/products\/(\d+)\/approve$/);
  if (productApprove && method === "POST") return json(await approveCatalog(repo, parseId(productApprove[1]), actor, now));

  const productPath = path.match(/^\/api\/products\/(\d+)$/);
  if (productPath && method === "PATCH") {
    return json(await updateProduct(repo, parseId(productPath[1]), await productInput(request), actor, now));
  }

  if (method === "GET" && path === "/api/inventory") {
    const weekStart = weekParam(url.searchParams.get("week"), now);
    return json({
      weekStart,
      weekLabel: formatWeekLabel(weekStart),
      rows: await repo.listInventoryByWeek(weekStart),
    });
  }

  const approvePath = path.match(/^\/api\/inventory\/(\d+)\/approve$/);
  if (approvePath && method === "POST") return json(await approveInventory(repo, parseId(approvePath[1]), actor, now));

  const inventoryPath = path.match(/^\/api\/inventory\/(\d+)$/);
  if (inventoryPath && method === "PATCH") {
    return json(await editInventory(repo, parseId(inventoryPath[1]), await inventoryInput(request), actor, now));
  }

  if (path === "/api/issues" && method === "GET") {
    const status = url.searchParams.get("status") || "open";
    if (status !== "open" && status !== "resolved" && status !== "all") throw new HttpError(400, "invalid issue status");
    return json(await repo.listIssues(status));
  }
  if (path === "/api/issues" && method === "POST") {
    const body = await readJson(request);
    return json(await createStaffIssue(repo, requireId(body.farmerId), String(body.summary ?? ""), actor, now), 201);
  }
  const resolvePath = path.match(/^\/api\/issues\/(\d+)\/resolve$/);
  if (resolvePath && method === "POST") return json(await resolveStaffIssue(repo, parseId(resolvePath[1]), actor, now));

  if (path === "/api/simulator/inbound" && method === "POST") {
    const body = await readJson(request);
    const farmerId = requireId(body.farmerId);
    const farmer = await repo.getFarmer(farmerId);
    if (!farmer) throw new HttpError(404, "farmer not found");
    assertSampleFarmer(farmer);
    const result = await handleInbound(
      repo,
      {
        farmerId,
        body: String(body.body ?? ""),
        providerMessageId: body.providerMessageId == null ? null : String(body.providerMessageId),
        channel: "simulator",
      },
      now,
    );
    return json({ result, ...(await farmerPayload(repo, farmerId, now)) });
  }
  if (path === "/api/simulator/start" && method === "POST") {
    const body = await readJson(request);
    const started = await startWeeklyCheck(repo, requireId(body.farmerId), requireId(body.productId), now, { simulator: true });
    return json({ ...started, ...(await farmerPayload(repo, requireId(body.farmerId), now)) });
  }
  if (path === "/api/simulator/reset" && method === "POST") {
    return json(await resetSamples(repo, actor, now));
  }

  return json({ error: "not found" }, 404);
}

async function farmerPayload(repo: Repo, id: number, now: Date, week?: string | null) {
  const farmer = await repo.getFarmer(id);
  if (!farmer) throw new HttpError(404, "farmer not found");
  const weekStart = weekParam(week ?? null, now);
  const [products, conversation, inventory, messages, audit, issues] = await Promise.all([
    repo.listProducts(id),
    repo.getConversation(id),
    repo.listInventoryForFarmerWeek(id, weekStart),
    repo.listMessages(id),
    repo.listAudit(id),
    repo.listIssuesForFarmer(id),
  ]);
  return { farmer, products, conversation, inventory, messages, audit, issues, weekStart, weekLabel: formatWeekLabel(weekStart) };
}

async function farmerInput(request: Request): Promise<FarmerInput> {
  const body = await readJson(request);
  const smsConsent = String(body.smsConsent || "none");
  if (!CONSENTS.includes(smsConsent as Consent)) {
    throw new HttpError(400, "sms consent must be none, pending, granted, or revoked");
  }
  const farmName = text(body.farmName, 120);
  const contactName = text(body.contactName, 120);
  const phone = text(body.phone, 40);
  if (!farmName || !contactName || !phone) throw new HttpError(400, "farm name, contact name, and phone are required");
  return {
    farmName,
    contactName,
    phone,
    email: text(body.email, 160),
    preferredContactTimes: text(body.preferredContactTimes, 160),
    preferredContactDays: text(body.preferredContactDays, 80),
    contactMethod: parseContactMethod(String(body.contactMethod || "text")),
    delegateName: text(body.delegateName, 120),
    delegatePhone: text(body.delegatePhone, 40),
    pickupLocation: text(body.pickupLocation, 160),
    pickupAvailability: text(body.pickupAvailability, 160),
    smsConsent: smsConsent as Consent,
    assignedStaff: text(body.assignedStaff, 80),
    notes: note(body.notes),
  };
}

async function productInput(request: Request) {
  const body = await readJson(request);
  const name = text(body.name, 80);
  const unit = text(body.unit, 40);
  if (!name || !unit) throw new HttpError(400, "product name and unit are required");
  return { name, unit: canonUnit(unit), defaultPriceCents: nullableInt(body.defaultPriceCents) };
}

async function inventoryInput(request: Request) {
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!STATUSES.includes(status as InventoryStatus)) throw new HttpError(400, "invalid status");
  const unit = text(body.unit, 40);
  return {
    quantity: nullableNumber(body.quantity),
    unit: unit ? canonUnit(unit) : null,
    priceCents: nullableInt(body.priceCents),
    status: status as InventoryStatus,
  };
}

function repoFrom(env: Env): D1Repo {
  if (!env.DB) throw new HttpError(500, "database is not configured");
  return new D1Repo(env.DB);
}

async function farmRoute(request: Request, method: string, path: string, repo: D1Repo, now: Date): Promise<Response> {
  const token = farmToken(request);
  const farmer = await farmerFromToken(repo, token, now);
  if (method === "GET" && (path === "/api/farm/session" || path === "/api/farm/me")) {
    const products = await repo.listProducts(farmer.id);
    const weekStart = activeMarketWeekStart(now);
    const inventory = await repo.listInventoryForFarmerWeek(farmer.id, weekStart);
    return json({ farmer, products, inventory, weekStart, weekLabel: formatWeekLabel(weekStart) });
  }
  if (method === "PATCH" && path === "/api/farm/me") {
    const body = await readJson(request);
    const updated = await updateFarmerProfile(repo, farmer.id, {
      farmName: farmer.farmName,
      contactName: text(body.contactName, 120) || farmer.contactName,
      phone: text(body.phone, 40) || farmer.phone,
      email: text(body.email, 160) || farmer.email,
      preferredContactTimes: text(body.preferredContactTimes, 160),
      preferredContactDays: text(body.preferredContactDays, 80),
      contactMethod: parseContactMethod(String(body.contactMethod || farmer.contactMethod)),
      delegateName: text(body.delegateName, 120),
      delegatePhone: text(body.delegatePhone, 40),
      pickupLocation: text(body.pickupLocation, 160),
      pickupAvailability: text(body.pickupAvailability, 160),
      smsConsent: farmer.smsConsent,
      assignedStaff: farmer.assignedStaff,
      notes: note(body.notes),
    }, "farmer", now);
    return json(updated);
  }
  if (method === "POST" && path === "/api/farm/products") {
    const body = await readJson(request);
    return json(await saveFarmCatalog(repo, farmer.id, catalogBody(body), now), 201);
  }
  const edit = path.match(/^\/api\/farm\/products\/(\d+)$/);
  if (edit && method === "PATCH") {
    const body = await readJson(request);
    return json(await saveFarmCatalog(repo, farmer.id, { ...catalogBody(body), id: parseId(edit[1]) }, now));
  }
  return json({ error: "not found" }, 404);
}

function farmToken(request: Request): string {
  const header = request.headers.get("X-Farm-Token") || "";
  if (header.trim()) return header.trim();
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  throw new HttpError(401, "that link has expired");
}

function applicationBody(body: Record<string, unknown>) {
  return {
    farmName: text(body.farmName, 120),
    contactName: text(body.contactName, 120),
    email: text(body.email, 160),
    phone: text(body.phone, 40),
    city: text(body.city, 80),
    whatYouSell: text(body.whatYouSell, 500),
    fulfillment: text(body.fulfillment, 40),
    company: text(body.company, 120),
  };
}

function catalogBody(body: Record<string, unknown>) {
  return {
    name: text(body.name, 80),
    unit: text(body.unit, 40),
    defaultPriceCents: nullableInt(body.defaultPriceCents),
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl.trim() : "",
  };
}

function weekParam(value: string | null, now: Date): string {
  if (!value) return activeMarketWeekStart(now);
  if (!isYmd(value)) throw new HttpError(400, "week must be YYYY-MM-DD");
  return value;
}

function apiError(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error(err);
  return json({ error: "something went wrong" }, 500);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new HttpError(400, "invalid json");
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, "invalid json");
  }
}

function parseId(value: string): number {
  if (!/^\d+$/.test(value)) throw new HttpError(400, "invalid id");
  return Number(value);
}

function requireId(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "invalid id");
  return n;
}

function text(value: unknown, max: number): string {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function note(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").trim().slice(0, 2000);
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, "invalid number");
  return n;
}

function nullableInt(value: unknown): number | null {
  const n = nullableNumber(value);
  if (n == null) return null;
  if (!Number.isInteger(n) || n < 0) throw new HttpError(400, "invalid cents");
  return n;
}
