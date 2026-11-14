import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMessage } from "../src/parser.ts";

test("parses the sample quantity, price, yes, change, stop, and unavailable lines", () => {
  assert.deepEqual(parseMessage("yeah probably 40 boxes"), { type: "quantity", quantity: 40, unit: "box" });
  assert.deepEqual(parseMessage("$6 each"), { type: "price", priceCents: 600 });
  assert.deepEqual(parseMessage("YES"), { type: "yes" });
  assert.deepEqual(parseMessage("yes please"), { type: "yes" });
  assert.deepEqual(parseMessage("CHANGE"), { type: "change" });
  assert.deepEqual(parseMessage("STOP"), { type: "stop" });
  assert.deepEqual(parseMessage("nothing this week"), { type: "unavailable" });
  assert.deepEqual(parseMessage("not available"), { type: "unavailable" });
});

test("does not invent a quantity or a price", () => {
  assert.equal(parseMessage("same as last week").type, "unknown");
  assert.equal(parseMessage("the usual").type, "unknown");
  assert.equal(parseMessage("call me at 5").type, "unknown");
  assert.equal(parseMessage("40 or 50 boxes").type, "unknown");
  assert.equal(parseMessage("$6 or $7").type, "unknown");
  assert.equal(parseMessage("yeah").type, "yes");
  const qty = parseMessage("yeah probably 40 boxes");
  assert.equal(qty.type, "quantity");
  assert.equal("priceCents" in qty, false);
});

test("a stated quantity and price can travel together", () => {
  assert.deepEqual(parseMessage("40 boxes at $6 each"), {
    type: "quantity_price",
    quantity: 40,
    unit: "box",
    priceCents: 600,
  });
});
