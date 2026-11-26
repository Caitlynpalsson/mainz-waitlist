-- Staff can record a final look on a draft the farm already confirmed.
-- This does not copy the draft into the shop.

ALTER TABLE listing_drafts ADD COLUMN staff_approved_at TEXT NOT NULL DEFAULT '';
