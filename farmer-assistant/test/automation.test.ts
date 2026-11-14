import assert from "node:assert/strict";
import { test } from "node:test";
import { textingGate } from "../src/contact.ts";
import { disabledEmailSender, dispatchEmail } from "../src/email.ts";
import { MemoryRepo } from "../src/memory-repo.ts";
import { isHedgedMessage } from "../src/parser.ts";
import { seedSamples } from "../src/seed.ts";
import {
  approveCatalog,
  farmerFromToken,
  handleInbound,
  issueMagicLink,
  saveFarmCatalog,
  setApplicationStatus,
  staffDesk,
  startWeeklyCheck,
  submitApplication,
} from "../src/service.ts";
import { activeMarketWeekStart } from "../src/time.ts";

const when = new Date("2026-11-14T18:00:00.000Z");

async function setup() {
  const repo = new MemoryRepo();
  await seedSamples(repo, "2026-01-01T00:00:00.000Z");
  const farmers = await repo.listFarmers();
  const sarah = farmers.find((farmer) => farmer.farmName === "Sample Orchard");
  if (!sarah) throw new Error("missing sample orchard");
  const berries = (await repo.listProducts(sarah.id)).find((product) => product.name === "strawberries");
  if (!berries) throw new Error("missing strawberries");
  return { repo, sarah, berries };
}

test("hedge words stay an estimate and cannot be stored as confirmed", async () => {
  assert.equal(isHedgedMessage("yeah probably 40 boxes"), true);
  assert.equal(isHedgedMessage("maybe 40"), true);
  assert.equal(isHedgedMessage("about 40 boxes"), true);
  assert.equal(isHedgedMessage("around 40 boxes"), true);
  assert.equal(isHedgedMessage("YES"), false);

  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "probably 40 boxes", providerMessageId: "h1", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "$6 each", providerMessageId: "h2", channel: "simulator" }, when);
  const hedgedYes = await handleInbound(repo, { farmerId: sarah.id, body: "YES probably", providerMessageId: "h3", channel: "simulator" }, when);
  const row = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.notEqual(row.status, "confirmed");
  assert.equal(row.sellable, false);
  assert.doesNotMatch(hedgedYes.replies[0] || "", /^confirmed/);

  const week = await repo.ensureWeek("2026-11-16", when.toISOString());
  await assert.rejects(
    () =>
      repo.saveInventory(
        {
          farmerId: sarah.id,
          productId: berries.id,
          marketWeekId: week.id,
          quantity: 40,
          unit: "box",
          priceCents: 600,
          status: "confirmed",
          sourceHedged: true,
          sourceMessageId: null,
          updatedBy: "bot",
        },
        { actor: "bot", action: "inventory_confirmed", at: when.toISOString() },
      ),
    /hedged/,
  );
});

test("an explicit YES after a hedge can confirm, and only then is it sellable", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "yeah probably 40 boxes", providerMessageId: "y1", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "$6 each", providerMessageId: "y2", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "YES", providerMessageId: "y3", channel: "simulator" }, when);
  const row = (await repo.listInventoryForFarmerWeek(sarah.id, "2026-11-16"))[0];
  assert.equal(row.status, "confirmed");
  assert.equal(row.sourceHedged, false);
  assert.equal(row.sellable, true);
});

test("a call-only farm is not texted and lands on the call list", async () => {
  const { repo, sarah, berries } = await setup();
  const current = await repo.getFarmer(sarah.id);
  if (!current) throw new Error("missing farmer");
  await repo.updateFarmer(sarah.id, { ...current, contactMethod: "call" }, when.toISOString());
  await assert.rejects(() => startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true }), /call/);
  const calls = await repo.listCalls("open");
  assert.equal(calls.length, 1);
  assert.equal((await repo.listMessages(sarah.id)).length, 0);
  const gate = textingGate({ ...current, contactMethod: "call" }, when);
  assert.equal(gate.allowText, false);
  assert.equal(gate.recordCall, true);
});

test("preferred contact days block a text without adding a call", async () => {
  const { repo, sarah, berries } = await setup();
  const current = await repo.getFarmer(sarah.id);
  if (!current) throw new Error("missing farmer");
  await repo.updateFarmer(sarah.id, { ...current, preferredContactDays: "mon" }, when.toISOString());
  await assert.rejects(() => startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true }), /days/);
  assert.equal((await repo.listMessages(sarah.id)).length, 0);
  assert.equal((await repo.listCalls("open")).length, 0);
});

test("a delegate without a phone is a call, and a named delegate is greeted", async () => {
  const { repo, sarah, berries } = await setup();
  const current = await repo.getFarmer(sarah.id);
  if (!current) throw new Error("missing farmer");
  await repo.updateFarmer(sarah.id, { ...current, contactMethod: "delegate", delegateName: "", delegatePhone: "" }, when.toISOString());
  await assert.rejects(() => startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true }), /phone/);
  await repo.updateFarmer(
    sarah.id,
    { ...current, contactMethod: "delegate", delegateName: "Jo (sample)", delegatePhone: "555-010-2222" },
    when.toISOString(),
  );
  const started = await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  assert.match(started.message.body, /^hi jo!/);
});

