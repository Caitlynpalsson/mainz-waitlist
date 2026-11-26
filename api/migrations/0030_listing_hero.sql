-- Optional shopper hero for a listing draft. Empty means use a real product photo.
-- 87 Farms uses the farm's ribeye photo. No phone numbers.

ALTER TABLE listing_drafts ADD COLUMN hero_photo TEXT NOT NULL DEFAULT '';

UPDATE listing_drafts
SET hero_photo = 'ribeye-steak'
WHERE token = 'lk_b3f152461550767e5f9c0f5dbf2f6d97'
   OR profile_photo = 'profile-87-farms'
   OR lower(farm_name) LIKE '%87 farm%'
   OR lower(farm_name) LIKE '%anderson family%';

UPDATE listing_products
SET photo_key = 'ribeye-steak'
WHERE lower(name) LIKE '%steak%'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE token = 'lk_b3f152461550767e5f9c0f5dbf2f6d97'
       OR profile_photo = 'profile-87-farms'
       OR lower(farm_name) LIKE '%87 farm%'
       OR lower(farm_name) LIKE '%anderson family%'
  );
