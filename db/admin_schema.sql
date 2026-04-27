-- =============================================================
-- ADMIN MODULE — Additional D1 tables
-- Run each block in D1 Console one at a time
-- =============================================================

-- 1. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  performed_by TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- 2. APP SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. UTILITY ALERTS
CREATE TABLE IF NOT EXISTS utility_alerts (
  id         TEXT PRIMARY KEY,
  provider   TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'outage',
  severity   TEXT NOT NULL DEFAULT 'warning',
  title      TEXT NOT NULL,
  areas      TEXT,
  start_dt   TEXT,
  end_dt     TEXT,
  reason     TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  logged_by  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_utility_active ON utility_alerts(is_active);

-- 4. HEAT INDEX LOG
CREATE TABLE IF NOT EXISTS heat_index_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date    TEXT NOT NULL,
  area        TEXT NOT NULL DEFAULT 'Iloilo City',
  heat_index_c REAL NOT NULL,
  level       TEXT NOT NULL DEFAULT 'Extreme Caution',
  source      TEXT DEFAULT 'PAGASA / Admin',
  logged_by   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(log_date, area)
);
CREATE INDEX IF NOT EXISTS idx_heat_date ON heat_index_log(log_date DESC);

-- add updated_at to cmc_meetings if not present
ALTER TABLE cmc_meetings ADD COLUMN updated_at TEXT;
