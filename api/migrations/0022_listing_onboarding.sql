-- Answers from the farm onboarding screens. Nothing here charges a card or sends a message.
-- reach_phone is stored if they type one. It is never sent back to the page.

ALTER TABLE listing_drafts ADD COLUMN reach_via TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN reach_email TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN reach_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN pay_pref TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN pickup_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listing_drafts ADD COLUMN pickup_note TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0;