test("applying queues a thank-you and a received note, and never sends them", async () => {
  const repo = new MemoryRepo();
  const result = await submitApplication(
    repo,
    {
      farmName: "North Bench",
      contactName: "Alex",
      email: "alex@example.com",
      phone: "555-010-1888",
      city: "salt lake city",
      whatYouSell: "peaches",
      fulfillment: "pickup",
      company: "",
    },
    when,
  );
  assert.equal(result.ok, true);
  const emails = await repo.listEmails();
  assert.deepEqual(emails.map((email) => email.kind).sort(), ["application_received", "thank_you"]);
  assert.equal(emails.every((email) => email.status === "queued"), true);
  assert.equal(dispatchEmail({ to: "a@example.com", subject: "x", body: "y" }), "queued");
  await assert.rejects(() => disabledEmailSender.send({ to: "a@example.com", subject: "x", body: "y" }), /disabled/);

  const hidden = await submitApplication(
    repo,
    { farmName: "Bot", contactName: "Bot", email: "bot@example.com", phone: "", city: "", whatYouSell: "", fulfillment: "", company: "filled" },
    when,
  );
  assert.equal(hidden.id, undefined);
  assert.equal((await repo.listEmails()).length, 2);

  const application = (await repo.listApplications())[0];
  await setApplicationStatus(repo, application.id, "in_review", "Caty", when);
  await setApplicationStatus(repo, application.id, "needs_info", "Caty", when);
  await setApplicationStatus(repo, application.id, "declined", "Caty", when);
  const kinds = (await repo.listEmails()).map((email) => email.kind);
  assert.equal(kinds.includes("application_in_review"), true);
  assert.equal(kinds.includes("application_needs_info"), true);
  assert.equal(kinds.includes("application_declined"), true);
});

test("approval emails, a magic link, and catalog changes stay unpublished until staff approve", async () => {
  const repo = new MemoryRepo();
  await submitApplication(
    repo,
    { farmName: "North Bench", contactName: "Alex", email: "alex@example.com", phone: "555-010-1888", city: "", whatYouSell: "", fulfillment: "", company: "" },
    when,
  );
  const application = (await repo.listApplications())[0];
  const approved = await setApplicationStatus(repo, application.id, "approved", "Caty", when);
  assert.ok(approved.farmerId);
  const link = await issueMagicLink(repo, approved.farmerId!, "https://mainz.test", when);
  assert.match(link.url, /#\/farm\?token=/);
  const magic = (await repo.listEmails()).find((email) => email.kind === "magic_link");
  assert.match(magic?.body || "", /#\/farm\?token=/);
  assert.equal(magic?.status, "queued");
  const farmer = await farmerFromToken(repo, link.url.split("token=")[1], when);
  assert.equal(farmer.farmName, "North Bench");

  const product = await saveFarmCatalog(repo, farmer.id, { name: "peaches", unit: "box", defaultPriceCents: 500, photoUrl: "https://example.com/peach.jpg" }, when);
  assert.equal(product.reviewStatus, "needs_verification");
  assert.equal(product.published, false);
  const week = await repo.ensureWeek(activeMarketWeekStart(when), when.toISOString());
  const inventory = await repo.saveInventory(
    {
      farmerId: farmer.id,
      productId: product.id,
      marketWeekId: week.id,
      quantity: 10,
      unit: "box",
      priceCents: 500,
      status: "confirmed",
      sourceHedged: false,
      sourceMessageId: null,
      updatedBy: "staff:Caty",
    },
    { actor: "staff:Caty", action: "inventory_approved", at: when.toISOString() },
  );
  assert.equal(inventory.sellable, false);
  await approveCatalog(repo, product.id, "Caty", when);
  const after = await repo.getInventoryById(inventory.id);
  assert.equal(after?.sellable, true);
});

test("the desk hides routine confirmed work and keeps exceptions", async () => {
  const { repo, sarah, berries } = await setup();
  await startWeeklyCheck(repo, sarah.id, berries.id, when, { simulator: true });
  await handleInbound(repo, { farmerId: sarah.id, body: "40 boxes", providerMessageId: "d1", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "$6", providerMessageId: "d2", channel: "simulator" }, when);
  await handleInbound(repo, { farmerId: sarah.id, body: "YES", providerMessageId: "d3", channel: "simulator" }, when);
  let desk = await staffDesk(repo, "2026-11-16");
  assert.equal(desk.some((item) => item.kind === "missing_reply"), false);
  assert.equal(desk.some((item) => item.title.includes("strawberries") && item.kind === "needs_verification"), false);

  await handleInbound(repo, { farmerId: sarah.id, body: "the truck broke", providerMessageId: "d4", channel: "simulator" }, when);
  const honey = (await repo.listFarmers()).find((farmer) => farmer.farmName === "Sample Honey Co");
  if (!honey) throw new Error("missing honey");
  await repo.updateFarmer(honey.id, { ...honey, contactMethod: "call" }, when.toISOString());
  await submitApplication(
    repo,
    { farmName: "Waiting Farm", contactName: "Pat", email: "pat@example.com", phone: "555-010-1777", city: "", whatYouSell: "", fulfillment: "", company: "" },
    when,
  );
  desk = await staffDesk(repo, "2026-11-16");
  const kinds = desk.map((item) => item.kind);
  assert.equal(kinds.includes("issue"), true);
  assert.equal(kinds.includes("call"), true);
  assert.equal(kinds.includes("application"), true);
  assert.equal(desk.some((item) => item.detail.includes("confirmed")), false);
  assert.ok(desk[0].urgency <= desk[desk.length - 1].urgency);
});
