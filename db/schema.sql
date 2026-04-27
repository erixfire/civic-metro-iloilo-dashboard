-- =============================================================
-- Civic Metro Iloilo Dashboard — D1 Database Schema
-- =============================================================
-- Run this to initialise all tables:
--   wrangler d1 execute civic-iloilo-db --file=db/schema.sql
--
-- Tables:
--   1. kitchen_sites          — community kitchen station registry
--   2. kitchen_feeding_log    — daily feeding totals per program day
--   3. kitchen_site_log       — per-site per-day breakdown
--   4. kitchen_programs       — program periods / campaigns
--   5. incidents              — CDRRMO incident reports
--   6. utility_alerts         — MORE Power / MIWD / utility notices
--   7. fuel_prices            — manual LPCC/DOE fuel price log
--   8. heat_index_log         — daily PAGASA heat index readings
--   9. app_settings           — key-value store for operator config
-- =============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- -------------------------------------------------------------
-- 1. KITCHEN SITES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_sites (
  id          TEXT PRIMARY KEY,           -- e.g. 'ck1'
  name        TEXT NOT NULL,
  barangay    TEXT NOT NULL,
  address     TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = closed
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------
-- 2. KITCHEN PROGRAMS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_programs (
  id                      TEXT PRIMARY KEY,
  program_name            TEXT NOT NULL,
  start_date              TEXT NOT NULL,   -- ISO date YYYY-MM-DD
  end_date                TEXT NOT NULL,
  daily_family_target     INTEGER NOT NULL DEFAULT 500,
  daily_individual_target INTEGER NOT NULL DEFAULT 2000,
  funding_source          TEXT,
  is_active               INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------
-- 3. KITCHEN FEEDING LOG  (daily aggregate totals)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_feeding_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id   TEXT NOT NULL REFERENCES kitchen_programs(id) ON DELETE CASCADE,
  log_date     TEXT NOT NULL,              -- YYYY-MM-DD
  families     INTEGER NOT NULL DEFAULT 0,
  individuals  INTEGER NOT NULL DEFAULT 0,
  sites_active INTEGER NOT NULL DEFAULT 0,
  meals        TEXT NOT NULL DEFAULT 'Lunch & Merienda',
  remarks      TEXT,
  logged_by    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(program_id, log_date)             -- one record per day per program
);

CREATE INDEX IF NOT EXISTS idx_kitchen_log_date     ON kitchen_feeding_log(log_date);
CREATE INDEX IF NOT EXISTS idx_kitchen_log_program  ON kitchen_feeding_log(program_id);

-- -------------------------------------------------------------
-- 4. KITCHEN SITE LOG  (per-site per-day breakdown)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_site_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id       INTEGER NOT NULL REFERENCES kitchen_feeding_log(id) ON DELETE CASCADE,
  site_id      TEXT NOT NULL REFERENCES kitchen_sites(id),
  families     INTEGER NOT NULL DEFAULT 0,
  individuals  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(log_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_site_log_log_id  ON kitchen_site_log(log_id);
CREATE INDEX IF NOT EXISTS idx_site_log_site_id ON kitchen_site_log(site_id);

-- -------------------------------------------------------------
-- 5. INCIDENTS  (CDRRMO incident reports)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id           TEXT PRIMARY KEY,           -- 'inc-<timestamp>'
  type         TEXT NOT NULL,              -- flood | fire | traffic | medical | power | landslide | crime | other
  severity     TEXT NOT NULL DEFAULT 'moderate',  -- low | moderate | high
  status       TEXT NOT NULL DEFAULT 'active',    -- active | resolved
  district     TEXT NOT NULL,
  address      TEXT,
  description  TEXT NOT NULL,
  reporter     TEXT,
  lat          REAL,
  lng          REAL,
  reported_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_status    ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_district  ON incidents(district);
CREATE INDEX IF NOT EXISTS idx_incidents_type      ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_reported  ON incidents(reported_at);

-- -------------------------------------------------------------
-- 6. UTILITY ALERTS  (MORE Power / MIWD / utility notices)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utility_alerts (
  id           TEXT PRIMARY KEY,           -- 'ua-<timestamp>'
  type         TEXT NOT NULL,              -- power | water | gas | telecom
  provider     TEXT NOT NULL,              -- MORE Power | MIWD | etc.
  severity     TEXT NOT NULL DEFAULT 'info',  -- info | warning | critical
  title        TEXT NOT NULL,
  areas        TEXT NOT NULL,              -- JSON array: ["La Paz", "Jaro"]
  alert_date   TEXT NOT NULL,              -- YYYY-MM-DD
  time_from    TEXT,                       -- HH:MM
  time_to      TEXT,                       -- HH:MM
  reason       TEXT,
  contact_no   TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_utility_alerts_date     ON utility_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_utility_alerts_severity ON utility_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_utility_alerts_active   ON utility_alerts(is_active);

-- -------------------------------------------------------------
-- 7. FUEL PRICES  (manual LPCC / DOE monitoring log)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_prices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  as_of        TEXT NOT NULL,              -- YYYY-MM-DD
  -- Iloilo local prices
  iloilo_gasoline_avg  REAL,
  iloilo_gasoline_min  REAL,
  iloilo_gasoline_max  REAL,
  iloilo_diesel_avg    REAL,
  iloilo_diesel_min    REAL,
  iloilo_diesel_max    REAL,
  iloilo_kerosene_avg  REAL,
  iloilo_kerosene_min  REAL,
  iloilo_kerosene_max  REAL,
  -- DOE national benchmark
  ph_gasoline_avg      REAL,
  ph_diesel_avg        REAL,
  source               TEXT DEFAULT 'LPCC/DOE Manual',
  logged_by            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(as_of)
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_date ON fuel_prices(as_of);

-- -------------------------------------------------------------
-- 8. HEAT INDEX LOG  (daily PAGASA readings)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS heat_index_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date      TEXT NOT NULL,             -- YYYY-MM-DD
  area          TEXT NOT NULL,             -- e.g. 'Iloilo City', 'Dumangas'
  heat_index_c  REAL NOT NULL,             -- degrees Celsius
  level         TEXT NOT NULL,             -- Normal | Caution | Extreme Caution | Danger | Extreme Danger
  source        TEXT DEFAULT 'PAGASA',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(log_date, area)
);

CREATE INDEX IF NOT EXISTS idx_heat_index_date ON heat_index_log(log_date);
CREATE INDEX IF NOT EXISTS idx_heat_index_area ON heat_index_log(area);

-- -------------------------------------------------------------
-- 9. APP SETTINGS  (operator key-value config store)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default settings
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
  ('kitchen_daily_family_target',     '500',   'Daily family serving target for community kitchen'),
  ('kitchen_daily_individual_target', '2000',  'Daily individual serving target for community kitchen'),
  ('fuel_update_schedule',            'weekly','How often fuel prices are updated'),
  ('incident_retention_days',         '90',    'How many days to keep resolved incidents'),
  ('dashboard_city_name',             'Iloilo City', 'City name shown on dashboard');
