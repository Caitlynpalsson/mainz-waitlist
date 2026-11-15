-- Batched delivery routes. A run goes out only when it reaches min orders.
-- Existing orders stay. The delivery fee amount is unchanged.

CREATE TABLE delivery_routes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  area_json TEXT NOT NULL DEFAULT '[]',
  delivery_day INTEGER NOT NULL,
  cutoff_day INTEGER NOT NULL,
  cutoff_time TEXT NOT NULL,
  min_orders INTEGER NOT NULL DEFAULT 3,
  target_orders INTEGER NOT NULL DEFAULT 5,
  active INTEGER NOT NULL DEFAULT 1,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE route_runs (
  id INTEGER PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES delivery_routes(id),
  run_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TEXT NOT NULL DEFAULT '',
  order_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (route_id, run_date)
);

CREATE TABLE outbox (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT NOT NULL DEFAULT ''
);

ALTER TABLE orders ADD COLUMN route_id INTEGER;
ALTER TABLE orders ADD COLUMN run_date TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN route_status TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN delivery_fee_state TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN delivery_fee_quoted_cents INTEGER NOT NULL DEFAULT 0;

INSERT INTO delivery_routes (
  name, area_json, delivery_day, cutoff_day, cutoff_time, min_orders, target_orders, active, is_sample
)
SELECT
  'sample provo',
  '["84601","84604","84606","provo"]',
  2, 1, '18:00', 3, 5, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM delivery_routes WHERE lower(name) = 'sample provo');

INSERT INTO delivery_routes (
  name, area_json, delivery_day, cutoff_day, cutoff_time, min_orders, target_orders, active, is_sample
)
SELECT
  'sample spanish fork',
  '["84660","spanish fork"]',
  4, 3, '18:00', 3, 5, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM delivery_routes WHERE lower(name) = 'sample spanish fork');
