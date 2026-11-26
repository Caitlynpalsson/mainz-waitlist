-- Sample eggs are year-round, so the eggs filter on the home page can show them.
-- The placeholder photo stays.

UPDATE products
SET in_season = 1
WHERE id IN (2, 9);
