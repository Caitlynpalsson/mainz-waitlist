-- Optional words a farm adds when they take their page down.
-- The one-tap reason stays in deny_reason. This note is only for "other".

ALTER TABLE listing_drafts ADD COLUMN deny_note TEXT NOT NULL DEFAULT '';
