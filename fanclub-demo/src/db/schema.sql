-- Demo database for the Fanclub Ticketing Bridge.
-- One SQLite file, two logical upstreams:
--   membership_tiers, members  -> served by the mock Membership API
--   everything else            -> served by the mock Ticket Vendor Partner API
-- Money is stored in integer minor units (cents) and converted to decimals on the wire.
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS price_levels;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS membership_tiers;
-- ───────────── Membership API ─────────────
CREATE TABLE membership_tiers (
  tier_id               TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  level                 INTEGER NOT NULL,
  max_tickets_per_order INTEGER,          -- NULL -> bridge falls back to its default (8)
  presale_access        INTEGER           -- 0 / 1 / NULL
);
CREATE TABLE members (
  membership_id TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status        TEXT NOT NULL CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED','PENDING')),
  tier_id       TEXT NOT NULL REFERENCES membership_tiers(tier_id),
  member_since  TEXT NOT NULL,
  renews_at     TEXT,
  display_name  TEXT
);
-- ───────────── Ticket Vendor Partner API ─────────────
CREATE TABLE venues (
  venue_id TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  city     TEXT NOT NULL,
  country  TEXT NOT NULL
);
CREATE TABLE events (
  event_id     TEXT PRIMARY KEY,
  event_name   TEXT NOT NULL,
  starts_at    TEXT NOT NULL,
  venue_id     TEXT NOT NULL REFERENCES venues(venue_id),
  currency     TEXT NOT NULL DEFAULT 'USD',
  last_updated TEXT NOT NULL
);
CREATE TABLE price_levels (
  price_level_id TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL REFERENCES events(event_id),
  name           TEXT NOT NULL,
  face_cents     INTEGER NOT NULL,
  fees_cents     INTEGER NOT NULL
);
CREATE TABLE seats (
  seat_id           TEXT PRIMARY KEY,
  event_id          TEXT NOT NULL REFERENCES events(event_id),
  section           TEXT NOT NULL,
  row_label         TEXT NOT NULL,
  seat_number       TEXT NOT NULL,
  price_level_id    TEXT NOT NULL REFERENCES price_levels(price_level_id),
  status            TEXT NOT NULL CHECK (status IN ('AVAILABLE','HELD','SOLD','UNAVAILABLE')),
  attributes        TEXT,                 -- JSON array, e.g. ["AISLE","ADA"]
  general_admission INTEGER NOT NULL DEFAULT 0,
  held_by_cart_id   TEXT                  -- set while a partner cart holds the seat
);
CREATE INDEX idx_seats_event ON seats(event_id);
CREATE INDEX idx_seats_cart  ON seats(held_by_cart_id);
CREATE TABLE carts (
  cart_id           TEXT PRIMARY KEY,
  event_id          TEXT NOT NULL REFERENCES events(event_id),
  membership_id     TEXT NOT NULL,
  partner_id        TEXT NOT NULL,
  partner_reference TEXT,
  status            TEXT NOT NULL CHECK (status IN ('OPEN','BILLING_ATTACHED','COMMITTED','EXPIRED','CANCELLED')),
  hold_expires_at   TEXT NOT NULL,
  idempotency_key   TEXT UNIQUE,
  billing_json      TEXT,
  created_at        TEXT NOT NULL
);
CREATE TABLE cart_items (
  cart_id     TEXT NOT NULL REFERENCES carts(cart_id),
  seat_id     TEXT NOT NULL REFERENCES seats(seat_id),
  price_cents INTEGER NOT NULL,
  fees_cents  INTEGER NOT NULL,
  PRIMARY KEY (cart_id, seat_id)
);
CREATE TABLE orders (
  order_id        TEXT PRIMARY KEY,
  cart_id         TEXT NOT NULL UNIQUE REFERENCES carts(cart_id),
  event_id        TEXT NOT NULL REFERENCES events(event_id),
  membership_id   TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('CONFIRMED','PENDING','FAILED')),
  total_cents     INTEGER NOT NULL,
  idempotency_key TEXT UNIQUE,
  purchased_at    TEXT NOT NULL
);
CREATE TABLE tickets (
  ticket_id                 TEXT PRIMARY KEY,
  order_id                  TEXT NOT NULL REFERENCES orders(order_id),
  event_id                  TEXT NOT NULL REFERENCES events(event_id),
  seat_id                   TEXT NOT NULL REFERENCES seats(seat_id),
  membership_id             TEXT NOT NULL,
  holder_name               TEXT NOT NULL,
  entry_gate                TEXT,
  barcode_type              TEXT NOT NULL CHECK (barcode_type IN ('ROTATING','STATIC')),
  barcode_format            TEXT NOT NULL CHECK (barcode_format IN ('QR','PDF417')),
  barcode_secret            TEXT,         -- ROTATING only
  barcode_value             TEXT,         -- STATIC only
  rotation_interval_seconds INTEGER       -- ROTATING only; NULL -> bridge's BARCODE_ROTATION_SECONDS
);