-- Approval desk. Additive only: new columns, new tables, and sample rows.
-- Existing farms, including a real application submitted on the preview, are kept.
-- Approved farms are marked as already decided. Pending farms stay at "new".

ALTER TABLE farms ADD COLUMN pipeline_stage TEXT NOT NULL DEFAULT 'new';
ALTER TABLE farms ADD COLUMN decision TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN decision_note TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN conditions_note TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN score_summary TEXT NOT NULL DEFAULT '';

UPDATE farms
SET pipeline_stage = 'decision', decision = 'approve'
WHERE status = 'approved' AND decision = '';

UPDATE farms
SET pipeline_stage = 'decision', decision = 'decline'
WHERE status IN ('rejected', 'declined') AND decision = '';

CREATE TABLE farm_activity (
  id INTEGER PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id),
  kind TEXT NOT NULL,
  from_value TEXT NOT NULL DEFAULT '',
  to_value TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE farm_scores (
  farm_id INTEGER NOT NULL REFERENCES farms(id),
  standard_key TEXT NOT NULL,
  mark TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (farm_id, standard_key)
);

CREATE TABLE farm_documents (
  farm_id INTEGER NOT NULL REFERENCES farms(id),
  document_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needed',
  note TEXT NOT NULL DEFAULT '',
  expires_on TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (farm_id, document_key)
);

CREATE INDEX idx_activity_farm ON farm_activity (farm_id, id);
CREATE INDEX idx_orders_created ON orders (created_at);

-- Sample applications, one per pipeline stage after "new" (Wasatch Dairy is already new).
INSERT INTO farms (
  slug, name, farmer_names, email, phone, city, state, what_you_sell, sell_now, fulfillment_pref,
  status, active, is_demo, bio, pipeline_stage
)
SELECT 'lot-12-greens', 'Lot 12 Greens', 'noah pell', 'noah@lot12.example', '801-555-0161',
  'Provo', 'UT', 'lettuce, kale', 'farmers market', 'pickup',
  'pending', 0, 1, 'noah pell. salad greens in provo. still in screening.', 'screening'
WHERE NOT EXISTS (SELECT 1 FROM farms WHERE slug = 'lot-12-greens');

INSERT INTO farms (
  slug, name, farmer_names, email, phone, city, state, what_you_sell, sell_now, fulfillment_pref,
  status, active, is_demo, bio, pipeline_stage
)
SELECT 'benchview-orchard', 'Benchview Orchard', 'ida brooks', 'ida@benchview.example', '801-555-0164',
  'Santaquin', 'UT', 'peaches, jam', 'farm stand', 'both',
  'pending', 0, 1, 'ida brooks. peaches and a little jam. call is next.', 'call'
WHERE NOT EXISTS (SELECT 1 FROM farms WHERE slug = 'benchview-orchard');

INSERT INTO farms (
  slug, name, farmer_names, email, phone, city, state, what_you_sell, sell_now, fulfillment_pref,
  status, active, is_demo, bio, pipeline_stage
)
SELECT 'red-hill-eggs', 'Red Hill Eggs', 'ruth hale', 'ruth@redhill.example', '801-555-0168',
  'Mapleton', 'UT', 'eggs', 'farmers market, neighbors', 'pickup',
  'pending', 0, 1, 'ruth hale. eggs only. documents are in progress.', 'docs'
WHERE NOT EXISTS (SELECT 1 FROM farms WHERE slug = 'red-hill-eggs');

INSERT INTO farms (
  slug, name, farmer_names, email, phone, city, state, what_you_sell, sell_now, fulfillment_pref,
  status, active, is_demo, bio, pipeline_stage
)
SELECT 'canyon-beef-co', 'Canyon Beef Co', 'carl diaz', 'carl@canyonbeef.example', '801-555-0172',
  'Spanish Fork', 'UT', 'beef', 'just starting', 'pickup',
  'pending', 0, 1, 'carl diaz. beef by the cut. a sample is in.', 'sample'
