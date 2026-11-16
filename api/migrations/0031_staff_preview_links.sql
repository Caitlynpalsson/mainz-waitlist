-- One-time staff links for a shopper preview.
-- Only hashes are stored. A code lasts 15 minutes and is spent on first open.

CREATE TABLE staff_preview_codes (
  id INTEGER PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  listing_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE staff_preview_sessions (
  id INTEGER PRIMARY KEY,
  session_hash TEXT NOT NULL UNIQUE,
  listing_token TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
