import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryRepo } from "../src/memory-repo.ts";
import { seedSamples } from "../src/seed.ts";
import {
  approveInventory,
  handleInbound,
  resetSamples,
  setAutomationPaused,
  setTakeover,
  staffReply,
  startWeeklyCheck,
} from "../src/service.ts";
import type { Repo } from "../src/repo.ts";

const when = new Date("2026-11-14T18:00:00.000Z");

async function setup() {
  const repo = new MemoryRepo();
  await seedSamples(repo, "2026-01-01T00:00:00.000Z");
  const farmers = await repo.listFarmers();
  const sarah = farmers.find((farmer) => farmer.farmName === "Sample Orchard");
  if (!sarah) throw new Error("missing sample orchard");
  const products = await repo.listProducts(sarah.id);
  const berries = products.find((product) => product.name === "strawberries");
  if (!berries) throw new Error("missing strawberries");
  return { repo, sarah, berries };
}

async function outbound(repo: Repo, farmerId: number) {
  return (await repo.listMessages(farmerId)).filter((message) => message.direction === "out").map((message) => message.body);
}

test("full example flow confirms 40 boxes at $6 for the farm, product, and week", async () => {
  const { repo, sarah, berries } = await setup();
  assert.equal(berries.defaultPriceCents, 600);

  const started = await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  assert.equal(started.weekStart, "2026-11-16");
  assert.equal(
    started.message.body,
    "hi sarah! this is mainz's automated assistant. are your strawberries available for next week's mainz market?",
  );
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);

  await handleInbound(repo, { farmerId: sarah.id, body: "yeah probably 40 boxes", providerMessageId: "m1", channel: "simulator" }, when);
  const estimate = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.equal(estimate.status, "estimate");
  assert.equal(estimate.quantity, 40);
  assert.equal(estimate.unit, "box");
  assert.equal(estimate.priceCents, null);
  assert.equal(estimate.farmerId, sarah.id);
  assert.equal(estimate.productId, berries.id);

  await handleInbound(repo, { farmerId: sarah.id, body: "$6 each", providerMessageId: "m2", channel: "simulator" }, when);
  const priced = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.equal(priced.status, "estimate");
  assert.equal(priced.priceCents, 600);

  await handleInbound(repo, { farmerId: sarah.id, body: "YES", providerMessageId: "m3", channel: "simulator" }, when);
  const confirmed = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.quantity, 40);
  assert.equal(confirmed.unit, "box");
  assert.equal(confirmed.priceCents, 600);
  assert.equal(confirmed.weekStart, "2026-11-16");

  assert.deepEqual(await outbound(repo, sarah.id), [
    "hi sarah! this is mainz's automated assistant. are your strawberries available for next week's mainz market?",
    "great! should i mark 40 boxes as an estimate? what price?",
    "please confirm: 40 boxes at $6 each for next week. reply YES to publish or CHANGE to edit.",
    "confirmed. 40 boxes at $6 each for next week.",
  ]);
});

test("a repeated provider_message_id does not apply twice", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  const first = await handleInbound(
    repo,
    { farmerId: sarah.id, body: "yeah probably 40 boxes", providerMessageId: "same", channel: "simulator" },
    when,
  );
  const second = await handleInbound(
    repo,
    { farmerId: sarah.id, body: "999 boxes", providerMessageId: "same", channel: "simulator" },
    when,
  );
  assert.equal(first.deduped, false);
  assert.equal(second.deduped, true);
  const rows = await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity, 40);
  const inbound = (await repo.listMessages(sarah.id)).filter((message) => message.direction === "in");
  assert.equal(inbound.length, 1);
});

test("STOP revokes consent and the bot sends nothing further", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  const stopped = await handleInbound(repo, { farmerId: sarah.id, body: "STOP", providerMessageId: "stop-1", channel: "simulator" }, when);
  assert.equal(stopped.consentRevoked, true);
  assert.match(stopped.replies[0], /won't get more messages/);
  const farmer = await repo.getFarmer(sarah.id);
  assert.equal(farmer?.smsConsent, "revoked");
  assert.equal((await repo.getConversation(sarah.id)).state, "stopped");

  const later = await handleInbound(
    repo,
    { farmerId: sarah.id, body: "yeah probably 40 boxes", providerMessageId: "stop-2", channel: "simulator" },
    when,
  );
  assert.deepEqual(later.replies, []);
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);
  assert.equal((await outbound(repo, sarah.id)).length, 2);
});