WHERE NOT EXISTS (SELECT 1 FROM farms WHERE slug = 'canyon-beef-co');

INSERT INTO farms (
  slug, name, farmer_names, email, phone, city, state, what_you_sell, sell_now, fulfillment_pref,
  status, active, is_demo, bio, pipeline_stage
)
SELECT 'highline-bakery', 'Highline Bakery', 'lena park', 'lena@highline.example', '801-555-0175',
  'Payson', 'UT', 'bread, cookies', 'farmers market', 'both',
  'pending', 0, 1, 'lena park. bread and cookies. waiting on a decision.', 'decision'
WHERE NOT EXISTS (SELECT 1 FROM farms WHERE slug = 'highline-bakery');

INSERT INTO farm_activity (farm_id, kind, from_value, to_value, note, created_at)
SELECT f.id, 'stage', 'new', 'screening', 'read the application. greens look straightforward.', datetime('now', '-6 days')
FROM farms f
WHERE f.slug = 'lot-12-greens'
AND NOT EXISTS (SELECT 1 FROM farm_activity a WHERE a.farm_id = f.id AND a.kind = 'stage' AND a.to_value = 'screening');

INSERT INTO farm_activity (farm_id, kind, from_value, to_value, note, created_at)
SELECT f.id, 'stage', 'screening', 'call', 'call set for thursday.', datetime('now', '-4 days')
FROM farms f
WHERE f.slug = 'benchview-orchard'
AND NOT EXISTS (SELECT 1 FROM farm_activity a WHERE a.farm_id = f.id AND a.kind = 'stage' AND a.to_value = 'call');

INSERT INTO farm_activity (farm_id, kind, from_value, to_value, note, created_at)
SELECT f.id, 'stage', 'call', 'docs', 'egg license is the one to check.', datetime('now', '-3 days')
FROM farms f
WHERE f.slug = 'red-hill-eggs'
AND NOT EXISTS (SELECT 1 FROM farm_activity a WHERE a.farm_id = f.id AND a.kind = 'stage' AND a.to_value = 'docs');

INSERT INTO farm_activity (farm_id, kind, from_value, to_value, note, created_at)
SELECT f.id, 'stage', 'docs', 'sample', 'sample box arrived tuesday.', datetime('now', '-2 days')
FROM farms f
WHERE f.slug = 'canyon-beef-co'
AND NOT EXISTS (SELECT 1 FROM farm_activity a WHERE a.farm_id = f.id AND a.kind = 'stage' AND a.to_value = 'sample');

INSERT INTO farm_activity (farm_id, kind, from_value, to_value, note, created_at)
SELECT f.id, 'stage', 'sample', 'decision', 'ready for a yes or a no.', datetime('now', '-1 days')
FROM farms f
WHERE f.slug = 'highline-bakery'
AND NOT EXISTS (SELECT 1 FROM farm_activity a WHERE a.farm_id = f.id AND a.kind = 'stage' AND a.to_value = 'decision');

INSERT INTO farm_scores (farm_id, standard_key, mark, note)
SELECT f.id, 'quality', 'pass', 'the cuts looked right.'
FROM farms f WHERE f.slug = 'canyon-beef-co'
AND NOT EXISTS (SELECT 1 FROM farm_scores s WHERE s.farm_id = f.id AND s.standard_key = 'quality');

INSERT INTO farm_scores (farm_id, standard_key, mark, note)
SELECT f.id, 'transparency', 'needs_work', 'ask where the animals are finished.'
FROM farms f WHERE f.slug = 'canyon-beef-co'
AND NOT EXISTS (SELECT 1 FROM farm_scores s WHERE s.farm_id = f.id AND s.standard_key = 'transparency');

