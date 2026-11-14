-- Align the tracker with the written approval process.
-- Adds columns and renames stage keys. Does not delete farms, applications, or orders.

ALTER TABLE farms ADD COLUMN stage_entered_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN sample_received_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN review_completed_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN approved_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN live_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN last_weekly_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN last_recheck_at TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN pause_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN remove_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN visited_on TEXT NOT NULL DEFAULT '';
ALTER TABLE farms ADD COLUMN onboarding_json TEXT NOT NULL DEFAULT '{}';

UPDATE farms SET pipeline_stage = 'application_received' WHERE pipeline_stage IN ('new', '');
UPDATE farms SET pipeline_stage = 'quick_screen' WHERE pipeline_stage = 'screening';
UPDATE farms SET pipeline_stage = 'intro_call' WHERE pipeline_stage = 'call';
UPDATE farms SET pipeline_stage = 'documents' WHERE pipeline_stage = 'docs';
UPDATE farms SET pipeline_stage = 'sample_review' WHERE pipeline_stage = 'sample';

UPDATE farm_activity SET from_value = 'application_received' WHERE from_value = 'new';
UPDATE farm_activity SET to_value = 'application_received' WHERE to_value = 'new';
UPDATE farm_activity SET from_value = 'quick_screen' WHERE from_value = 'screening';
UPDATE farm_activity SET to_value = 'quick_screen' WHERE to_value = 'screening';
UPDATE farm_activity SET from_value = 'intro_call' WHERE from_value = 'call';
UPDATE farm_activity SET to_value = 'intro_call' WHERE to_value = 'call';
UPDATE farm_activity SET from_value = 'documents' WHERE from_value = 'docs';
UPDATE farm_activity SET to_value = 'documents' WHERE to_value = 'docs';
UPDATE farm_activity SET from_value = 'sample_review' WHERE from_value = 'sample';
UPDATE farm_activity SET to_value = 'sample_review' WHERE to_value = 'sample';

UPDATE farms SET stage_entered_at = created_at WHERE stage_entered_at = '';

-- Farms already on the site are in ongoing checks. Approval time is the old review time.
UPDATE farms
SET pipeline_stage = 'ongoing',
    approved_at = CASE WHEN approved_at = '' THEN COALESCE(reviewed_at, created_at) ELSE approved_at END,
    live_at = CASE WHEN live_at = '' THEN COALESCE(reviewed_at, created_at) ELSE live_at END
WHERE status = 'approved' AND active = 1;

-- Approved but not live yet: onboarding, not a public storefront.
UPDATE farms
SET pipeline_stage = 'onboarding',
    approved_at = CASE WHEN approved_at = '' THEN COALESCE(reviewed_at, created_at) ELSE approved_at END
WHERE status = 'approved' AND active = 0 AND decision IN ('approve', 'approve_conditions');

ALTER TABLE products ADD COLUMN needs_udaf INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN udaf_on INTEGER NOT NULL DEFAULT 0;

-- Flag raw milk and cottage / Homemade Food Act foods, including honey.
-- Items already on the sample shop stay listed. Anything added after this starts off.
UPDATE products
SET needs_udaf = 1
WHERE food_id IN (
  SELECT id FROM catalog_foods
  WHERE lower(category) = 'honey'
     OR lower(name) LIKE '%raw milk%'
     OR lower(name) IN (
       'bread', 'jam', 'jelly', 'cookies', 'cookie', 'granola', 'pickles', 'salsa',
       'loaf', 'muffin', 'pie', 'dried herbs'
     )
     OR lower(synonyms) LIKE '%raw milk%'
);

UPDATE products SET udaf_on = 1 WHERE needs_udaf = 1 AND active = 1;
