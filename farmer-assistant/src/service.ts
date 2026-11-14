import { textingGate, textTarget } from "./contact.ts";
import { buildDesk, type DeskItem } from "./desk.ts";
import {
  disabledEmailSender,
  dispatchEmail,
  magicLinkEmail,
  statusEmail,
  thankYouEmail,
} from "./email.ts";
import {
  openingMessage,
  stopReply,
} from "./format.ts";
import { HttpError } from "./http.ts";
import { step } from "./machine.ts";
import { isHedgedMessage, parseMessage } from "./parser.ts";
import type { Repo } from "./repo.ts";
import { seedSamples } from "./seed.ts";
import { activeMarketWeekStart } from "./time.ts";
import type {
  Application,
  ApplicationStatus,
  Channel,
  Consent,
  ContactMethod,
  Farmer,
  InventoryRow,
  InventoryStatus,
  Message,
  NewFarmer,
  Product,
} from "./types.ts";

export interface InboundInput {
  farmerId: number;
  body: string;
  providerMessageId: string | null;
  channel: Channel;
}

export interface InboundResult {
  deduped: boolean;
  replies: string[];
  suppressed: null | "paused" | "takeover" | "stopped" | "no_consent";
  consentRevoked: boolean;
  issueCreated: boolean;
  messageId: number;
}

const STATUSES: InventoryStatus[] = ["estimate", "confirmed", "needs_verification", "unavailable"];
const CONSENTS: Consent[] = ["none", "pending", "granted", "revoked"];

/**
 * Shared inbound pipeline. The simulator calls this now.
 * Phase 3 should verify the Twilio signature, resolve the farmer from the
 * phone number, then call handleInbound with channel "sms".
 * Do not add a second parser.
 */