test("an unknown message becomes an issue and never a confirmed row", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  const result = await handleInbound(
    repo,
    { farmerId: sarah.id, body: "same as last week", providerMessageId: "u1", channel: "simulator" },
    when,
  );
  assert.equal(result.issueCreated, true);
  assert.match(result.replies[0], /someone from mainz will follow up/);
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);
  const issues = await repo.listIssues("open");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, "needs_verification");

  await handleInbound(repo, { farmerId: sarah.id, body: "YES", providerMessageId: "u2", channel: "simulator" }, when);
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);
});

test("paused automation stores the text and does not change inventory", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await setAutomationPaused(repo, sarah.id, true, "Caty", when);
  const result = await handleInbound(
    repo,
    { farmerId: sarah.id, body: "yeah probably 40 boxes", providerMessageId: "p1", channel: "simulator" },
    when,
  );
  assert.equal(result.suppressed, "paused");
  assert.deepEqual(result.replies, []);
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);
  assert.equal((await repo.listMessages(sarah.id)).some((message) => message.body === "yeah probably 40 boxes"), true);
  await assert.rejects(() => startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true }), /paused/);
});

test("staff takeover keeps the bot silent until staff reply", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await setTakeover(repo, sarah.id, true, "Caty", when);
  const result = await handleInbound(
    repo,
    { farmerId: sarah.id, body: "yeah probably 40 boxes", providerMessageId: "t1", channel: "simulator" },
    when,
  );
  assert.equal(result.suppressed, "takeover");
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);
  const reply = await staffReply(repo, sarah.id, "i'll call you this afternoon", "Caty", when);
  assert.equal(reply.author, "staff:Caty");
  assert.equal(reply.direction, "out");
  const again = await handleInbound(repo, { farmerId: sarah.id, body: "YES", providerMessageId: "t2", channel: "simulator" }, when);
  assert.deepEqual(again.replies, []);
  assert.equal((await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16")).length, 0);
});

test("STOP during takeover revokes consent without a bot reply", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await setTakeover(repo, sarah.id, true, "Caty", when);
  const result = await handleInbound(repo, { farmerId: sarah.id, body: "STOP", providerMessageId: "t-stop", channel: "simulator" }, when);
  assert.equal(result.consentRevoked, true);
  assert.deepEqual(result.replies, []);
  assert.equal((await repo.getFarmer(sarah.id))?.smsConsent, "revoked");
});

test("CHANGE then YES does not publish the old estimate", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "40 boxes", providerMessageId: "c1", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "$6 each", providerMessageId: "c2", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "CHANGE", providerMessageId: "c3", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "YES", providerMessageId: "c4", channel: "simulator" }, when);
  const row = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.equal(row.status, "estimate");
  assert.notEqual(row.status, "confirmed");
});

test("not available marks the product unavailable", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "not available", providerMessageId: "n1", channel: "simulator" }, when);
  const row = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.equal(row.status, "unavailable");
  assert.equal(row.quantity, null);
  assert.equal(row.priceCents, null);
});

test("staff can approve an estimate and cannot approve a row with no price", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "40 boxes", providerMessageId: "a1", channel: "simulator" }, when);
  const missingPrice = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  await assert.rejects(() => approveInventory(repo, missingPrice.id, "Caty", when), /price/);
  await handleInbound(repo, { farmerId: sarah.id, body: "$6 each", providerMessageId: "a2", channel: "simulator" }, when);
  const priced = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  const approved = await approveInventory(repo, priced.id, "Caty", when);
  assert.equal(approved.status, "confirmed");
  assert.equal(approved.updatedBy, "staff:Caty");
  const audit = await repo.listAudit(sarah.id);
  assert.equal(audit.some((entry) => entry.action === "inventory_approved"), true);
});

test("reset restores sample farms and leaves a real farm alone", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "STOP", providerMessageId: "r1", channel: "simulator" }, when);
  const real = await repo.insertFarmer(
    {
      farmName: "North Bench",
      contactName: "Alex",
      phone: "555-010-1999",
      email: "",
      preferredContactTimes: "",
      pickupLocation: "",
      pickupAvailability: "",
      smsConsent: "none",
      smsConsentAt: null,
      smsConsentSource: null,
      assignedStaff: "",
      automationPaused: false,
      isSample: false,
      notes: "",
    },
    when.toISOString(),
  );
  const result = await resetSamples(repo, "Caty", when);
  assert.equal(result.farms, 5);
  const farmers = await repo.listFarmers();
  assert.equal(farmers.some((farmer) => farmer.id === real.id && farmer.farmName === "North Bench"), true);
  const restored = farmers.find((farmer) => farmer.farmName === "Sample Orchard");
  assert.equal(restored?.smsConsent, "granted");
  assert.equal(restored?.isSample, true);
  assert.notEqual(restored?.id, sarah.id);
  assert.equal((await repo.listMessages(restored!.id)).length, 0);
});
