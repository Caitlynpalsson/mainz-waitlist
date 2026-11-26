-- Optional price status and UDAF check on draft products.
-- Existing rows stay public, with no UDAF check.

ALTER TABLE listing_products ADD COLUMN price_status TEXT NOT NULL DEFAULT 'public';
ALTER TABLE listing_products ADD COLUMN needs_udaf_check INTEGER NOT NULL DEFAULT 0;

-- New catalog foods. Skip any name or slug that is already there.
-- Photos are placeholders until a licensed picture exists.

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'honey', 'honey', 'honey', 'jar', 'wildflower honey, jar honey', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'honey' OR lower(name) = 'honey');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'sourdough-bread', 'sourdough bread', 'bakery', 'each', 'sourdough, sourdough loaf', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'sourdough-bread' OR lower(name) = 'sourdough bread');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'jam', 'jam', 'pantry', 'jar', 'fruit jam, preserves', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'jam' OR lower(name) = 'jam');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'beef-ribs', 'beef ribs', 'meat', 'lb', 'beef rib, ribs', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'beef-ribs' OR lower(name) = 'beef ribs');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'short-ribs', 'short ribs', 'meat', 'lb', 'beef short ribs, short rib', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'short-ribs' OR lower(name) = 'short ribs');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'beef-liver', 'beef liver', 'meat', 'lb', 'liver', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'beef-liver' OR lower(name) = 'beef liver');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'oxtail', 'oxtail', 'meat', 'lb', 'ox tail, oxtails', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'oxtail' OR lower(name) = 'oxtail');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'beef-heart', 'beef heart', 'meat', 'lb', 'heart', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'beef-heart' OR lower(name) = 'beef heart');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'tallow', 'tallow', 'meat', 'jar', 'beef tallow, rendered tallow', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'tallow' OR lower(name) = 'tallow');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'beef-jerky', 'beef jerky', 'meat', 'bag', 'jerky', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'beef-jerky' OR lower(name) = 'beef jerky');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'chicken-drumsticks', 'chicken drumsticks', 'meat', 'lb', 'drumsticks, drumstick', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'chicken-drumsticks' OR lower(name) = 'chicken drumsticks');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'chicken-tenders', 'chicken tenders', 'meat', 'lb', 'tenders, chicken tender', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'chicken-tenders' OR lower(name) = 'chicken tenders');

INSERT INTO catalog_foods (slug, name, category, unit, synonyms, photo_key, needs_licensed_photo)
SELECT 'chicken-wings', 'chicken wings', 'meat', 'lb', 'wings, chicken wing', 'placeholder', 1
WHERE NOT EXISTS (SELECT 1 FROM catalog_foods WHERE slug = 'chicken-wings' OR lower(name) = 'chicken wings');
