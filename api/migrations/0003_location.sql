-- Shopper distances are computed from these town coordinates.
-- Numbers are the Census 2023 place centroids (public domain), with a small
-- offset when two demo farms share a town.
ALTER TABLE farms ADD COLUMN lat REAL;
ALTER TABLE farms ADD COLUMN lng REAL;

UPDATE farms SET lat = 40.11039, lng = -111.64106 WHERE slug = 'willow-creek-farm';
UPDATE farms SET lat = 40.10400, lng = -111.65200 WHERE slug = 'wasatch-dairy';
UPDATE farms SET lat = 40.11876, lng = -111.57425 WHERE slug = 'red-butte-eggs';
UPDATE farms SET lat = 39.96989, lng = -111.79443 WHERE slug = 'east-bench-orchard';
UPDATE farms SET lat = 40.03588, lng = -111.73880 WHERE slug = 'bee-loud-honey-co';
