-- Sales reps. The public page never stores or shows a commission percent.
-- REP_COMMISSION_PERCENT is missing until staff set it. Empty means not set.

CREATE TABLE reps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL UNIQUE,
  is_sample INTEGER NOT NULL DEFAULT 0,
  view_token_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

ALTER TABLE farms ADD COLUMN rep_id INTEGER;
ALTER TABLE listing_drafts ADD COLUMN rep_id INTEGER;

CREATE INDEX idx_farms_rep ON farms (rep_id);
CREATE INDEX idx_listing_rep ON listing_drafts (rep_id);

INSERT INTO reps (name, email, phone, code, is_sample)
VALUES ('sample rep', 'sample-rep@example.com', '', 'sample', 1);

UPDATE listing_drafts
SET rep_id = (SELECT id FROM reps WHERE code = 'sample')
WHERE token = 'lk_4c8e91ab7d2f60e3a15b84c0';
