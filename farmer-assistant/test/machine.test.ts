import assert from "node:assert/strict";
import { test } from "node:test";
import { step, type MachineInput } from "../src/machine.ts";
import { parseMessage } from "../src/parser.ts";

const opening = {
  state: "awaiting_availability" as const,
  productName: "strawberries",
  productUnit: "box",
  pendingQuantity: null,
  pendingUnit: null,
  pendingPriceCents: null,
};

function run(extra: Partial<MachineInput>, text: string) {
  return step({ ...opening, ...extra, parsed: parseMessage(text), rawText: text });
}

test("the example flow stays an estimate until an explicit YES", () => {
  const quantity = run({}, "yeah probably 40 boxes");
  assert.equal(quantity.state, "awaiting_price");
  assert.equal(quantity.inventory?.status, "estimate");
  assert.equal(quantity.inventory?.quantity, 40);
  assert.equal(quantity.inventory?.priceCents, null);
  assert.equal(quantity.replies[0], "great! should i mark 40 boxes as an estimate? what price?");

  const price = run(
    {
      state: "awaiting_price",
      pendingQuantity: 40,
      pendingUnit: "box",
    },
    "$6 each",
  );
  assert.equal(price.state, "awaiting_confirm");
  assert.equal(price.inventory?.status, "estimate");
  assert.equal(price.inventory?.priceCents, 600);
  assert.equal(
    price.replies[0],
    "please confirm: 40 boxes at $6 each for next week. reply YES to publish or CHANGE to edit.",
  );

  const confirmed = run(
    {
      state: "awaiting_confirm",
      pendingQuantity: 40,
      pendingUnit: "box",
      pendingPriceCents: 600,
    },
    "YES",
  );
  assert.equal(confirmed.state, "idle");
  assert.equal(confirmed.inventory?.status, "confirmed");
  assert.equal(confirmed.inventory?.quantity, 40);
  assert.equal(confirmed.inventory?.priceCents, 600);
});

test("YES without a price does not confirm", () => {
  const result = run({ state: "awaiting_price", pendingQuantity: 40, pendingUnit: "box" }, "YES");
  assert.equal(result.inventory, null);
  assert.equal(result.state, "awaiting_price");
  assert.match(result.replies[0], /price/);
});

test("CHANGE asks again and does not confirm", () => {
  const result = run(
    { state: "awaiting_confirm", pendingQuantity: 40, pendingUnit: "box", pendingPriceCents: 600 },
    "CHANGE",
  );
  assert.equal(result.inventory, null);
  assert.equal(result.state, "awaiting_availability");
  assert.equal(result.pendingQuantity, null);
  assert.match(result.replies[0], /start over/);
});

test("nothing this week marks the product unavailable", () => {
  const result = run({}, "nothing this week");
  assert.equal(result.inventory?.status, "unavailable");
  assert.equal(result.inventory?.quantity, null);
  assert.equal(result.state, "idle");
});

test("an unknown line becomes a needs-verification issue and does not save a number", () => {
  const result = run({}, "same as last week");
  assert.equal(result.inventory, null);
  assert.match(result.issueSummary || "", /needs verification/);
  assert.match(result.replies[0], /follow up/);
});

test("STOP revokes consent and does not confirm inventory", () => {
  const result = run(
    { state: "awaiting_confirm", pendingQuantity: 40, pendingUnit: "box", pendingPriceCents: 600 },
    "STOP",
  );
  assert.equal(result.revokeConsent, true);
  assert.equal(result.state, "stopped");
  assert.equal(result.inventory, null);
  assert.deepEqual(result.replies, []);
});
