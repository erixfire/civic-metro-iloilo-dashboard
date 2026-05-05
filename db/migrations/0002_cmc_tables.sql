-- Migration 0002 — CMC Module + Audit Log + Admin Users
-- Applied: 2026-05-05
-- Run: wrangler d1 migrations apply civic-iloilo-db

-- 1. CMC MEETINGS
CREATE TABLE IF NOT EXISTS cmc_meetings (
  id           TEXT PRIMARY KEY,           -- 'cmc-001', 'cmc-002' ...
  meeting_no   INTEGER NOT NULL,           -- 5, 6, 7 ...
  title        TEXT NOT NULL,              -- 'Fifth CMC Weekly Meeting'
  scheduled_at TEXT NOT NULL,              -- ISO datetime: '2026-04-28T15:00:00'
  venue        TEXT NOT NULL DEFAULT 'CMO Conference Room',
  status       TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | ongoing | concluded
  presided_by  TEXT DEFAULT 'Mayor Raisa P. Treñas',
  agenda       TEXT,                       -- JSON array of strings
  notes        TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cmc_meetings_status ON cmc_meetings(status);
CREATE INDEX IF NOT EXISTS idx_cmc_meetings_date   ON cmc_meetings(scheduled_at);

-- 2. CMC ACTION ITEMS
CREATE TABLE IF NOT EXISTS cmc_action_items (
  id          TEXT PRIMARY KEY,
  meeting_id  TEXT NOT NULL REFERENCES cmc_meetings(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  assigned_to TEXT NOT NULL,               -- 'CSWDO' | 'BFP' | 'CDRRMO' etc.
  due_date    TEXT,                        -- YYYY-MM-DD
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | in-progress | completed | cancelled
  remarks     TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_action_items_meeting  ON cmc_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status   ON cmc_action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON cmc_action_items(assigned_to);

-- 3. CMC DEPARTMENT UPDATES (per meeting per agency)
CREATE TABLE IF NOT EXISTS cmc_dept_updates (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id   TEXT NOT NULL REFERENCES cmc_meetings(id) ON DELETE CASCADE,
  department   TEXT NOT NULL,              -- 'CSWDO' | 'BFP' | 'ENRO' etc.
  update_text  TEXT NOT NULL,
  status_flag  TEXT NOT NULL DEFAULT 'normal', -- normal | advisory | critical
  submitted_by TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(meeting_id, department)
);

CREATE INDEX IF NOT EXISTS idx_dept_updates_meeting ON cmc_dept_updates(meeting_id);

-- 4. AUDIT LOG (used by admin actions)
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_table  ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_date   ON audit_log(created_at);

-- 5. ADMIN USERS (for JWT-based auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,             -- bcrypt hash
  role          TEXT NOT NULL DEFAULT 'operator', -- admin | operator | viewer
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
