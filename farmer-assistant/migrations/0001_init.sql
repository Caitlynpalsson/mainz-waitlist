-- Mainz farmer assistant. Timestamps are UTC ISO-8601 strings.
-- The dashboard renders them in America/Denver.

CREATE TABLE farmers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  preferred_contact_times TEXT NOT NULL DEFAULT '',
  pickup_location TEXT NOT NULL DEFAULT '',
  pickup_availability TEXT NOT NULL DEFAULT '',
  sms_consent TEXT NOT NULL DEFAULT 'none' CHECK (sms_consent IN ('none', 'pending', 'granted', 'revoked')),
  sms_consent_at TEXT,
  sms_consent_source TEXT,
  assigned_staff TEXT NOT NULL DEFAULT '',
  automation_paused INTEGER NOT NULL DEFAULT 0 CHECK (automation_paused IN (0, 1)),
  is_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_sample IN (0, 1)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  default_price_cents INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE market_weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  channel TEXT NOT NULL CHECK (channel IN ('simulator', 'sms')),
  provider_message_id TEXT UNIQUE,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  market_week_id INTEGER NOT NULL REFERENCES market_weeks(id),
  quantity REAL,
  unit TEXT,
  price_cents INTEGER,
  status TEXT NOT NULL CHECK (status IN ('estimate', 'confirmed', 'needs_verification', 'unavailable')),
  source_message_id INTEGER,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (farmer_id, product_id, market_week_id)
);

CREATE TABLE conversations (
  farmer_id INTEGER PRIMARY KEY REFERENCES farmers(id),
  state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN (
    'idle', 'awaiting_availability', 'awaiting_price', 'awaiting_confirm', 'taken_over', 'stopped'
  )),
  product_id INTEGER REFERENCES products(id),
  market_week_id INTEGER REFERENCES market_weeks(id),
  pending_quantity REAL,
  pending_unit TEXT,
  pending_price_cents INTEGER,
  taken_over_by_staff TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  kind TEXT NOT NULL DEFAULT 'needs_verification' CHECK (kind IN ('needs_verification', 'staff')),
  summary TEXT NOT NULL,
  message_id INTEGER,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE TABLE change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_products_farmer ON products(farmer_id);
CREATE INDEX idx_inventory_week ON inventory(market_week_id);
CREATE INDEX idx_messages_farmer ON messages(farmer_id, id);
CREATE INDEX idx_issues_status ON issues(status, id);
CREATE INDEX idx_change_log_farmer ON change_log(farmer_id, id);
