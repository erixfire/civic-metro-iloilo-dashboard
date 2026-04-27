-- Migration 0001 — Initial schema
-- Applied: 2026-04-27
-- Run: wrangler d1 migrations apply civic-iloilo-db

CREATE TABLE IF NOT EXISTS kitchen_sites (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  barangay    TEXT NOT NULL,
  address     TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kitchen_programs (
  id                      TEXT PRIMARY KEY,
  program_name            TEXT NOT NULL,
  start_date              TEXT NOT NULL,
  end_date                TEXT NOT NULL,
  daily_family_target     INTEGER NOT NULL DEFAULT 500,
  daily_individual_target INTEGER NOT NULL DEFAULT 2000,
  funding_source          TEXT,
  is_active               INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kitchen_feeding_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id   TEXT NOT NULL REFERENCES kitchen_programs(id) ON DELETE CASCADE,
  log_date     TEXT NOT NULL,
  families     INTEGER NOT NULL DEFAULT 0,
  individuals  INTEGER NOT NULL DEFAULT 0,
  sites_active INTEGER NOT NULL DEFAULT 0,
  meals        TEXT NOT NULL DEFAULT 'Lunch & Merienda',
  remarks      TEXT,
  logged_by    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(program_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_log_date    ON kitchen_feeding_log(log_date);
CREATE INDEX IF NOT EXISTS idx_kitchen_log_program ON kitchen_feeding_log(program_id);

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

CREATE TABLE IF NOT EXISTS incidents (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'moderate',
  status       TEXT NOT NULL DEFAULT 'active',
  district     TEXT NOT NULL,
  address      TEXT,
  description  TEXT NOT NULL,
  reporter     TEXT,
  lat          REAL,
  lng          REAL,
  reported_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_district ON incidents(district);
CREATE INDEX IF NOT EXISTS idx_incidents_type     ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_reported ON incidents(reported_at);

CREATE TABLE IF NOT EXISTS utility_alerts (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  provider     TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'info',
  title        TEXT NOT NULL,
  areas        TEXT NOT NULL,
  alert_date   TEXT NOT NULL,
  time_from    TEXT,
  time_to      TEXT,
  reason       TEXT,
  contact_no   TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_utility_alerts_date     ON utility_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_utility_alerts_severity ON utility_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_utility_alerts_active   ON utility_alerts(is_active);

CREATE TABLE IF NOT EXISTS fuel_prices (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  as_of                TEXT NOT NULL,
  iloilo_gasoline_avg  REAL,
  iloilo_gasoline_min  REAL,
  iloilo_gasoline_max  REAL,
  iloilo_diesel_avg    REAL,
  iloilo_diesel_min    REAL,
  iloilo_diesel_max    REAL,
  iloilo_kerosene_avg  REAL,
  iloilo_kerosene_min  REAL,
  iloilo_kerosene_max  REAL,
  ph_gasoline_avg      REAL,
  ph_diesel_avg        REAL,
  source               TEXT DEFAULT 'LPCC/DOE Manual',
  logged_by            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(as_of)
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_date ON fuel_prices(as_of);

CREATE TABLE IF NOT EXISTS heat_index_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date      TEXT NOT NULL,
  area          TEXT NOT NULL,
  heat_index_c  REAL NOT NULL,
  level         TEXT NOT NULL,
  source        TEXT DEFAULT 'PAGASA',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(log_date, area)
);

CREATE INDEX IF NOT EXISTS idx_heat_index_date ON heat_index_log(log_date);
CREATE INDEX IF NOT EXISTS idx_heat_index_area ON heat_index_log(area);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
  ('kitchen_daily_family_target',     '500',         'Daily family serving target'),
  ('kitchen_daily_individual_target', '2000',        'Daily individual serving target'),
  ('fuel_update_schedule',            'weekly',      'Fuel price update frequency'),
  ('incident_retention_days',         '90',          'Days to keep resolved incidents'),
  ('dashboard_city_name',             'Iloilo City', 'City name on dashboard');
