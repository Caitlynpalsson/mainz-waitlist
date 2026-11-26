-- Portal extras. No new pay rate. Shopper sign-ups are counted only.
-- A blank paid_at means the commission is still pending.

ALTER TABLE rep_ledger ADD COLUMN paid_at TEXT NOT NULL DEFAULT '';
ALTER TABLE reps ADD COLUMN leaderboard_opt_out INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reps ADD COLUMN weekly_goal INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rep_shoppers (
  id INTEGER PRIMARY KEY,
  rep_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rep_shoppers_rep ON rep_shoppers (rep_id);

INSERT INTO rep_shoppers (rep_id, name, email, is_sample)
SELECT id, 'sample shopper', 'sample-shopper@example.com', 1 FROM reps WHERE code = 'sample';