export async function handleInbound(repo: Repo, input: InboundInput, now: Date): Promise<InboundResult> {
  const body = input.body.replace(/\r\n/g, "\n").trim();
  if (!body) throw new HttpError(400, "message is empty");
  if (body.length > 2000) throw new HttpError(400, "message is too long");
  const providerMessageId = input.providerMessageId?.trim() || null;
  if (providerMessageId && providerMessageId.length > 200) throw new HttpError(400, "message id is too long");

  const farmer = await repo.getFarmer(input.farmerId);
  if (!farmer) throw new HttpError(404, "farmer not found");
  const at = now.toISOString();
  const inserted = await repo.insertMessage({
    farmerId: farmer.id,
    direction: "in",
    channel: input.channel,
    providerMessageId,
    body,
    author: "farmer",
    createdAt: at,
  });
  if (inserted.deduped) {
    return {
      deduped: true,
      replies: [],
      suppressed: null,
      consentRevoked: false,
      issueCreated: false,
      messageId: inserted.message.id,
    };
  }

  const parsed = parseMessage(body);
  const conversation = await repo.getConversation(farmer.id);
  const takenOver = conversation.state === "taken_over" || !!conversation.takenOverByStaff;

  if (parsed.type === "stop") {
    await repo.updateFarmer(farmer.id, { ...toNew(farmer), smsConsent: "revoked", smsConsentAt: at, smsConsentSource: input.channel }, at);
    await repo.saveConversation(
      {
        ...conversation,
        state: "stopped",
        productId: null,
        marketWeekId: null,
        pendingQuantity: null,
        pendingUnit: null,
        pendingPriceCents: null,
        takenOverByStaff: null,
      },
      at,
    );
    await repo.addAudit({
      farmerId: farmer.id,
      actor: "bot",
      action: "consent_revoked",
      entity: "farmer",
      entityId: farmer.id,
      before: { smsConsent: farmer.smsConsent },
      after: { smsConsent: "revoked", source: input.channel },
      at,
    });
    const speak = farmer.smsConsent !== "revoked" && !farmer.automationPaused && !takenOver;
    const replies = speak ? [stopReply()] : [];
    for (const reply of replies) await say(repo, farmer.id, input.channel, reply, at);
    return {
      deduped: false,
      replies,
      suppressed: speak ? null : farmer.automationPaused ? "paused" : takenOver ? "takeover" : "stopped",
      consentRevoked: true,
      issueCreated: false,
      messageId: inserted.message.id,
    };
  }

  if (farmer.automationPaused) {
    return silent(inserted.message.id, "paused");
  }
  if (takenOver) return silent(inserted.message.id, "takeover");
  if (farmer.smsConsent === "revoked" || conversation.state === "stopped") return silent(inserted.message.id, "stopped");
  if (farmer.smsConsent !== "granted") return silent(inserted.message.id, "no_consent");

  let productName: string | null = null;
  let productUnit: string | null = null;
  if (conversation.productId) {
    const product = await repo.getProduct(conversation.productId);
    productName = product?.name ?? null;
    productUnit = product?.unit ?? null;
  }

  const output = step({
    state: conversation.state,
    productName,
    productUnit,
    pendingQuantity: conversation.pendingQuantity,
    pendingUnit: conversation.pendingUnit,
    pendingPriceCents: conversation.pendingPriceCents,
    parsed,
    rawText: body,
    hedged: isHedgedMessage(body),
  });

  if (output.inventory && conversation.productId && conversation.marketWeekId) {
    const action =
      output.inventory.status === "confirmed"
        ? "inventory_confirmed"
        : output.inventory.status === "unavailable"
          ? "inventory_unavailable"
          : output.inventory.status === "needs_verification"
            ? "inventory_needs_verification"
            : "inventory_estimate";
    await repo.saveInventory(
      {
        farmerId: farmer.id,
        productId: conversation.productId,
        marketWeekId: conversation.marketWeekId,
        quantity: output.inventory.quantity,
        unit: output.inventory.unit,
        priceCents: output.inventory.priceCents,
        status: output.inventory.status,
        sourceHedged: isHedgedMessage(body),
        sourceMessageId: inserted.message.id,
        updatedBy: "bot",
      },
      { actor: "bot", action, at },
    );
  }

  let issueCreated = false;
  if (output.issueSummary) {
    await repo.createIssue({
      farmerId: farmer.id,
      kind: "needs_verification",
      summary: output.issueSummary,
      messageId: inserted.message.id,
      at,
    });
    issueCreated = true;
  }

  await repo.saveConversation(
    {
      farmerId: farmer.id,
      state: output.state,
      productId: output.clearProduct ? null : conversation.productId,
      marketWeekId: output.clearProduct ? null : conversation.marketWeekId,
      pendingQuantity: output.pendingQuantity,
      pendingUnit: output.pendingUnit,
      pendingPriceCents: output.pendingPriceCents,
      takenOverByStaff: output.state === "stopped" ? null : conversation.takenOverByStaff,
    },
    at,
  );

  for (const reply of output.replies) await say(repo, farmer.id, input.channel, reply, at);
  return {
    deduped: false,
    replies: output.replies,
    suppressed: null,
    consentRevoked: output.revokeConsent,
    issueCreated,
    messageId: inserted.message.id,
  };
}

export async function startWeeklyCheck(
  repo: Repo,
  farmerId: number,
  productId: number,
  now: Date,
  options: { simulator?: boolean } = {},
): Promise<{ message: Message; weekStart: string }> {
  const farmer = await mustFarmer(repo, farmerId);
  if (options.simulator) assertSampleFarmer(farmer);
  const product = await repo.getProduct(productId);
  if (!product || product.farmerId !== farmer.id) throw new HttpError(404, "product not found");
  const gate = textingGate(farmer, now);
  if (!gate.allowText) {
    if (gate.recordCall) await repo.addCall({ farmerId: farmer.id, reason: gate.reason, at: now.toISOString() });
    throw new HttpError(409, gate.reason);
  }
  if (farmer.automationPaused) throw new HttpError(409, "automation is paused. the bot stays silent.");
  if (farmer.smsConsent !== "granted") throw new HttpError(409, "sms consent is not granted, so the bot will not start.");
  const conversation = await repo.getConversation(farmer.id);
  if (conversation.takenOverByStaff || conversation.state === "taken_over") {
    throw new HttpError(409, "this conversation is taken over. the bot stays silent.");
  }
  if (conversation.state === "awaiting_availability" || conversation.state === "awaiting_price" || conversation.state === "awaiting_confirm") {
    throw new HttpError(409, "a check is already open. finish it, take over, or reset sample data.");
  }
  const at = now.toISOString();
  const week = await repo.ensureWeek(activeMarketWeekStart(now), at);
  await repo.saveConversation(
    {
      farmerId: farmer.id,
      state: "awaiting_availability",
      productId: product.id,
      marketWeekId: week.id,
      pendingQuantity: null,
      pendingUnit: null,
      pendingPriceCents: null,
      takenOverByStaff: null,
    },
    at,
  );
  const body = openingMessage(textTarget(farmer).name, product.name);
  const { message } = await say(repo, farmer.id, "simulator", body, at);
  return { message, weekStart: week.weekStart };
}

