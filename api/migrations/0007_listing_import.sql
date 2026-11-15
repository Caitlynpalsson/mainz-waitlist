-- Farmer names and the source link for each product on a draft.
-- Existing drafts stay. New columns start empty.

ALTER TABLE listing_drafts ADD COLUMN farmer_names TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_products ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
