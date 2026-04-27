-- =============================================================
-- Civic Metro Iloilo Dashboard — D1 Seed Data
-- =============================================================
-- Run AFTER schema.sql:
--   wrangler d1 execute civic-iloilo-db --file=db/seed.sql
-- =============================================================

-- -------------------------------------------------------------
-- Kitchen Sites
-- -------------------------------------------------------------
INSERT OR IGNORE INTO kitchen_sites (id, name, barangay, address) VALUES
  ('ck1', 'Jaro Evacuation Center',   'Jaro',        'Jaro Sports Complex, Iloilo City'),
  ('ck2', 'La Paz Community Kitchen', 'La Paz',       'La Paz Covered Court, La Paz'),
  ('ck3', 'Molo Feeding Station',     'Molo',         'Molo Plaza Grounds, Molo'),
  ('ck4', 'City Proper Feeding Hub',  'City Proper',  'CSWDO Main Office, Gen. Luna St.'),
  ('ck5', 'Mandurriao Mobile Kitchen','Mandurriao',   'Mandurriao Barangay Hall'),
  ('ck6', 'Arevalo Coastal Kitchen',  'Arevalo',      'Arevalo Gym, Arevalo');

-- -------------------------------------------------------------
-- Active Kitchen Program
-- -------------------------------------------------------------
INSERT OR IGNORE INTO kitchen_programs
  (id, program_name, start_date, end_date, daily_family_target, daily_individual_target, funding_source)
VALUES (
  'prog-2026-heat',
  'CSWDO Community Kitchen Feeding Program — Heat & Calamity Response 2026',
  '2026-04-14',
  '2026-05-14',
  500,
  2000,
  'City Government of Iloilo — DRRMF & CSWDO Budget'
);

-- -------------------------------------------------------------
-- 14-Day Feeding Log
-- -------------------------------------------------------------
INSERT OR IGNORE INTO kitchen_feeding_log
  (program_id, log_date, families, individuals, sites_active, meals) VALUES
  ('prog-2026-heat', '2026-04-14', 312,  1248, 4, 'Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-15', 298,  1192, 4, 'Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-16', 335,  1340, 5, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-17', 341,  1364, 5, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-18', 289,  1156, 4, 'Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-19', 301,  1204, 4, 'Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-20', 360,  1440, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-21', 375,  1500, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-22', 390,  1560, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-23', 402,  1608, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-24', 415,  1660, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-25', 428,  1712, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-26', 440,  1760, 6, 'Breakfast, Lunch & Merienda'),
  ('prog-2026-heat', '2026-04-27', 455,  1820, 6, 'Breakfast, Lunch & Merienda');

-- -------------------------------------------------------------
-- Today's Per-Site Breakdown  (April 27 log_id = last insert)
-- We use a subquery to find the log row for Apr 27
-- -------------------------------------------------------------
INSERT OR IGNORE INTO kitchen_site_log (log_id, site_id, families, individuals)
SELECT kfl.id, 'ck1', 95,  380 FROM kitchen_feeding_log kfl WHERE kfl.log_date = '2026-04-27' AND kfl.program_id = 'prog-2026-heat';
INSERT OR IGNORE INTO kitchen_site_log (log_id, site_id, families, individuals)
SELECT kfl.id, 'ck2', 82,  328 FROM kitchen_feeding_log kfl WHERE kfl.log_date = '2026-04-27' AND kfl.program_id = 'prog-2026-heat';
INSERT OR IGNORE INTO kitchen_site_log (log_id, site_id, families, individuals)
SELECT kfl.id, 'ck3', 70,  280 FROM kitchen_feeding_log kfl WHERE kfl.log_date = '2026-04-27' AND kfl.program_id = 'prog-2026-heat';
INSERT OR IGNORE INTO kitchen_site_log (log_id, site_id, families, individuals)
SELECT kfl.id, 'ck4', 88,  352 FROM kitchen_feeding_log kfl WHERE kfl.log_date = '2026-04-27' AND kfl.program_id = 'prog-2026-heat';
INSERT OR IGNORE INTO kitchen_site_log (log_id, site_id, families, individuals)
SELECT kfl.id, 'ck5', 65,  260 FROM kitchen_feeding_log kfl WHERE kfl.log_date = '2026-04-27' AND kfl.program_id = 'prog-2026-heat';
INSERT OR IGNORE INTO kitchen_site_log (log_id, site_id, families, individuals)
SELECT kfl.id, 'ck6', 55,  220 FROM kitchen_feeding_log kfl WHERE kfl.log_date = '2026-04-27' AND kfl.program_id = 'prog-2026-heat';

-- -------------------------------------------------------------
-- Current Utility Alerts
-- -------------------------------------------------------------
INSERT OR IGNORE INTO utility_alerts
  (id, type, provider, severity, title, areas, alert_date, time_from, time_to, reason, contact_no) VALUES
  ('ua1', 'power', 'MORE Power', 'warning',
   'Scheduled Power Interruption',
   '["La Paz District","Jaro Blvd","Ungka Rd"]',
   '2026-04-28', '08:00', '17:00',
   'Scheduled maintenance of 69KV transmission line.',
   '(033) 509-8888'),
  ('ua2', 'water', 'MIWD', 'info',
   'Low Water Pressure Advisory',
   '["Molo","Mandurriao","Arevalo"]',
   '2026-04-27', '22:00', '06:00',
   'Pump rehabilitation works at Sta. Barbara plant.',
   '(033) 337-8888'),
  ('ua3', 'power', 'MORE Power', 'info',
   'Restored — City Proper Outage',
   '["City Proper","Iznart St","Quezon St"]',
   '2026-04-27', '00:00', '04:30',
   'Emergency line repair completed.',
   '(033) 509-8888');

-- -------------------------------------------------------------
-- Current Fuel Prices (April 27, 2026)
-- -------------------------------------------------------------
INSERT OR IGNORE INTO fuel_prices (
  as_of,
  iloilo_gasoline_avg, iloilo_gasoline_min, iloilo_gasoline_max,
  iloilo_diesel_avg,   iloilo_diesel_min,   iloilo_diesel_max,
  iloilo_kerosene_avg, iloilo_kerosene_min, iloilo_kerosene_max,
  ph_gasoline_avg,     ph_diesel_avg,
  source
) VALUES (
  '2026-04-27',
  65.80, 64.30, 67.50,
  46.20, 45.00, 47.80,
  64.10, 63.00, 65.50,
  56.71, 43.10,
  'LPCC/DOE Manual'
);

-- -------------------------------------------------------------
-- Recent Heat Index Log
-- -------------------------------------------------------------
INSERT OR IGNORE INTO heat_index_log (log_date, area, heat_index_c, level) VALUES
  ('2026-04-27', 'Dumangas, Iloilo', 45, 'Danger'),
  ('2026-04-27', 'Iloilo City',      41, 'Extreme Caution'),
  ('2026-04-27', 'Lambunao, Iloilo', 40, 'Caution'),
  ('2026-04-26', 'Dumangas, Iloilo', 45, 'Danger'),
  ('2026-04-26', 'Iloilo City',      43, 'Danger'),
  ('2026-04-25', 'Dumangas, Iloilo', 45, 'Danger'),
  ('2026-04-25', 'Iloilo City',      43, 'Danger'),
  ('2026-04-24', 'Dumangas, Iloilo', 44, 'Danger'),
  ('2026-04-24', 'Iloilo City',      42, 'Danger'),
  ('2026-04-10', 'Dumangas, Iloilo', 44, 'Danger'),
  ('2026-04-10', 'Iloilo City',      40, 'Extreme Caution');