export function assertSampleFarmer(farmer: Farmer): void {
  if (!farmer.isSample) throw new HttpError(400, "the simulator only talks to sample farms");
}

export async function setAutomationPaused(repo: Repo, farmerId: number, paused: boolean, actor: string, now: Date): Promise<Farmer> {
  const farmer = await mustFarmer(repo, farmerId);
  const at = now.toISOString();
  const updated = await repo.updateFarmer(farmer.id, { ...toNew(farmer), automationPaused: paused }, at);
  await repo.addAudit({
    farmerId: farmer.id,
    actor: staffActor(actor),
    action: paused ? "automation_paused" : "automation_resumed",
    entity: "farmer",
    entityId: farmer.id,
    before: { automationPaused: farmer.automationPaused },
    after: { automationPaused: paused },
    at,
  });
  return updated;
}

export async function setTakeover(repo: Repo, farmerId: number, active: boolean, actor: string, now: Date): Promise<Farmer> {
  const farmer = await mustFarmer(repo, farmerId);
  const at = now.toISOString();
  const name = actor.trim() || "staff";
  const conversation = await repo.getConversation(farmer.id);
  if (active) {
    await repo.saveConversation({ ...conversation, state: "taken_over", takenOverByStaff: name }, at);
  } else {
    await repo.saveConversation(
      {
        ...conversation,
        state: farmer.smsConsent === "revoked" ? "stopped" : "idle",
        productId: null,
        marketWeekId: null,
        pendingQuantity: null,
        pendingUnit: null,
        pendingPriceCents: null,
        takenOverByStaff: null,
      },
      at,
    );
  }
  await repo.addAudit({
    farmerId: farmer.id,
    actor: staffActor(actor),
    action: active ? "takeover_started" : "takeover_ended",
    entity: "conversation",
    entityId: farmer.id,
    before: { takenOverByStaff: conversation.takenOverByStaff, state: conversation.state },
    after: { takenOverByStaff: active ? name : null },
    at,
  });
  return farmer;
}

export async function staffReply(repo: Repo, farmerId: number, body: string, actor: string, now: Date): Promise<Message> {
  const text = body.trim();
  if (!text) throw new HttpError(400, "reply is empty");
  if (text.length > 2000) throw new HttpError(400, "reply is too long");
  const farmer = await mustFarmer(repo, farmerId);
  const conversation = await repo.getConversation(farmer.id);
  if (!conversation.takenOverByStaff && conversation.state !== "taken_over") {
    throw new HttpError(409, "take over the conversation before replying, so the bot stays silent.");
  }
  const at = now.toISOString();
  const inserted = await repo.insertMessage({
    farmerId: farmer.id,
    direction: "out",
    channel: "simulator",
    providerMessageId: null,
    body: text,
    author: staffActor(actor),
    createdAt: at,
  });
  return inserted.message;
}

export async function approveInventory(repo: Repo, id: number, actor: string, now: Date): Promise<InventoryRow> {
  const row = await repo.getInventoryById(id);
  if (!row) throw new HttpError(404, "inventory not found");
  if (row.status !== "estimate" && row.status !== "needs_verification") {
    throw new HttpError(400, "only an estimate or a needs-verification row can be approved");
  }
  if (row.quantity == null || row.priceCents == null || !row.unit) {
    throw new HttpError(400, "quantity and price are required before anything is confirmed");
  }
  const at = now.toISOString();
  return repo.saveInventory(
    { ...row, status: "confirmed", sourceHedged: false, updatedBy: staffActor(actor) },
    { actor: staffActor(actor), action: "inventory_approved", at },
  );
}

