-- A farm can suggest a different price on a draft listing.
-- Existing drafts stay. This does not publish the listing.

CREATE TABLE IF NOT EXISTS listing_price_fixes (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listing_drafts(id),
  product_id INTEGER,
  product_name TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