INSERT INTO farm_scores (farm_id, standard_key, mark, note)
SELECT f.id, 'food_safety', 'pass', 'inspected kitchen on the label.'
FROM farms f WHERE f.slug = 'canyon-beef-co'
AND NOT EXISTS (SELECT 1 FROM farm_scores s WHERE s.farm_id = f.id AND s.standard_key = 'food_safety');

INSERT INTO farm_scores (farm_id, standard_key, mark, note)
SELECT f.id, 'accessibility', 'no', 'pickup is a dirt road with no sign.'
FROM farms f WHERE f.slug = 'canyon-beef-co'
AND NOT EXISTS (SELECT 1 FROM farm_scores s WHERE s.farm_id = f.id AND s.standard_key = 'accessibility');

INSERT INTO farm_documents (farm_id, document_key, status, note, expires_on)
SELECT f.id, 'egg_license', 'received', 'photo of the license is in the email.', '2027-03-01'
FROM farms f WHERE f.slug = 'red-hill-eggs'
AND NOT EXISTS (SELECT 1 FROM farm_documents d WHERE d.farm_id = f.id AND d.document_key = 'egg_license');

INSERT INTO farm_documents (farm_id, document_key, status, note, expires_on)
SELECT f.id, 'sales_tax_license', 'needed', '', ''
FROM farms f WHERE f.slug = 'red-hill-eggs'
AND NOT EXISTS (SELECT 1 FROM farm_documents d WHERE d.farm_id = f.id AND d.document_key = 'sales_tax_license');

-- Test orders so the dashboard totals are not zero. Dates are relative to when this migration runs.
INSERT INTO orders (
  public_id, status, payment_status, customer_name, customer_email, customer_phone, delivery_address,
  merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency, created_at
)
SELECT 'demo_repeat_a', 'placed_test', 'unpaid_test', 'Ada Cole', 'ada@example.com', '801-555-0142',
  '1420 e canyon rd, spanish fork, ut 84660',
  1900, 500, 95, 2495, 'usd', datetime('now', '-2 days')
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE public_id = 'demo_repeat_a');

INSERT INTO order_farms (
  order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents, platform_fee_cents, farm_transfer_cents
)
SELECT o.id, 1, 'delivery', 'wed · 9–11 am', 1900, 500, 95, 1900
FROM orders o
WHERE o.public_id = 'demo_repeat_a'
AND NOT EXISTS (SELECT 1 FROM order_farms ofm WHERE ofm.order_id = o.id);

