-- Mainz marketplace, phase 1.
-- Payments are not collected yet. Amount columns are in US cents so Stripe Connect
-- can plug in later: transfer farm_transfer_cents to the farm's Express account,
-- and keep platform_fee_cents plus delivery_fee_cents on the Mainz platform account.
-- One shopper checkout can hold several order_farms rows (one sub-order per farm).

CREATE TABLE catalog_foods (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  synonyms TEXT NOT NULL DEFAULT '',
  photo_key TEXT NOT NULL DEFAULT 'placeholder',
  needs_licensed_photo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE catalog_varieties (
  id INTEGER PRIMARY KEY,
  food_id INTEGER NOT NULL REFERENCES catalog_foods(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE farms (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  farmer_names TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'UT',
  zip TEXT NOT NULL DEFAULT '',
  since_year INTEGER,
  stat_value TEXT NOT NULL DEFAULT '',
  stat_label TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  about TEXT NOT NULL DEFAULT '',
  miles_away REAL,
  hero_photo TEXT NOT NULL DEFAULT 'placeholder',
  card_foods TEXT NOT NULL DEFAULT '',
  offers_pickup INTEGER NOT NULL DEFAULT 0,
  offers_delivery INTEGER NOT NULL DEFAULT 0,
  pickup_summary TEXT NOT NULL DEFAULT '',
  delivery_summary TEXT NOT NULL DEFAULT '',
  pickup_days TEXT NOT NULL DEFAULT '',
  delivery_days TEXT NOT NULL DEFAULT '',
  pickup_address TEXT NOT NULL DEFAULT '',
  pickup_spot TEXT NOT NULL DEFAULT '',
  windows_json TEXT NOT NULL DEFAULT '{"pickup":[],"delivery":[]}',
  status TEXT NOT NULL DEFAULT 'pending',
  active INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  access_token TEXT,
  what_you_sell TEXT NOT NULL DEFAULT '',
  sell_now TEXT NOT NULL DEFAULT '',
  fulfillment_pref TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  stripe_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id),
  food_id INTEGER NOT NULL REFERENCES catalog_foods(id),
  headline TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  dek TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  unit TEXT NOT NULL,
  price_setter TEXT NOT NULL DEFAULT '',
  grown_note TEXT NOT NULL DEFAULT '',
  picked_label TEXT NOT NULL DEFAULT '',
  stock_qty INTEGER NOT NULL DEFAULT 0,
  in_season INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 100,
  shop_order INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (farm_id, food_id)
);

CREATE TABLE product_options (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  unit TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_photos (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  is_stock INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'placed_test',
  payment_status TEXT NOT NULL DEFAULT 'unpaid_test',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  delivery_address TEXT NOT NULL DEFAULT '',
  merchandise_cents INTEGER NOT NULL,
  delivery_fee_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  stripe_transfer_group TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_farms (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  farm_id INTEGER NOT NULL REFERENCES farms(id),
  fulfillment TEXT NOT NULL,
  window_label TEXT NOT NULL DEFAULT '',
  merchandise_cents INTEGER NOT NULL,
  delivery_fee_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  farm_transfer_cents INTEGER NOT NULL,
  stripe_account_id TEXT
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_farm_id INTEGER NOT NULL REFERENCES order_farms(id),
  product_id INTEGER,
  option_id INTEGER,
  food_name TEXT NOT NULL,
  option_label TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_cents INTEGER NOT NULL
);

CREATE INDEX idx_farms_public ON farms (status, active);
CREATE INDEX idx_products_farm ON products (farm_id, active);
CREATE INDEX idx_products_food ON products (food_id);
CREATE INDEX idx_options_product ON product_options (product_id);
CREATE INDEX idx_photos_product ON product_photos (product_id, sort_order);
CREATE INDEX idx_varieties_food ON catalog_varieties (food_id);
CREATE INDEX idx_order_farms_order ON order_farms (order_id);
CREATE INDEX idx_order_items_group ON order_items (order_farm_id);
