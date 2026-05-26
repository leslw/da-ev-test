import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'earnings.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    access_token  TEXT,
    refresh_token TEXT,
    scope         TEXT,
    expires_at    INTEGER,
    updated_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS driver_profile (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    driver_id       TEXT,
    first_name      TEXT,
    last_name       TEXT,
    rating          REAL,
    city            TEXT,
    activation       TEXT,
    modalities_json TEXT,
    source          TEXT,
    updated_at      INTEGER
  );

  CREATE TABLE IF NOT EXISTS trips (
    id           TEXT PRIMARY KEY,
    city         TEXT,
    category     TEXT,
    fare         REAL,
    net_fare     REAL,
    tip          REAL,
    surge_amount REAL,
    surge_mult   REAL,
    bonus        REAL,
    distance_mi  REAL,
    duration_min REAL,
    start_time   INTEGER,
    end_time     INTEGER,
    source       TEXT
  );

  CREATE TABLE IF NOT EXISTS surge_readings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id     TEXT,
    zone_name   TEXT,
    product     TEXT,
    estimate    REAL,
    baseline    REAL,
    multiplier  REAL,
    surging     INTEGER,
    captured_at INTEGER,
    source      TEXT
  );

  CREATE TABLE IF NOT EXISTS baselines (
    zone_id  TEXT,
    product  TEXT,
    baseline REAL,
    PRIMARY KEY (zone_id, product)
  );

  CREATE TABLE IF NOT EXISTS manual_entries (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    week      TEXT,
    category  TEXT,
    hours     REAL,
    earnings  REAL,
    trips     INTEGER,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT,
    date      TEXT,
    location  TEXT,
    notes     TEXT,
    created_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_trips_start ON trips(start_time);
  CREATE INDEX IF NOT EXISTS idx_trips_category ON trips(category);
  CREATE INDEX IF NOT EXISTS idx_surge_captured ON surge_readings(captured_at);
`);

export default db;