export async function editInventory(
  repo: Repo,
  id: number,
  patch: { quantity: number | null; unit: string | null; priceCents: number | null; status: InventoryStatus },
  actor: string,
  now: Date,
): Promise<InventoryRow> {
  const row = await repo.getInventoryById(id);
  if (!row) throw new HttpError(404, "inventory not found");
  if (!STATUSES.includes(patch.status)) throw new HttpError(400, "invalid status");
  if (patch.quantity != null && (!Number.isFinite(patch.quantity) || patch.quantity < 0)) {
    throw new HttpError(400, "quantity must be a number");
  }
  if (patch.priceCents != null && (!Number.isInteger(patch.priceCents) || patch.priceCents < 0)) {
    throw new HttpError(400, "price is invalid");
  }
  if (patch.status !== "unavailable" && (patch.quantity == null || !patch.unit)) {
    throw new HttpError(400, "quantity and unit are required");
  }
  if (patch.status === "confirmed" && (patch.quantity == null || patch.priceCents == null || !patch.unit)) {
    throw new HttpError(400, "quantity and price are required before anything is confirmed");
  }
  const at = now.toISOString();
  return repo.saveInventory(
    {
      farmerId: row.farmerId,
      productId: row.productId,
      marketWeekId: row.marketWeekId,
      quantity: patch.quantity,
      unit: patch.unit,
      priceCents: patch.priceCents,
      status: patch.status,
      sourceHedged: false,
      sourceMessageId: row.sourceMessageId,
      updatedBy: staffActor(actor),
    },
    { actor: staffActor(actor), action: "inventory_edited", at },
  );
}

export interface FarmerInput {
  farmName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContactTimes: string;
  preferredContactDays: string;
  contactMethod: ContactMethod;
  delegateName: string;
  delegatePhone: string;
  pickupLocation: string;
  pickupAvailability: string;
  smsConsent: Consent;
  assignedStaff: string;
  notes: string;
}

export async function createFarmer(repo: Repo, input: FarmerInput, actor: string, now: Date): Promise<Farmer> {
  const at = now.toISOString();
  const farmer = await repo.insertFarmer(
    {
      ...input,
      smsConsentAt: input.smsConsent === "none" ? null : at,
      smsConsentSource: input.smsConsent === "none" ? null : "staff",
      assignedStaff: input.assignedStaff,
      automationPaused: false,
      isSample: false,
    },
    at,
  );
  await repo.addAudit({
    farmerId: farmer.id,
    actor: staffActor(actor),
    action: "farmer_created",
    entity: "farmer",
    entityId: farmer.id,
    before: null,
    after: farmerSnapshot(farmer),
    at,
  });
  return farmer;
}

export async function updateFarmerProfile(repo: Repo, id: number, input: FarmerInput, actor: string, now: Date): Promise<Farmer> {
  const existing = await mustFarmer(repo, id);
  if (!CONSENTS.includes(input.smsConsent)) throw new HttpError(400, "invalid sms consent");
  const at = now.toISOString();
  const consentChanged = existing.smsConsent !== input.smsConsent;
  const updated = await repo.updateFarmer(
    id,
    {
      ...input,
      smsConsentAt: consentChanged ? at : existing.smsConsentAt,
      smsConsentSource: consentChanged ? "staff" : existing.smsConsentSource,
      automationPaused: existing.automationPaused,
      isSample: existing.isSample,
    },
    at,
  );
  if (consentChanged && input.smsConsent === "revoked") {
    const conversation = await repo.getConversation(id);
    await repo.saveConversation({ ...conversation, state: "stopped", takenOverByStaff: null }, at);
  }
  if (consentChanged && input.smsConsent === "granted") {
    const conversation = await repo.getConversation(id);
    if (conversation.state === "stopped") await repo.saveConversation({ ...conversation, state: "idle" }, at);
  }
  await repo.addAudit({
    farmerId: id,
    actor: staffActor(actor),
    action: "farmer_updated",
    entity: "farmer",
    entityId: id,
    before: farmerSnapshot(existing),
    after: farmerSnapshot(updated),
    at,
  });
  return updated;
}

