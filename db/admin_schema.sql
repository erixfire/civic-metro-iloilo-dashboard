-- =============================================================
-- CIVIC METRO ILOILO DASHBOARD — Full D1 Schema
-- Run each CREATE block in the Cloudflare D1 Console
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  action       TEXT NOT NULL,
  table_name   TEXT,
  record_id    TEXT,
  performed_by TEXT,
  details      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL,
  description TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS utility_alerts (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'outage', severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL, areas TEXT, start_dt TEXT, end_dt TEXT,
  reason TEXT, is_active INTEGER NOT NULL DEFAULT 1,
  logged_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_utility_active ON utility_alerts(is_active);

CREATE TABLE IF NOT EXISTS heat_index_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date TEXT NOT NULL, area TEXT NOT NULL DEFAULT 'Iloilo City',
  heat_index_c REAL NOT NULL, level TEXT NOT NULL DEFAULT 'Extreme Caution',
  source TEXT DEFAULT 'PAGASA / Admin', logged_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(log_date, area)
);
CREATE INDEX IF NOT EXISTS idx_heat_date ON heat_index_log(log_date DESC);

CREATE TABLE IF NOT EXISTS kitchen_sites (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, barangay TEXT NOT NULL,
  district TEXT, address TEXT, capacity INTEGER,
  contact_person TEXT, contact_no TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  full_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_users_active   ON admin_users(is_active);

-- Phase 7: Web Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  keys       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

-- =============================================================
-- FIRST USER BOOTSTRAP
-- Only works when admin_users is empty (no auth required).
-- POST /api/auth/create-user
-- Body: { "username": "admin", "password": "YourPassword123!",
--         "role": "admin", "full_name": "Your Name" }
-- =============================================================

-- VAPID KEYS (run once in terminal, add to Cloudflare Pages env vars)
-- npx web-push generate-vapid-keys
-- VAPID_PUBLIC_KEY=<from above>
-- VAPID_PRIVATE_KEY=<from above>
-- VAPID_SUBJECT=mailto:it@iloilocity.gov.ph
-- JWT_SECRET=<long random string>
