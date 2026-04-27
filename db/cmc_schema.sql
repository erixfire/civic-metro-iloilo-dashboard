-- =============================================================
-- CMC MODULE — Crisis Management Council
-- Run in D1 Console one block at a time
-- =============================================================

-- 1. CMC MEETINGS
CREATE TABLE IF NOT EXISTS cmc_meetings (
  id          TEXT PRIMARY KEY,          -- 'cmc-001', 'cmc-002' ...
  meeting_no  INTEGER NOT NULL,          -- 5, 6, 7 ...
  title       TEXT NOT NULL,             -- 'Fifth CMC Weekly Meeting'
  scheduled_at TEXT NOT NULL,            -- ISO datetime: '2026-04-28T15:00:00'
  venue       TEXT NOT NULL DEFAULT 'CMO Conference Room',
  status      TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | ongoing | concluded
  presided_by TEXT DEFAULT 'Mayor',
  agenda      TEXT,                      -- free text or JSON array
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. CMC ACTION ITEMS
CREATE TABLE IF NOT EXISTS cmc_action_items (
  id          TEXT PRIMARY KEY,
  meeting_id  TEXT NOT NULL REFERENCES cmc_meetings(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  assigned_to TEXT NOT NULL,             -- 'CSWDO' | 'BFP' | 'CDRRMO' etc.
  due_date    TEXT,                      -- YYYY-MM-DD
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | in-progress | done | overdue
  remarks     TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_action_items_meeting  ON cmc_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status   ON cmc_action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON cmc_action_items(assigned_to);

-- 3. CMC DEPARTMENT UPDATES (per meeting per agency)
CREATE TABLE IF NOT EXISTS cmc_dept_updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id  TEXT NOT NULL REFERENCES cmc_meetings(id) ON DELETE CASCADE,
  department  TEXT NOT NULL,             -- 'CSWDO' | 'BFP' | 'ENRO' etc.
  update_text TEXT NOT NULL,
  status_flag TEXT NOT NULL DEFAULT 'normal', -- normal | advisory | critical
  submitted_by TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(meeting_id, department)
);

CREATE INDEX IF NOT EXISTS idx_dept_updates_meeting ON cmc_dept_updates(meeting_id);
