/**
 * Cloudflare Pages Functions Scheduled Worker
 * ============================================
 * Automatically triggers scrapers on a cron schedule - no manual button needed.
 *
 * Cron schedule (add in Cloudflare Dashboard -> Workers & Pages ->
 *   civic-metro-iloilo-dashboard -> Settings -> Functions -> Cron Triggers):
 *
 *   Every 5 minutes  : PAGASA heat index + daily weather (live, time-sensitive)
 *   Every 30 minutes : All sources (news, MORE Power, CDRRMO, MCWD, energy)
 *
 * Expressions to enter in Dashboard UI:
 *   5min  cron  ->  slash5 every minute-hour-day-month-dow
 *   30min cron  ->  slash30 every minute-hour-day-month-dow
 */

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000

function phtNow()     { return new Date(Date.now() + PHT_OFFSET_MS) }
function isoPhT()     { return phtNow().toISOString().replace('T', ' ').slice(0, 19) }
function isoDatePhT() { return phtNow().toISOString().slice(0, 10) }

export async function scheduled(event, env, ctx) {
  const cron      = event.cron ?? ''
  const startedAt = isoPhT()
  console.log('[Cron] Fired: "' + cron + '" at ' + startedAt + ' PHT')

  if (cron === '*/5 * * * *') {
    ctx.waitUntil(runPagasaScrape(env, startedAt))
    return
  }

  // every-30-min or any other cron: run all
  ctx.waitUntil(runAllScrape(env, startedAt))
}

// -- PAGASA live scrape -------------------------------------------------------
async function runPagasaScrape(env, startedAt) {
  if (!env.DB) { console.error('[Cron] No DB binding'); return }
  const today = isoDatePhT()
  const items = []

  // 1. Heat index
  try {
    const resp = await fetchT('https://www.pagasa.dost.gov.ph/climate/heat-index')
    if (resp.ok) {
      const html     = await resp.text()
      const rowRe    = /<tr[^>]*>(.*?)<\/tr>/gis
      const cellRe   = /<t[dh][^>]*>\s*([^<]{1,100})\s*<\/t[dh]>/gi
      const heatRows = []
      let m
      while ((m = rowRe.exec(html)) !== null) {
        const cells = [...m[1].matchAll(cellRe)].map(x => stripHtml(x[1]).trim())
        if (/iloilo|western visayas|panay/i.test(cells.join(' '))) {
          const num = cells.find(c => /^\d{2}(\.\d)?$/.test(c) && +c >= 28 && +c <= 55)
          if (num) heatRows.push({ station: cells[0], value: num, level: classifyHeat(+num) })
        }
      }
      if (heatRows.length > 0) {
        const best = heatRows[0]
        items.push({
          source_key: 'pagasa-heat-index',
          title:      'PAGASA Heat Index \u2014 Iloilo: ' + best.value + '\u00b0C (' + best.level + ') [' + today + ']',
          summary:    heatRows.map(r => r.station + ': ' + r.value + '\u00b0C \u2014 ' + r.level).join(' | '),
          url:        'https://www.pagasa.dost.gov.ph/climate/heat-index',
          pub_date:   isoPhT(),
          category:   'pagasa-heat-index',
          raw_data:   JSON.stringify({ cron: true, heatRows }),
        })
        await logHeatIndex(env.DB, today, best.station, +best.value, best.level)
      }
    }
  } catch (e) { console.error('[Cron] PAGASA heat-index error:', e.message) }

  // 2. Daily weather forecast
  try {
    const resp = await fetchT('https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast')
    if (resp.ok) {
      const html    = await resp.text()
      const wvMatch = html.match(/western visayas[^.]{0,300}/i)
      if (wvMatch) items.push({
        source_key: 'pagasa-weather',
        title:      'PAGASA Daily Forecast \u2014 Western Visayas [' + today + ']',
        summary:    stripHtml(wvMatch[0]).slice(0, 250).trim(),
        url:        'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast',
        pub_date:   isoPhT(),
        category:   'pagasa-weather',
        raw_data:   JSON.stringify({ cron: true }),
      })
    }
  } catch (e) { console.error('[Cron] PAGASA weather error:', e.message) }

  if (items.length > 0) {
    await upsert(env.DB, items)
    console.log('[Cron] PAGASA: saved ' + items.length + ' items at ' + isoPhT() + ' PHT')
  } else {
    console.warn('[Cron] PAGASA: 0 items scraped - PAGASA site may be down or structure changed')
  }

  await writeAudit(env.DB, 'cron_pagasa', 'scraped_news', null,
    JSON.stringify({ startedAt, items: items.length, today }))
}

