-- Stripe test-mode checkout, Connect accounts, and per-farm transfers.
-- Additive only. The D1 id stays out of git.

ALTER TABLE orders ADD COLUMN stripe_checkout_session_id TEXT NOT NULL DEFAULT '';

ALTER TABLE farms ADD COLUMN stripe_charges_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE farms ADD COLUMN stripe_payouts_enabled INTEGER NOT NULL DEFAULT 0;

ALTER TABLE listing_drafts ADD COLUMN stripe_account_id TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN stripe_charges_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listing_drafts ADD COLUMN stripe_payouts_enabled INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS farm_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  order_farm_id INTEGER NOT NULL REFERENCES order_farms(id),
  farm_id INTEGER NOT NULL REFERENCES farms(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_account_id TEXT NOT NULL DEFAULT '',
  stripe_transfer_id TEXT NOT NULL DEFAULT '',
  transfer_group TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  transferred_at TEXT NOT NULL DEFAULT '',
  UNIQUE (order_farm_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_transfers_pending ON farm_transfers (status, stripe_account_id);
