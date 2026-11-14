import assert from "node:assert/strict";
import { test } from "node:test";
import { activeMarketWeekStart } from "../src/time.ts";
import { runScheduled } from "../src/schedule.ts";

test("active market week is next Monday in America/Denver", () => {
  assert.equal(activeMarketWeekStart(new Date("2026-11-14T18:00:00.000Z")), "2026-11-16");
  assert.equal(activeMarketWeekStart(new Date("2026-11-16T02:00:00.000Z")), "2026-11-16");
  assert.equal(activeMarketWeekStart(new Date("2026-11-16T19:00:00.000Z")), "2026-11-23");
});

test("the weekly cron seam is disabled", async () => {
  const result = await runScheduled();
  assert.equal(result.ran, false);
});
