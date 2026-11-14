-- Additive. Existing rows keep their data.
-- Call-only farms are not texted. Unconfirmed inventory cannot be sellable.

ALTER TABLE farmers ADD COLUMN contact_method TEXT NOT NULL DEFAULT 'text' CHECK (contact_method IN ('text', 'call', 'delegate'));
ALTER TABLE farmers ADD COLUMN delegate_name TEXT NOT NULL DEFAULT '';
ALTER TABLE farmers ADD COLUMN delegate_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE farmers ADD COLUMN preferred_contact_days TEXT NOT NULL DEFAULT '';

ALTER TABLE products ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('approved', 'needs_verification'));
ALTER TABLE products ADD COLUMN photo_url TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1));

ALTER TABLE inventory ADD COLUMN source_hedged INTEGER NOT NULL DEFAULT 0 CHECK (source_hedged IN (0, 1));
ALTER TABLE inventory ADD COLUMN sellable INTEGER NOT NULL DEFAULT 0 CHECK (sellable IN (0, 1));

UPDATE inventory
SET sellable = 1
WHERE status = 'confirmed'
  AND source_hedged = 0
  AND product_id IN (
    SELECT id FROM products WHERE published = 1 AND review_status = 'approved'
  );

CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  what_you_sell TEXT NOT NULL DEFAULT '',
  fulfillment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_review', 'approved', 'needs_info', 'declined')),
  farmer_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL,
  farmer_id INTEGER,
  application_id INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE staff_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  completed_by TEXT
);

CREATE INDEX idx_applications_status ON applications(status, id);
CREATE INDEX idx_email_outbox_created ON email_outbox(id);
CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_staff_calls_status ON staff_calls(status, id);

-- Nothing unconfirmed, hedged, or unapproved can be marked sellable.
CREATE TRIGGER inventory_sellable_insert
BEFORE INSERT ON inventory
FOR EACH ROW
WHEN NEW.sellable = 1 AND NOT (
  NEW.status = 'confirmed'
  AND NEW.source_hedged = 0
  AND (SELECT published FROM products WHERE id = NEW.product_id) = 1
  AND (SELECT review_status FROM products WHERE id = NEW.product_id) = 'approved'
)
BEGIN
  SELECT RAISE(ABORT, 'only confirmed approved inventory can be sellable');
END;

CREATE TRIGGER inventory_sellable_update
BEFORE UPDATE ON inventory
FOR EACH ROW
WHEN NEW.sellable = 1 AND NOT (
  NEW.status = 'confirmed'
  AND NEW.source_hedged = 0
  AND (SELECT published FROM products WHERE id = NEW.product_id) = 1
  AND (SELECT review_status FROM products WHERE id = NEW.product_id) = 'approved'
)
BEGIN
  SELECT RAISE(ABORT, 'only confirmed approved inventory can be sellable');
END;

-- A hedged message can never become a confirmed row.
CREATE TRIGGER inventory_hedge_insert
BEFORE INSERT ON inventory
FOR EACH ROW
WHEN NEW.status = 'confirmed' AND NEW.source_hedged = 1
BEGIN
  SELECT RAISE(ABORT, 'a hedged message cannot confirm inventory');
END;

CREATE TRIGGER inventory_hedge_update
BEFORE UPDATE ON inventory
FOR EACH ROW
WHEN NEW.status = 'confirmed' AND NEW.source_hedged = 1
BEGIN
  SELECT RAISE(ABORT, 'a hedged message cannot confirm inventory');
END;
