-- Warm, honest lines. No phone numbers. No history taken from another farm's site.

-- 87 Farms pickup is already in fulfillment_json: the farm in Huntington,
-- any day by appointment, plus stops in the Salt Lake Valley.
UPDATE listing_drafts
SET pickup_line = 'pickup at the farm in huntington, any day by appointment, and at spots in the salt lake valley.'
WHERE token = 'lk_b3f152461550767e5f9c0f5dbf2f6d97'
   OR profile_photo = 'profile-87-farms'
   OR lower(farm_name) LIKE '%87 farm%'
   OR lower(farm_name) LIKE '%anderson family%';

-- McArthur and Papa Bear's public sites belong to different farms.
-- These lines use only the town and product already in our data.
UPDATE listing_drafts
SET meet_line = 'mcarthur farms in lehi sells tallow. the rest of their story waits until the farm tells it.'
WHERE profile_photo = 'profile-mcarthur-farms'
   OR lower(farm_name) LIKE '%mcarthur%';

UPDATE listing_drafts
SET meet_line = 'papa bear''s honey is in layton. the rest of their story waits until the farm tells it.'
WHERE profile_photo = 'profile-papa-bears-honey'
   OR lower(farm_name) LIKE '%papa bear%';