export async function addProduct(
  repo: Repo,
  farmerId: number,
  input: { name: string; unit: string; defaultPriceCents: number | null },
  actor: string,
  now: Date,
): Promise<Product> {
  await mustFarmer(repo, farmerId);
  const at = now.toISOString();
  const product = await repo.insertProduct({
    ...input,
    farmerId,
    reviewStatus: "approved",
    photoUrl: "",
    published: true,
  }, at);
  await repo.addAudit({
    farmerId,
    actor: staffActor(actor),
    action: "product_created",
    entity: "product",
    entityId: product.id,
    before: null,
    after: { name: product.name, unit: product.unit, defaultPriceCents: product.defaultPriceCents },
    at,
  });
  return product;
}

export async function updateProduct(
  repo: Repo,
  id: number,
  input: { name: string; unit: string; defaultPriceCents: number | null },
  actor: string,
  now: Date,
): Promise<Product> {
  const existing = await repo.getProduct(id);
  if (!existing) throw new HttpError(404, "product not found");
  const at = now.toISOString();
  const product = await repo.updateProduct(id, {
    ...input,
    reviewStatus: existing.reviewStatus,
    photoUrl: existing.photoUrl,
    published: existing.published,
  }, at);
  await repo.addAudit({
    farmerId: existing.farmerId,
    actor: staffActor(actor),
    action: "product_updated",
    entity: "product",
    entityId: id,
    before: { name: existing.name, unit: existing.unit, defaultPriceCents: existing.defaultPriceCents },
    after: { name: product.name, unit: product.unit, defaultPriceCents: product.defaultPriceCents },
    at,
  });
  return product;
}

export async function createStaffIssue(repo: Repo, farmerId: number, summary: string, actor: string, now: Date) {
  await mustFarmer(repo, farmerId);
  const text = summary.trim();
  if (!text) throw new HttpError(400, "issue summary is required");
  const at = now.toISOString();
  const issue = await repo.createIssue({ farmerId, kind: "staff", summary: text.slice(0, 500), messageId: null, at });
  await repo.addAudit({
    farmerId,
    actor: staffActor(actor),
    action: "issue_opened",
    entity: "issue",
    entityId: issue.id,
    before: null,
    after: { summary: issue.summary },
    at,
  });
  return issue;
}

export async function resolveStaffIssue(repo: Repo, id: number, actor: string, now: Date) {
  const existing = await repo.getIssue(id);
  if (!existing) throw new HttpError(404, "issue not found");
  const at = now.toISOString();
  const issue = await repo.resolveIssue(id, staffActor(actor), at);
  await repo.addAudit({
    farmerId: existing.farmerId,
    actor: staffActor(actor),
    action: "issue_resolved",
    entity: "issue",
    entityId: id,
    before: { status: "open" },
    after: { status: "resolved" },
    at,
  });
  return issue;
}

export async function resetSamples(repo: Repo, actor: string, now: Date): Promise<{ farms: number }> {
  const at = now.toISOString();
  await repo.deleteSampleFarmers();
  await seedSamples(repo, at);
  const farmers = await repo.listFarmers();
  const samples = farmers.filter((farmer) => farmer.isSample);
  for (const farmer of samples) {
    await repo.addAudit({
      farmerId: farmer.id,
      actor: staffActor(actor),
      action: "sample_reset",
      entity: "farmer",
      entityId: farmer.id,
      before: null,
      after: { restored: farmer.farmName },
      at,
    });
  }
  return { farms: samples.length };
}

export function staffActor(name: string): string {
  const clean = name.trim() || "staff";
  return clean.startsWith("staff:") ? clean : `staff:${clean}`;
}

async function mustFarmer(repo: Repo, id: number): Promise<Farmer> {
  const farmer = await repo.getFarmer(id);
  if (!farmer) throw new HttpError(404, "farmer not found");
  return farmer;
}

function toNew(farmer: Farmer): NewFarmer {
  return {
    farmName: farmer.farmName,
    contactName: farmer.contactName,
    phone: farmer.phone,
    email: farmer.email,
    preferredContactTimes: farmer.preferredContactTimes,
    preferredContactDays: farmer.preferredContactDays,
    contactMethod: farmer.contactMethod,
    delegateName: farmer.delegateName,
    delegatePhone: farmer.delegatePhone,
    pickupLocation: farmer.pickupLocation,
    pickupAvailability: farmer.pickupAvailability,
    smsConsent: farmer.smsConsent,
    smsConsentAt: farmer.smsConsentAt,
    smsConsentSource: farmer.smsConsentSource,
    assignedStaff: farmer.assignedStaff,
    automationPaused: farmer.automationPaused,
    isSample: farmer.isSample,
    notes: farmer.notes,
  };
}

