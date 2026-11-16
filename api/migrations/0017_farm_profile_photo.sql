-- Optional round profile photo for a farm and for a listing draft.
-- Existing rows stay blank. Only the 87 Farms draft gets a picture.

ALTER TABLE farms ADD COLUMN profile_photo TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN profile_photo TEXT NOT NULL DEFAULT '';

UPDATE listing_drafts
SET profile_photo = 'profile-87-farms'
WHERE token = 'lk_b3f152461550767e5f9c0f5dbf2f6d97';
