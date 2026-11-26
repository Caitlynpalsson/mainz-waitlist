-- Rep commission is 3% of a farm's sales, taken from the platform's 10%.
-- No end date. One row per farm on an order. Empty rate still means not set.

INSERT INTO admin_settings (key, value) VALUES ('REP_COMMISSION_PERCENT', '3')
ON CONFLICT(key) DO NOTHING;

CREATE TABLE IF NOT EXISTS rep_ledger (
  id INTEGER PRIMARY KEY,
  rep_id INTEGER NOT NULL,
  farm_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  order_farm_id INTEGER NOT NULL UNIQUE,
  sales_cents INTEGER NOT NULL,
  rate_percent TEXT NOT NULL,
  commission_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rep_ledger_rep ON rep_ledger (rep_id, farm_id);
