-- Private draft listings. A farm approves how the page will look.
-- This does not publish a farm. Browse still reads only approved, active farms.
-- Existing rows are left as they are.

CREATE TABLE listing_drafts (
  id INTEGER PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  farm_name TEXT NOT NULL,
  story TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  change_note TEXT NOT NULL DEFAULT '',
  approved_at TEXT NOT NULL DEFAULT '',
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE listing_products (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listing_drafts(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  unit TEXT NOT NULL,
  photo_key TEXT NOT NULL DEFAULT 'placeholder',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_listing_token ON listing_drafts (token);

INSERT INTO listing_drafts (
  token, farm_name, story, location, status, is_sample
)
SELECT
  'lk_4c8e91ab7d2f60e3a15b84c0',
  'Sample Lane Farm',
  'peaches, eggs, and a jar of honey. this farm is made up so you can try the approval link.',
  'sample town, ut',
  'sent',
  1
WHERE NOT EXISTS (SELECT 1 FROM listing_drafts WHERE token = 'lk_4c8e91ab7d2f60e3a15b84c0');

INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, sort_order)
SELECT id, 'peaches', 300, 'lb', 'peach', 0
FROM listing_drafts
WHERE token = 'lk_4c8e91ab7d2f60e3a15b84c0'
AND NOT EXISTS (
  SELECT 1 FROM listing_products p
  JOIN listing_drafts d ON d.id = p.listing_id
  WHERE d.token = 'lk_4c8e91ab7d2f60e3a15b84c0'
);

INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, sort_order)
SELECT d.id, 'eggs', 700, 'dozen', 'eggs', 1
FROM listing_drafts d
WHERE d.token = 'lk_4c8e91ab7d2f60e3a15b84c0'
AND NOT EXISTS (SELECT 1 FROM listing_products p WHERE p.listing_id = d.id AND p.name = 'eggs');

INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, sort_order)
SELECT d.id, 'honey', 1400, 'jar', 'honey', 2
FROM listing_drafts d
WHERE d.token = 'lk_4c8e91ab7d2f60e3a15b84c0'
AND NOT EXISTS (SELECT 1 FROM listing_products p WHERE p.listing_id = d.id AND p.name = 'honey');
