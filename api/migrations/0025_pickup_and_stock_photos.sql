-- Preview only. Pickup facts taken from each farm's own public site on Nov 15, 2026.
-- No phone numbers. Hours are included only when the farm published them.
-- Stock photo keys fill placeholder products where a real, freely licensed photo was found.
-- Eggs, beef roast, and the 87 Farms profile photo are left unchanged for Caty to pick.

-- Gilgen Farm: https://gilgenfarm.com/locations/pick-up
-- Address 492 W 1300 N, American Fork, UT 84003. Pickup times 2:00-5:00 pm.
-- The same page lists the next pickup date as TBA and says there are currently no dates for this location.
UPDATE listing_drafts
SET
  pickup_line = 'pickup in american fork',
  fulfillment_json = '{"offersDelivery":false,"options":[{"name":"the farm","address":"492 W 1300 N, American Fork, UT 84003","zip":"84003","lat":null,"lng":null,"schedule":"2:00-5:00 pm, next date to be announced","windows":[],"cutoff":"","feeCents":0,"minimumCents":null}]}'
WHERE token = 'lk_5d30c605f6c1cc057b739cb90565c1db'
  AND farm_name = 'Gilgen Farm';

-- The Lavender Hive: https://thelavenderhive.com/pages/contact
-- Address 1013 E Erda Way, Erda, UT 84074. No regular shop hours were published.
UPDATE listing_drafts
SET
  pickup_line = 'pickup in erda',
  fulfillment_json = '{"offersDelivery":false,"options":[{"name":"the farm","address":"1013 E Erda Way, Erda, UT 84074","zip":"84074","lat":null,"lng":null,"schedule":"","windows":[],"cutoff":"","feeCents":0,"minimumCents":null}]}'
WHERE token = 'lk_3c2b4539b9a174d2d88c9330dc8dd8fe'
  AND farm_name = 'The Lavender Hive';

-- Shared freely licensed product photos (Pexels). See /workspace/mainz/photo-picks/SOURCES.txt.
-- Only placeholder rows on Mosida Market, Utah Natural Meat, and Keeper of the B.
-- Never overwrites eggs or beef roast.

UPDATE listing_products
SET photo_key = 'stock-ground-beef'
WHERE photo_key = 'placeholder'
  AND name = 'ground beef'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE farm_name IN ('Mosida Market (Bateman''s Mosida Farms)', 'Utah Natural Meat')
  );

UPDATE listing_products
SET photo_key = 'stock-steak'
WHERE photo_key = 'placeholder'
  AND name = 'steak'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE farm_name = 'Utah Natural Meat'
  );

UPDATE listing_products
SET photo_key = 'stock-pork-belly'
WHERE photo_key = 'placeholder'
  AND name = 'pork belly'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE farm_name = 'Utah Natural Meat'
  );

UPDATE listing_products
SET photo_key = 'stock-milk'
WHERE photo_key = 'placeholder'
  AND name = 'milk'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE farm_name = 'Utah Natural Meat'
  );

UPDATE listing_products
SET photo_key = 'stock-butter'
WHERE photo_key = 'placeholder'
  AND name = 'butter'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE farm_name = 'Utah Natural Meat'
  );

UPDATE listing_products
SET photo_key = 'stock-comb-honey'
WHERE photo_key = 'placeholder'
  AND name = 'comb honey'
  AND listing_id IN (
    SELECT id FROM listing_drafts
    WHERE farm_name = 'Keeper of the B'
  );
