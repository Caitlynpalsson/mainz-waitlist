-- A mock flag that the farm finished the payout stand-in.
-- No bank account or routing number is stored.

ALTER TABLE listing_drafts ADD COLUMN payout_connected INTEGER NOT NULL DEFAULT 0;
