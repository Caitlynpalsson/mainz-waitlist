-- A reversal belongs to one farm transfer. Other farms on the same order stay put.
ALTER TABLE farm_transfers ADD COLUMN stripe_reversal_id TEXT NOT NULL DEFAULT '';
