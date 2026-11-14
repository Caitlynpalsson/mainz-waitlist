import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { SAMPLE_FARMS } from "../src/seed.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(readFileSync(join(root, "migrations/0001_init.sql"), "utf8"));
  db.exec(readFileSync(join(root, "migrations/0002_seed.sql"), "utf8"));
  db.exec(readFileSync(join(root, "migrations/0003_desk.sql"), "utf8"));
  return db;
}

test("seed migration matches the sample catalog and dedupes provider ids", () => {
  const db = database();
  const farms = db.prepare("SELECT farm_name FROM farmers WHERE is_sample = 1 ORDER BY phone").all() as Array<{ farm_name: string }>;
  assert.deepEqual(
    farms.map((row) => row.farm_name),
    SAMPLE_FARMS.map((farm) => farm.farmName),
  );
  const berries = db
    .prepare(
      `SELECT p.name, p.default_price_cents FROM products p
       JOIN farmers f ON f.id = p.farmer_id
       WHERE f.farm_name = 'Sample Orchard' AND p.name = 'strawberries'`,
    )
    .get() as { name: string; default_price_cents: number };
  assert.equal(berries.default_price_cents, 600);

  const insert = `INSERT INTO messages (farmer_id, direction, channel, provider_message_id, body, author, created_at)
    VALUES (1, 'in', 'simulator', ?, 'hi', 'farmer', '2026-01-01T00:00:00.000Z')`;
  db.prepare(insert).run("dup");
  assert.throws(() => db.prepare(insert).run("dup"), /UNIQUE/);
  const outbound = `INSERT INTO messages (farmer_id, direction, channel, provider_message_id, body, author, created_at)
    VALUES (1, 'out', 'simulator', NULL, 'bot', 'bot', '2026-01-01T00:00:00.000Z')`;
  db.prepare(outbound).run();
  db.prepare(outbound).run();
  const count = db.prepare("SELECT COUNT(*) AS n FROM messages").get() as { n: number };
  assert.equal(count.n, 3);

  const product = db.prepare("SELECT id FROM products WHERE name = 'strawberries'").get() as { id: number };
  db.prepare("INSERT INTO market_weeks (week_start, created_at) VALUES ('2026-11-16', '2026-01-01T00:00:00.000Z')").run();
  const week = db.prepare("SELECT id FROM market_weeks WHERE week_start = '2026-11-16'").get() as { id: number };
  const insertInventory = `INSERT INTO inventory (
    farmer_id, product_id, market_week_id, quantity, unit, price_cents, status, source_hedged, sellable, updated_by, created_at, updated_at
  ) VALUES (1, ?, ?, 40, 'box', 600, ?, ?, ?, 'bot', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`;
  assert.throws(() => db.prepare(insertInventory).run(product.id, week.id, "estimate", 0, 1), /sellable/);
  assert.throws(() => db.prepare(insertInventory).run(product.id, week.id, "confirmed", 1, 0), /hedged/);
  db.prepare(insertInventory).run(product.id, week.id, "confirmed", 0, 1);
  const sellable = db.prepare("SELECT sellable, status FROM inventory").get() as { sellable: number; status: string };
  assert.equal(sellable.status, "confirmed");
  assert.equal(sellable.sellable, 1);

  assert.throws(
    () =>
      db
        .prepare(
          `INSERT INTO farmers (farm_name, contact_name, phone, sms_consent, created_at, updated_at)
           VALUES ('x', 'y', '555-010-1999', 'bogus', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
        )
        .run(),
    /CHECK/,
  );
});
