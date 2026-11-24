-- Schema for DONAR Book Drive Tracker SQLite storage
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS drives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  partner_name TEXT NOT NULL DEFAULT '',
  guidance_text TEXT NOT NULL DEFAULT '',
  guidance_url TEXT NOT NULL DEFAULT '',
  goal_accepted_quantity INTEGER,
  destination_description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL REFERENCES drives(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('collection', 'central')),
  receiving_kind TEXT CHECK (receiving_kind IN ('origin', 'location')),
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (drive_id, name)
);

CREATE TABLE IF NOT EXISTS inventory_entries (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL REFERENCES drives(id),
  origin_location_id TEXT NOT NULL REFERENCES locations(id),
  current_location_id TEXT NOT NULL REFERENCES locations(id),
  entry_mode TEXT NOT NULL CHECK (entry_mode IN ('title', 'batch')),
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price REAL,
  condition TEXT NOT NULL,
  reading_level TEXT NOT NULL,
  decision TEXT NOT NULL,
  rejection_reason TEXT NOT NULL DEFAULT '',
  donar_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  parent_entry_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL REFERENCES drives(id),
  shipped_date TEXT NOT NULL,
  destination TEXT NOT NULL,
  tracking_reference TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL REFERENCES drives(id),
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  verified_quantity INTEGER NOT NULL DEFAULT 0,
  shipment_id TEXT REFERENCES shipments(id),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS box_items (
  id TEXT PRIMARY KEY,
  box_id TEXT NOT NULL REFERENCES boxes(id),
  inventory_entry_id TEXT NOT NULL REFERENCES inventory_entries(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS change_events (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL REFERENCES drives(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_values TEXT,
  after_values TEXT,
  actor_id TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
