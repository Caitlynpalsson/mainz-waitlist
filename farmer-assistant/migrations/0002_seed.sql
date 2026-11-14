-- Sample farms for the in-dashboard simulator. Not real farms or people.
-- Keep this list aligned with SAMPLE_FARMS in src/seed.ts.

INSERT INTO farmers (
  farm_name, contact_name, phone, email, preferred_contact_times, pickup_location,
  pickup_availability, sms_consent, sms_consent_at, sms_consent_source, assigned_staff,
  automation_paused, is_sample, notes, created_at, updated_at
) VALUES
  (
    'Sample Orchard', 'Sarah (sample)', '555-010-1001', 'sarah.sample@example.com',
    'weekday mornings', 'sample dock A', 'thu 8-11am', 'granted',
    '2026-01-01T00:00:00.000Z', 'sample seed', '', 0, 1,
    'sample farm for the simulator. not a real farm.',
    '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'Sample Honey Co', 'Sam (sample)', '555-010-1002', 'sam.sample@example.com',
    'afternoons', 'sample dock B', 'thu 8-11am', 'granted',
    '2026-01-01T00:00:00.000Z', 'sample seed', '', 0, 1,
    'sample farm for the simulator. not a real farm.',
    '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'Sample Greens', 'Sky (sample)', '555-010-1003', 'sky.sample@example.com',
    'evenings', 'sample stall 3', 'fri 7-10am', 'granted',
    '2026-01-01T00:00:00.000Z', 'sample seed', '', 0, 1,
    'sample farm for the simulator. not a real farm.',
    '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'Sample Dairy', 'Drew (sample)', '555-010-1004', 'drew.sample@example.com',
    'mornings', 'sample cooler 1', 'thu 6-9am', 'granted',
    '2026-01-01T00:00:00.000Z', 'sample seed', '', 0, 1,
    'sample farm for the simulator. not a real farm.',
    '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'Sample Grain', 'Quinn (sample)', '555-010-1005', 'quinn.sample@example.com',
    'midday', 'sample dock C', 'fri 9am-12pm', 'granted',
    '2026-01-01T00:00:00.000Z', 'sample seed', '', 0, 1,
    'sample farm for the simulator. not a real farm.',
    '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  );

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'strawberries', 'box', 600, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1001';

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'peaches', 'box', 500, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1001';

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'honey', 'jar', 1400, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1002';

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'greens', 'bag', 500, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1003';

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'milk', 'gallon', 800, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1004';

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'eggs', 'dozen', 700, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1004';

INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at)
SELECT id, 'flour', 'bag', 900, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM farmers WHERE phone = '555-010-1005';
