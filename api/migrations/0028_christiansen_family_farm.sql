-- Preview only. Christiansen's Family Farm, Fairfield, UT.
-- Public sources checked Nov 15, 2026 (America/Denver). Nothing was sent to the farm.
-- No phone numbers are stored. Status stays sent. This draft is not confirmed or staff-approved.
--
-- Sources:
--   https://christiansenfarm.com/about/
--   https://christiansenfarm.com/contact-schedule/
--   https://christiansenfarm.com/products/
--   https://app.barn2door.com/QO7BQ/all  (the farm's public store; prices read Nov 15, 2026)
-- Individual cut prices are public store prices. Steak uses the New York steak price of $18.95/lb.
-- Beef roast uses the chuck roast price of $8.50/lb. Tallow is $24 per 4 lb tub. Beef bones are $12 per 5 lb bag.
-- Product photos are used only when they are clearly the farm's own photographs.
-- Stock-looking store images (ground beef, short ribs chart, stew meat, bones, bacon, sausage, tallow, pork belly) were left as placeholders.

INSERT INTO listing_drafts (
  token, farm_name, farmer_names, story, location, status, is_sample,
  profile_photo, pickup_line, meet_line, fulfillment_json
)
SELECT
  'lk_093833e486834d99b56ddded0934b77d',
  'Christiansen''s Family Farm',
  'Thomas family',
  'the thomas family has run christiansen''s family farm in fairfield since 2017, raising grass and barley fed beef, berkshire pork, and lamb on 240 acres without hormones or antibiotics, and bringing orders to monthly drop spots along the provo to salt lake stretch.',
  'Fairfield, UT',
  'sent',
  0,
  'profile-christiansens-family-farm',
  'pickup in springville, lindon, lehi, south jordan, and south salt lake, and by appointment in fairfield.',
  'the thomas family raises grass and barley fed beef, berkshire pork, and lamb on 240 acres in fairfield.',
  '{"offersDelivery":false,"options":[{"name":"Springville Meat","address":"268 South 100 West, Springville, UT 84663","zip":"84663","lat":40.16296,"lng":-111.61244,"schedule":"saturday","windows":["9:15-9:30am"],"cutoff":"","feeCents":0,"minimumCents":null},{"name":"Lindon Home Depot","address":"535 S Lindon Park Dr, Lindon, UT 84042","zip":"84042","lat":40.32829,"lng":-111.72953,"schedule":"saturday","windows":["10:00-10:15am"],"cutoff":"","feeCents":0,"minimumCents":null},{"name":"Cabela''s - Lehi","address":"2502 West Cabela''s Blvd, Lehi, UT 84043","zip":"84043","lat":40.43725,"lng":-111.8898,"schedule":"saturday","windows":["10:30-10:45am"],"cutoff":"","feeCents":0,"minimumCents":null},{"name":"Wal-Mart","address":"11328 South Jordan Gateway, South Jordan, UT 84095","zip":"84095","lat":null,"lng":null,"schedule":"saturday","windows":["11:15-11:30am"],"cutoff":"","feeCents":0,"minimumCents":null},{"name":"Intermountain Centre","address":"2179 S 300 W, South Salt Lake, UT 84115","zip":"84115","lat":40.72342,"lng":-111.899706,"schedule":"saturday","windows":["12:00-12:15pm"],"cutoff":"","feeCents":0,"minimumCents":null},{"name":"the farm","address":"59 N 200 E, Fairfield, UT 84013","zip":"84013","lat":40.26152,"lng":-112.08665,"schedule":"by appointment","windows":[],"cutoff":"","feeCents":0,"minimumCents":null}]}'
WHERE NOT EXISTS (SELECT 1 FROM listing_drafts WHERE token = 'lk_093833e486834d99b56ddded0934b77d');

INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'ground beef', 850, 'lb', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 0
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'ground beef'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'steak', 1895, 'lb', 'christiansen-steak', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 1
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'steak'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'beef roast', 850, 'lb', 'christiansen-beef-roast', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 2
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'beef roast'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'short ribs', 699, 'lb', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 3
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'short ribs'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'stew meat', 899, 'lb', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 4
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'stew meat'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'beef bones', 1200, '5 lb bag', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 5
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'beef bones'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'bacon', 950, 'lb', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 6
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'bacon'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'sausage', 600, 'lb', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 7
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'sausage'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'tallow', 2400, 'tub', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 8
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'tallow'
  );
INSERT INTO listing_products (listing_id, name, price_cents, unit, photo_key, source_url, price_status, needs_udaf_check, availability, sort_order)
SELECT id, 'pork belly', 600, 'lb', 'placeholder', 'https://app.barn2door.com/QO7BQ/all', 'public', 0, '', 9
FROM listing_drafts
WHERE token = 'lk_093833e486834d99b56ddded0934b77d'
  AND NOT EXISTS (
    SELECT 1 FROM listing_products p
    WHERE p.listing_id = listing_drafts.id AND p.name = 'pork belly'
  );
