-- =============================================================
-- ADMIN SEED — App Settings defaults
-- =============================================================
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
  ('kitchen_daily_family_target',     '500',        'Daily target families for community kitchen'),
  ('kitchen_daily_individual_target', '2000',       'Daily target individuals for community kitchen'),
  ('fuel_update_schedule',            'weekly',     'How often fuel prices are updated'),
  ('incident_retention_days',         '90',         'Days to retain resolved incidents'),
  ('dashboard_city_name',             'Iloilo City','City name shown on dashboard header'),
  ('heat_index_alert_threshold_c',    '42',         'Heat index °C threshold to trigger advisory banner'),
  ('cmc_meeting_venue_default',       'CMO Conference Room, City Hall', 'Default venue for CMC meetings');
