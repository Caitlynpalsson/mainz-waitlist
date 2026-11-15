-- Catalog photo batch 1. Our own pictures, one per food slug.
-- Existing product rows that still say cow keep working.

UPDATE catalog_foods
SET photo_key = slug, needs_licensed_photo = 0
WHERE slug IN (
  'apples',
  'nectarines',
  'apricots',
  'cherries',
  'plums',
  'pluots',
  'pears',
  'asian-pears',
  'raspberries',
  'blackberries',
  'blueberries',
  'grapes',
  'watermelon',
  'cantaloupe',
  'honeydew',
  'cherry-tomatoes',
  'tomatillos',
  'sweet-corn',
  'potatoes',
  'sweet-potatoes',
  'onions',
  'green-onions',
  'garlic',
  'shallots',
  'leeks'
);

UPDATE catalog_foods
SET photo_key = 'milk', needs_licensed_photo = 0
WHERE slug = 'milk';