function farmerSnapshot(farmer: Farmer) {
  return {
    farmName: farmer.farmName,
    contactName: farmer.contactName,
    phone: farmer.phone,
    email: farmer.email,
    preferredContactTimes: farmer.preferredContactTimes,
    preferredContactDays: farmer.preferredContactDays,
    contactMethod: farmer.contactMethod,
    delegateName: farmer.delegateName,
    delegatePhone: farmer.delegatePhone,
    pickupLocation: farmer.pickupLocation,
    pickupAvailability: farmer.pickupAvailability,
    smsConsent: farmer.smsConsent,
    assignedStaff: farmer.assignedStaff,
    notes: farmer.notes,
    automationPaused: farmer.automationPaused,
    isSample: farmer.isSample,
  };
}

function silent(messageId: number, suppressed: NonNullable<InboundResult["suppressed"]>): InboundResult {
  return { deduped: false, replies: [], suppressed, consentRevoked: false, issueCreated: false, messageId };
}

const APPLICATION_STATUSES: ApplicationStatus[] = ["received", "in_review", "approved", "needs_info", "declined"];
const CONTACT_METHODS: ContactMethod[] = ["text", "call", "delegate"];

export function parseContactMethod(value: string): ContactMethod {
  if (CONTACT_METHODS.includes(value as ContactMethod)) return value as ContactMethod;
  throw new HttpError(400, "contact method must be text, call, or delegate");
}

export async function submitApplication(
  repo: Repo,
  input: {
    farmName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    whatYouSell: string;
    fulfillment: string;
    company: string;
  },
  now: Date,
): Promise<{ ok: true; id?: number }> {
  if (input.company.trim()) return { ok: true };
  if (!input.farmName.trim() || !input.contactName.trim() || !input.email.includes("@")) {
    throw new HttpError(400, "farm name, contact name, and email are required");
  }
  const at = now.toISOString();
  const application = await repo.insertApplication({
    farmName: input.farmName.trim(),
    contactName: input.contactName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    whatYouSell: input.whatYouSell.trim(),
    fulfillment: input.fulfillment.trim(),
    status: "received",
    at,
  });
  await queueEmail(repo, thankYouEmail(application), "thank_you", null, application.id, at);
  await queueEmail(repo, statusEmail({ ...application, status: "received" }), "application_received", null, application.id, at);
  return { ok: true, id: application.id };
}

export async function setApplicationStatus(
  repo: Repo,
  id: number,
  status: ApplicationStatus,
  actor: string,
  now: Date,
): Promise<Application> {
  if (!APPLICATION_STATUSES.includes(status)) throw new HttpError(400, "invalid application status");
  const existing = await repo.getApplication(id);
  if (!existing) throw new HttpError(404, "application not found");
  const at = now.toISOString();
  let farmerId = existing.farmerId;
  if (status === "approved" && farmerId == null) {
    const phone = existing.phone || `app-${existing.id}`;
    const farmer = await repo.insertFarmer(
      {
        farmName: existing.farmName,
        contactName: existing.contactName,
        phone,
        email: existing.email,
        preferredContactTimes: "",
        preferredContactDays: "",
        contactMethod: "text",
        delegateName: "",
        delegatePhone: "",
        pickupLocation: existing.city,
        pickupAvailability: existing.fulfillment,
        smsConsent: "none",
        smsConsentAt: null,
        smsConsentSource: null,
        assignedStaff: "",
        automationPaused: false,
        isSample: false,
        notes: existing.whatYouSell,
      },
      at,
    );
    farmerId = farmer.id;
  }
  const updated = await repo.updateApplication(id, { status, farmerId }, at);
  if (existing.status !== status) {
    await queueEmail(repo, statusEmail(updated), `application_${status}`, farmerId, updated.id, at);
  }
  await repo.addAudit({
    farmerId,
    actor: staffActor(actor),
    action: "application_status",
    entity: "application",
    entityId: id,
    before: { status: existing.status },
    after: { status },
    at,
  });
  return updated;
}