// -- Full all-source scrape ---------------------------------------------------
async function runAllScrape(env, startedAt) {
  await runPagasaScrape(env, startedAt)

  const quickFeeds = [
    { url: 'https://www.panaynews.net/feed/',                         key: 'news',       filter: /iloilo|panay|visayas/i },
    { url: 'https://www.panaynews.net/category/local/feed/',          key: 'news',       filter: /iloilo|panay|visayas/i },
    { url: 'https://cdrrmo.iloilocity.gov.ph/feed/',                  key: 'cdrrmo',     filter: null },
    { url: 'https://www.more.com.ph/category/advisory/feed/',         key: 'more-power', filter: /power|interrupt|outage|advisory|restoration/i },
    { url: 'https://www.more.com.ph/category/power-interruption-notice/feed/', key: 'more-power', filter: null },
    { url: 'https://www.sunstar.com.ph/iloilo/rss.xml',               key: 'news',       filter: null },
    { url: 'https://newsinfo.inquirer.net/tag/iloilo/feed/',          key: 'news',       filter: null },
    { url: 'https://www.pna.gov.ph/rss/articles?region=Region%20VI', key: 'news',       filter: null },
    { url: 'https://businessmirror.com.ph/category/energy/feed/',     key: 'energy',     filter: /iloilo|region.?6|western visayas|more.?power|panay/i },
    { url: 'https://thedailyguardian.net/feed/',                      key: 'news',       filter: /iloilo|panay|visayas/i },
    { url: 'https://www.mcwd.gov.ph/feed/',                           key: 'mcwd',       filter: null },
  ]

  const items = []
  await Promise.allSettled(
    quickFeeds.map(async (feed) => {
      try {
        const resp = await fetchT(feed.url)
        if (!resp.ok) return
        items.push(...parseRssXml(await resp.text(), feed.key, 6, feed.filter))
      } catch (_) {}
    })
  )

  const clean = filterGambling(dedupeByTitle(items))
  if (clean.length > 0 && env.DB) await upsert(env.DB, clean)

  console.log('[Cron] All: scraped ' + items.length + ', saved ' + clean.length + ' at ' + isoPhT() + ' PHT')
  await writeAudit(env.DB, 'cron_all', 'scraped_news', null,
    JSON.stringify({ startedAt, scraped: items.length, saved: clean.length }))
}

// -- D1 upsert ----------------------------------------------------------------
async function upsert(DB, items) {
  const now = isoPhT()
  for (const item of items) {
    try {
      await DB.prepare(
        'INSERT INTO scraped_news (source_key, title, summary, url, pub_date, category, raw_data, scraped_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(source_key, title) DO UPDATE SET ' +
        '  summary    = excluded.summary, ' +
        '  pub_date   = excluded.pub_date, ' +
        '  raw_data   = excluded.raw_data, ' +
        '  scraped_at = ?'
      ).bind(
        item.source_key ?? item.category ?? 'pagasa',
        item.title    ?? '',
        item.summary  ?? null,
        item.url      ?? null,
        item.pub_date ?? now,
        item.category ?? item.source_key ?? 'pagasa',
        item.raw_data ?? null,
        now, now,
      ).run()
    } catch (_) {}
  }
}

async function logHeatIndex(DB, date, station, value, level) {
  try {
    await DB.prepare(
      'CREATE TABLE IF NOT EXISTS heat_index_log (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  log_date TEXT NOT NULL,' +
      '  area TEXT NOT NULL DEFAULT \'Iloilo City\',' +
      '  heat_index_c REAL NOT NULL,' +
      '  level TEXT, source TEXT, logged_by TEXT,' +
      '  created_at TEXT DEFAULT (datetime(\'now\')), ' +
      '  UNIQUE(log_date, area)' +
      ')'
    ).run().catch(() => {})

    await DB.prepare(
      'INSERT INTO heat_index_log (log_date, area, heat_index_c, level, source) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(log_date, area) DO UPDATE SET ' +
      '  heat_index_c = excluded.heat_index_c, level = excluded.level, source = excluded.source'
    ).bind(date, station || 'Iloilo City', value, level, 'PAGASA Auto-Cron').run()
  } catch (e) { console.error('[Cron] heat_index_log write error:', e.message) }
}

// -- Inline helpers -----------------------------------------------------------
function parseRssXml(xml, sourceKey, max, filterRe) {
  const items  = []
  const itemRe = /<item[^>]*>(.*?)<\/item>/gis
  let m
  while ((m = itemRe.exec(xml)) !== null && items.length < max) {
    const b       = m[1]
    const title   = stripCdata(tag(b, 'title')).trim()
    const link    = stripCdata(tag(b, 'link')).trim()
    const pubDate = tag(b, 'pubDate').trim() || tag(b, 'dc:date').trim()
    const desc    = stripHtml(stripCdata(tag(b, 'description') ?? '')).slice(0, 400).trim()
    if (!title) continue
    if (filterRe && !filterRe.test(title + ' ' + desc)) continue
    items.push({ source_key: sourceKey, title, summary: desc, url: link || null,
      pub_date: pubDate ? toIso(pubDate) : isoPhT(), category: sourceKey, raw_data: null })
  }
  return items
}

function tag(xml, t)      { return xml.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)<\\/' + t + '>', 'i'))?.[1] ?? '' }
function stripCdata(s)    { return (s ?? '').replace(/<![CDATA[(\s\S]*?)]]>/gi, (_, c) => c).trim() }
function stripHtml(s)     { return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
function classifyHeat(v)  { return v>=52?'Extreme Danger':v>=42?'Danger':v>=33?'Extreme Caution':v>=27?'Caution':'Normal' }
function normalizeTitle(t){ return (t??'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,80) }
function dedupeByTitle(items) {
  const seen = new Set()
  return items.filter(i => { const k=normalizeTitle(i.title); if(!k||seen.has(k)) return false; seen.add(k); return true })
}
const GAMBLING_RE = /\b(casino|gambling|gambl(?:e|ing)|slot\s*machine|poker|baccarat|bingo\s*plus|bingoplus|PAGCOR|e-?sabong|sabong|cockfight|sportsbook|Lucky\s*Cola|Okbet|Jilibet|Hawkplay|Lodibet|phlwin)\b/i
function filterGambling(items) { return items.filter(i => !GAMBLING_RE.test((i.title ?? '') + ' ' + (i.summary ?? ''))) }
function toIso(s) { try { return new Date(s).toISOString().replace('T',' ').slice(0,19) } catch { return isoPhT() } }

async function fetchT(url, ms) {
  ms = ms || 8000
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  try { return await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'CivicIloiloDashboard/1.0 (+https://iloilocity.app)' } }) }
  finally { clearTimeout(t) }
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare('INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)')
      .bind(action, table_name ?? '', record_id ? String(record_id) : null, details ?? null).run()
  } catch (_) {}
}