INSERT INTO order_items (order_farm_id, product_id, food_name, option_label, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 3, 'strawberries', 'pint', 'pint', 2, 600, 1200
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_repeat_a'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id AND i.food_name = 'strawberries');

INSERT INTO order_items (order_farm_id, product_id, food_name, option_label, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 2, 'eggs', '', 'dozen', 1, 700, 700
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_repeat_a'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id AND i.food_name = 'eggs');

INSERT INTO orders (
  public_id, status, payment_status, customer_name, customer_email, customer_phone,
  merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency, created_at
)
SELECT 'demo_repeat_b', 'placed_test', 'unpaid_test', 'Ada Cole', 'ada@example.com', '801-555-0142',
  1400, 0, 70, 1470, 'usd', datetime('now', '-5 days')
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE public_id = 'demo_repeat_b');

INSERT INTO order_farms (
  order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents, platform_fee_cents, farm_transfer_cents
)
SELECT o.id, 4, 'pickup', 'fri · 10 am–4 pm', 1400, 0, 70, 1400
FROM orders o WHERE o.public_id = 'demo_repeat_b'
AND NOT EXISTS (SELECT 1 FROM order_farms ofm WHERE ofm.order_id = o.id);

INSERT INTO order_items (order_farm_id, product_id, food_name, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 11, 'raw honey', '16 oz', 1, 1400, 1400
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_repeat_b'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id);

INSERT INTO orders (
  public_id, status, payment_status, customer_name, customer_email, customer_phone,
  merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency, created_at
)
SELECT 'demo_phone_a', 'placed_test', 'unpaid_test', 'Jo P.', '', '801-555-0177',
  700, 0, 35, 735, 'usd', datetime('now', '-3 days')
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE public_id = 'demo_phone_a');

INSERT INTO order_farms (
  order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents, platform_fee_cents, farm_transfer_cents
)
SELECT o.id, 1, 'pickup', 'sat · 9 am–12 pm', 700, 0, 35, 700
FROM orders o WHERE o.public_id = 'demo_phone_a'
AND NOT EXISTS (SELECT 1 FROM order_farms ofm WHERE ofm.order_id = o.id);

INSERT INTO order_items (order_farm_id, product_id, food_name, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 2, 'eggs', 'dozen', 1, 700, 700
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_phone_a'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id);

INSERT INTO orders (
  public_id, status, payment_status, customer_name, customer_email, customer_phone,
  merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency, created_at
)
SELECT 'demo_phone_b', 'placed_test', 'unpaid_test', 'Jo P.', 'neighbor@example.com', '(801) 555-0177',
  400, 0, 20, 420, 'usd', datetime('now', '-10 days')
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE public_id = 'demo_phone_b');

INSERT INTO order_farms (
  order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents, platform_fee_cents, farm_transfer_cents
)
SELECT o.id, 1, 'pickup', 'sat · 9 am–12 pm', 400, 0, 20, 400
FROM orders o WHERE o.public_id = 'demo_phone_b'
AND NOT EXISTS (SELECT 1 FROM order_farms ofm WHERE ofm.order_id = o.id);

INSERT INTO order_items (order_farm_id, product_id, food_name, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 1, 'carrots', 'bunch', 1, 400, 400
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_phone_b'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id);

INSERT INTO orders (
  public_id, status, payment_status, customer_name, customer_email, customer_phone,
  merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency, created_at
)
SELECT 'demo_month', 'placed_test', 'unpaid_test', 'May Lewis', 'may@example.com', '801-555-0188',
  600, 0, 30, 630, 'usd', datetime('now', '-15 days')
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE public_id = 'demo_month');

INSERT INTO order_farms (
  order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents, platform_fee_cents, farm_transfer_cents
)
SELECT o.id, 1, 'pickup', 'sat · 9 am–12 pm', 600, 0, 30, 600
FROM orders o WHERE o.public_id = 'demo_month'
AND NOT EXISTS (SELECT 1 FROM order_farms ofm WHERE ofm.order_id = o.id);

INSERT INTO order_items (order_farm_id, product_id, food_name, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 3, 'strawberries', 'pint', 1, 600, 600
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_month'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id);

INSERT INTO orders (
  public_id, status, payment_status, customer_name, customer_email, customer_phone, delivery_address,
  merchandise_cents, delivery_fee_cents, platform_fee_cents, total_cents, currency, created_at
)
SELECT 'demo_old', 'placed_test', 'unpaid_test', 'Lee Orth', 'lee@example.com', '801-555-0190',
  '1 old road, payson',
  1400, 500, 70, 1970, 'usd', datetime('now', '-40 days')
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE public_id = 'demo_old');

INSERT INTO order_farms (
  order_id, farm_id, fulfillment, window_label, merchandise_cents, delivery_fee_cents, platform_fee_cents, farm_transfer_cents
)
SELECT o.id, 4, 'delivery', 'wed · 4–6 pm', 1400, 500, 70, 1400
FROM orders o WHERE o.public_id = 'demo_old'
AND NOT EXISTS (SELECT 1 FROM order_farms ofm WHERE ofm.order_id = o.id);

INSERT INTO order_items (order_farm_id, product_id, food_name, unit, quantity, unit_price_cents, line_cents)
SELECT ofm.id, 11, 'raw honey', '16 oz', 1, 1400, 1400
FROM order_farms ofm JOIN orders o ON o.id = ofm.order_id
WHERE o.public_id = 'demo_old'
AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_farm_id = ofm.id);
