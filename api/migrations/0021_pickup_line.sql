-- Optional replacement for the one pickup line on a farm page.
-- Empty means the line is generated from the pickup options.

ALTER TABLE farms ADD COLUMN pickup_line TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN pickup_line TEXT NOT NULL DEFAULT '';
