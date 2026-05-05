-- =============================================================
-- Weather & AQI Historical Log
-- Run: wrangler d1 execute civic-iloilo-db --file=db/weather_schema.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS weather_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  logged_at       TEXT NOT NULL DEFAULT (datetime('now')),   -- ISO UTC timestamp
  -- Weather (Open-Meteo via cron)
  temp_c          REAL,
  feels_like_c    REAL,
  humidity_pct    INTEGER,
  wind_speed_kmh  REAL,
  wind_dir        TEXT,
  uv_index        REAL,
  precipitation   REAL,
  weather_code    INTEGER,
  heat_index_c    REAL,
  heat_level      TEXT,    -- Normal | Caution | Extreme Caution | Danger
  -- Air Quality (WAQI or OWM)
  aqi             INTEGER,
  aqi_scale       INTEGER, -- 1-5
  aqi_label       TEXT,    -- Good | Fair | Moderate | Poor | Very Poor
  aqi_source      TEXT,    -- WAQI | OpenWeatherMap
  pm25            REAL,
  pm10            REAL,
  o3              REAL,
  no2             REAL,
  source          TEXT NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_weather_log_logged_at ON weather_log(logged_at);

-- Hourly view helper (SQLite doesn't have EXTRACT so we use strftime)
CREATE VIEW IF NOT EXISTS weather_log_hourly AS
  SELECT
    strftime('%Y-%m-%dT%H:00:00', logged_at) AS hour,
    ROUND(AVG(temp_c), 1)         AS avg_temp,
    ROUND(AVG(feels_like_c), 1)   AS avg_feels_like,
    ROUND(AVG(humidity_pct), 0)   AS avg_humidity,
    ROUND(AVG(wind_speed_kmh), 1) AS avg_wind,
    ROUND(AVG(uv_index), 1)       AS avg_uv,
    ROUND(AVG(heat_index_c), 1)   AS avg_heat_index,
    ROUND(AVG(aqi), 0)            AS avg_aqi,
    ROUND(AVG(pm25), 1)           AS avg_pm25,
    ROUND(AVG(pm10), 1)           AS avg_pm10
  FROM weather_log
  GROUP BY hour
  ORDER BY hour DESC;