export async function issueMagicLink(repo: Repo, farmerId: number, origin: string, now: Date): Promise<{ url: string }> {
  const farmer = await mustFarmer(repo, farmerId);
  if (!farmer.email.includes("@")) throw new HttpError(400, "this farm needs an email before a link can be made");
  const at = now.toISOString();
  const token = newToken();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await repo.createMagicLink(farmer.id, token, expires, at);
  const url = `${origin.replace(/\/$/, "")}/#/farm?token=${token}`;
  await queueEmail(repo, magicLinkEmail({ email: farmer.email, contactName: textTarget(farmer).name, url }), "magic_link", farmer.id, null, at);
  return { url };
}

export async function farmerFromToken(repo: Repo, token: string, now: Date): Promise<Farmer> {
  const link = await repo.findMagicLink(token.trim());
  if (!link || link.expiresAt <= now.toISOString()) throw new HttpError(401, "that link has expired");
  const farmer = await repo.getFarmer(link.farmerId);
  if (!farmer) throw new HttpError(401, "that link has expired");
  return farmer;
}

export async function saveFarmCatalog(
  repo: Repo,
  farmerId: number,
  input: { id?: number; name: string; unit: string; defaultPriceCents: number | null; photoUrl: string },
  now: Date,
): Promise<Product> {
  if (input.photoUrl.length > 150_000) throw new HttpError(400, "that photo is too large");
  const at = now.toISOString();
  const fields = {
    name: input.name.trim(),
    unit: input.unit.trim(),
    defaultPriceCents: input.defaultPriceCents,
    reviewStatus: "needs_verification" as const,
    photoUrl: input.photoUrl.trim(),
    published: false,
  };
  if (!fields.name || !fields.unit) throw new HttpError(400, "product name and unit are required");
  if (input.id) {
    const existing = await repo.getProduct(input.id);
    if (!existing || existing.farmerId !== farmerId) throw new HttpError(404, "product not found");
    const product = await repo.updateProduct(input.id, fields, at);
    await repo.clearSellableForProduct(product.id);
    return product;
  }
  return repo.insertProduct({ ...fields, farmerId }, at);
}

export async function approveCatalog(repo: Repo, id: number, actor: string, now: Date): Promise<Product> {
  const existing = await repo.getProduct(id);
  if (!existing) throw new HttpError(404, "product not found");
  const at = now.toISOString();
  const product = await repo.updateProduct(
    id,
    {
      name: existing.name,
      unit: existing.unit,
      defaultPriceCents: existing.defaultPriceCents,
      reviewStatus: "approved",
      photoUrl: existing.photoUrl,
      published: true,
    },
    at,
  );
  await repo.markConfirmedSellable(product.id);
  await repo.addAudit({
    farmerId: product.farmerId,
    actor: staffActor(actor),
    action: "catalog_approved",
    entity: "product",
    entityId: product.id,
    before: { reviewStatus: existing.reviewStatus, published: existing.published },
    after: { reviewStatus: "approved", published: true },
    at,
  });
  return product;
}

export async function staffDesk(repo: Repo, weekStart: string): Promise<DeskItem[]> {
  const [farmers, conversations, inventory, products, issues, applications, calls] = await Promise.all([
    repo.listFarmers(),
    repo.listConversations(),
    repo.listInventoryByWeek(weekStart),
    repo.listAllProducts(),
    repo.listIssues("open"),
    repo.listApplications(),
    repo.listCalls("open"),
  ]);
  return buildDesk({ farmers, conversations, inventory, products, issues, applications, calls });
}

async function queueEmail(
  repo: Repo,
  email: { to: string; subject: string; body: string },
  kind: string,
  farmerId: number | null,
  applicationId: number | null,
  at: string,
) {
  const delivery = dispatchEmail(email, { enabled: false, sender: disabledEmailSender });
  if (delivery !== "queued") throw new Error("email must stay queued");
  return repo.enqueueEmail({
    toEmail: email.to,
    subject: email.subject,
    body: email.body,
    kind,
    farmerId,
    applicationId,
    at,
  });
}

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function say(repo: Repo, farmerId: number, channel: Channel, body: string, at: string) {
  return repo.insertMessage({
    farmerId,
    direction: "out",
    channel,
    providerMessageId: null,
    body,
    author: "bot",
    createdAt: at,
  });
}
