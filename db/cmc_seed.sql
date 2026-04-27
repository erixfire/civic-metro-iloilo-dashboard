-- =============================================================
-- CMC SEED — 5th CMC Weekly Meeting (April 28, 2026)
-- Run in D1 Console
-- =============================================================

-- Seed the 5th meeting
INSERT OR IGNORE INTO cmc_meetings
  (id, meeting_no, title, scheduled_at, venue, status, presided_by, agenda)
VALUES (
  'cmc-005',
  5,
  'Fifth CMC Weekly Meeting',
  '2026-04-28T15:00:00',
  'CMO Conference Room',
  'scheduled',
  'Mayor Jerry P. Treñas',
  '["Updates from previous meeting agreements","Community Kitchen Feeding Program status","Heat index response measures","Incident reports from CDRRMO & BFP","Utility advisories from MORE Power & MIWD","Other matters"]'
);

-- Seed sample action items from 4th meeting
INSERT OR IGNORE INTO cmc_action_items (id, meeting_id, task, assigned_to, due_date, status) VALUES
  ('ai-001', 'cmc-005', 'Submit updated community kitchen site reports', 'CSWDO', '2026-04-28', 'pending'),
  ('ai-002', 'cmc-005', 'Provide heat index public advisory for Jaro & La Paz', 'ENRO', '2026-04-28', 'done'),
  ('ai-003', 'cmc-005', 'Coordinate fire prevention inspection in City Proper', 'BFP', '2026-04-30', 'in-progress'),
  ('ai-004', 'cmc-005', 'Submit list of unsafe structures flagged this week', 'OBO', '2026-04-28', 'pending'),
  ('ai-005', 'cmc-005', 'Deploy water tankers to Molo & Arevalo during MIWD shutdown', 'DASMO', '2026-04-27', 'done'),
  ('ai-006', 'cmc-005', 'Provide crime incident summary for April 14–27', 'ICPO', '2026-04-28', 'pending'),
  ('ai-007', 'cmc-005', 'Coordinate social media heat advisory posts', 'PIO', '2026-04-25', 'done'),
  ('ai-008', 'cmc-005', 'Review DRRMF fund utilization for kitchen program', 'OBO IloIlo City Gov', '2026-04-30', 'pending');
