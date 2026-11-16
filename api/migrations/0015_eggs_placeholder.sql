-- Eggs used an AI picture. Show the placeholder until there is a real photo.
-- The old file stays in the app folder, but nothing points at it.

UPDATE catalog_foods
SET photo_key = 'placeholder', needs_licensed_photo = 1
WHERE slug = 'eggs' OR photo_key = 'eggs';

UPDATE product_photos
SET photo_key = 'placeholder'
WHERE photo_key = 'eggs';

UPDATE listing_products
SET photo_key = 'placeholder'
WHERE photo_key = 'eggs';

UPDATE farms
SET hero_photo = 'placeholder'
WHERE hero_photo = 'eggs';
