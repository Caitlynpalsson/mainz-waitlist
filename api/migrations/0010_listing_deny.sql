-- A farm can remove its private listing page.
-- Existing drafts stay. A denial is not a way onto the shop.

ALTER TABLE listing_drafts ADD COLUMN denied_at TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN deny_reason TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS listing_retired_tokens (
  token TEXT PRIMARY KEY,
  retired_at TEXT NOT NULL DEFAULT (datetime('now'))
);
