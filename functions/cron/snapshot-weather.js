/**
 * Cloudflare Cron Trigger — hourly weather + AQI snapshot to D1
 * Schedule: "0 * * * *"  (every hour)
 *
 * Add to wrangler.toml:
 *   [[triggers.crons]]
 *   crons = ["0 * * * *"]
 *
 * Fetches Open-Meteo (weather) + WAQI/OWM (AQI), stores in weather_log
 */

const ILOILO_LAT = 10.7202
const ILOILO_LON = 122.5621

function calcHeatIndex(tempC, rh) {
  if (tempC < 27) return { value: tempC, label: 'Normal' }
  const hi =
    -8.784695 + 1.61139411 * tempC + 2.338549 * rh -
    0.14611605 * tempC * rh - 0.012308094 * tempC ** 2 -
    0.016424828 * rh ** 2 + 0.002211732 * tempC ** 2 * rh +
    0.00072546 * tempC * rh ** 2 - 0.000003582 * tempC ** 2 * rh ** 2
  const v = Math.round(hi)
  if (hi < 27) return { value: v, label: 'Normal' }
  if (hi < 33) return { value: v, label: 'Caution' }
  if (hi < 42) return { value: v, label: 'Extreme Caution' }
  if (hi < 52) return { value: v, label: 'Danger' }
  return       { value: v, label: 'Extreme Danger' }
}

function waqiToScale(aqi) {
  if (aqi <= 50)  return { scale: 1, label: 'Good' }
  if (aqi <= 100) return { scale: 2, label: 'Fair' }
  if (aqi <= 150) return { scale: 3, label: 'Moderate' }
  if (aqi <= 200) return { scale: 4, label: 'Poor' }
  return               { scale: 5, label: 'Very Poor' }
}

function degToCompass(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

export default {
  async scheduled(event, env, ctx) {
    const now = new Date().toISOString()
    let weather = null
    let aqiData  = null

    // ── 1. Open-Meteo weather ────────────────────────────────
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${ILOILO_LAT}&longitude=${ILOILO_LON}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
        `weather_code,wind_speed_10m,wind_direction_10m,uv_index,precipitation` +
        `&wind_speed_unit=kmh&timezone=Asia%2FManila`
      const omRes = await fetch(omUrl)
      if (omRes.ok) {
        const omData = await omRes.json()
        const c = omData.current
        const hi = calcHeatIndex(c.temperature_2m, c.relative_humidity_2m)
        weather = {
          temp_c:         Math.round(c.temperature_2m * 10) / 10,
          feels_like_c:   Math.round(c.apparent_temperature * 10) / 10,
          humidity_pct:   c.relative_humidity_2m,
          wind_speed_kmh: Math.round(c.wind_speed_10m),
          wind_dir:       degToCompass(c.wind_direction_10m),
          uv_index:       Math.round(c.uv_index ?? 0),
          precipitation:  c.precipitation ?? 0,
          weather_code:   c.weather_code,
          heat_index_c:   hi.value,
          heat_level:     hi.label,
        }
      }
    } catch (e) { console.error('Open-Meteo cron error:', e.message) }

    // ── 2. AQI: WAQI geo first, OWM fallback ───────────────────
    try {
      if (env.WAQI_TOKEN) {
        const wRes = await fetch(`https://api.waqi.info/feed/geo:${ILOILO_LAT};${ILOILO_LON}/?token=${env.WAQI_TOKEN}`)
        if (wRes.ok) {
          const wData = await wRes.json()
          if (wData.status === 'ok') {
            const d  = wData.data
            const sl = waqiToScale(d.aqi)
            aqiData = {
              aqi:        d.aqi,
              aqi_scale:  sl.scale,
              aqi_label:  sl.label,
              aqi_source: 'WAQI',
              pm25:       d.iaqi?.pm25?.v ?? null,
              pm10:       d.iaqi?.pm10?.v ?? null,
              o3:         d.iaqi?.o3?.v   ?? null,
              no2:        d.iaqi?.no2?.v  ?? null,
            }
          }
        }
      }
    } catch (e) { console.error('WAQI cron error:', e.message) }

    if (!aqiData && env.OPENWEATHER_API_KEY) {
      try {
        const owRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${ILOILO_LAT}&lon=${ILOILO_LON}&appid=${env.OPENWEATHER_API_KEY}`)
        if (owRes.ok) {
          const owData = await owRes.json()
          const item   = owData.list?.[0]
          if (item) {
            const sl = { 1:'Good',2:'Fair',3:'Moderate',4:'Poor',5:'Very Poor' }
            aqiData = {
              aqi:        item.main.aqi * 50,
              aqi_scale:  item.main.aqi,
              aqi_label:  sl[item.main.aqi] ?? 'Moderate',
              aqi_source: 'OpenWeatherMap',
              pm25:       item.components.pm2_5 ?? null,
              pm10:       item.components.pm10  ?? null,
              o3:         item.components.o3    ?? null,
              no2:        item.components.no2   ?? null,
            }
          }
        }
      } catch (e) { console.error('OWM AQI cron error:', e.message) }
    }

    // ── 3. Insert into D1 ────────────────────────────────────
    try {
      await env.DB.prepare(
        `INSERT INTO weather_log
         (logged_at, temp_c, feels_like_c, humidity_pct, wind_speed_kmh, wind_dir,
          uv_index, precipitation, weather_code, heat_index_c, heat_level,
          aqi, aqi_scale, aqi_label, aqi_source, pm25, pm10, o3, no2, source)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        now,
        weather?.temp_c         ?? null,
        weather?.feels_like_c   ?? null,
        weather?.humidity_pct   ?? null,
        weather?.wind_speed_kmh ?? null,
        weather?.wind_dir       ?? null,
        weather?.uv_index       ?? null,
        weather?.precipitation  ?? null,
        weather?.weather_code   ?? null,
        weather?.heat_index_c   ?? null,
        weather?.heat_level     ?? null,
        aqiData?.aqi        ?? null,
        aqiData?.aqi_scale  ?? null,
        aqiData?.aqi_label  ?? null,
        aqiData?.aqi_source ?? null,
        aqiData?.pm25 ?? null,
        aqiData?.pm10 ?? null,
        aqiData?.o3   ?? null,
        aqiData?.no2  ?? null,
        'cron'
      ).run()
      console.log(`[snapshot-weather] logged at ${now}`)
    } catch (e) {
      console.error('[snapshot-weather] D1 insert error:', e.message)
    }
  }
}
