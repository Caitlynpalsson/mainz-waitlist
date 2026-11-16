-- Optional availability note on a draft product, e.g. "next batch coming".
-- Empty means no note (treated as available). Existing rows stay empty.

ALTER TABLE listing_products ADD COLUMN availability TEXT NOT NULL DEFAULT '';
