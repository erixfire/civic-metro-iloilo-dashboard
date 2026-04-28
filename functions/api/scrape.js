/**
 * GET  /api/scrape?source=all|fuel|more|mcwd|pagasa|cdrrmo|energy|traffic|news
 * POST /api/scrape  { source: 'all' | specific }   (operator auth required)
 *
 * Unified scraper worker for Civic Metro Iloilo Dashboard.
 * Each scraper runs independently — one failure never blocks others.
 *
 * Sources:
 *   fuel    — DOE WEPS weekly fuel bulletin, Region VI pump prices
 *   more    — MORE Electric & Power Corp: power interruption notices + RSS feed
 *   mcwd    — Metro Iloilo Water District service interruptions
 *   pagasa  — PAGASA heat index values (numeric extraction) + weather advisories
 *   cdrrmo  — CDRRMO Iloilo City weather + heat index Facebook posts
 *   energy  — DOE energy news + BusinessMirror/Inquirer energy stories for Iloilo
 *   traffic — LTFRB/LTO advisories + CDRRMO traffic/accident alerts + local news
 *   news    — General Iloilo City news (Panay News, Daily Guardian, Inquirer)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

const UA         = 'CivicIloiloDashboard/1.0 (+https://iloilocity.app)'
const TIMEOUT_MS = 12_000

// ── Entry point ──────────────────────────────────────────────────────────────

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase()
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url    = new URL(request.url)
  const source = (method === 'GET'
    ? url.searchParams.get('source')
    : (await safeJson(request))?.source
  ) ?? 'all'

  if (method === 'GET')  return getCached(env.DB, source)
  if (method === 'POST') {
    const authError = await requireOperator(request, env)
    if (authError) return authError
    return runScrape(env, source)
  }
  return json({ error: 'Method not allowed' }, 405)
}

// ── GET: cached D1 results ─────────────────────────────────────────────────

async function getCached(DB, source) {
  if (!DB) return json({ error: 'Database not configured', items: [] }, 503)
  const sf = source === 'all' ? null : source
  try {
    const q    = sf
      ? `SELECT * FROM scraped_news WHERE source_key = ? ORDER BY pub_date DESC, scraped_at DESC LIMIT 50`
      : `SELECT * FROM scraped_news ORDER BY pub_date DESC, scraped_at DESC LIMIT 150`
    const stmt = sf ? DB.prepare(q).bind(sf) : DB.prepare(q)
    const { results: rows = [] } = await stmt.all()
    return json({ source, count: rows.length, updatedAt: rows[0]?.scraped_at ?? null, items: rows })
  } catch (e) {
    return json({ error: 'DB read error: ' + e.message, items: [] }, 500)
  }
}

// ── POST: run live scrapers ──────────────────────────────────────────────────

async function runScrape(env, source) {
  const scrapers = {
    fuel:    scrapeFuelDoe,
    more:    scrapeMorePower,
    mcwd:    scrapeMcwd,
    pagasa:  scrapePagasaHeatIndex,
    cdrrmo:  scrapeCdrrmo,
    energy:  scrapeEnergyNews,
    traffic: scrapeTrafficAlerts,
    news:    scrapeIloiloNews,
  }

  const toRun  = source === 'all' ? Object.keys(scrapers) : [source]
  const results = {}

  await Promise.allSettled(
    toRun.map(async (key) => {
      if (!scrapers[key]) { results[key] = { error: 'Unknown source' }; return }
      try {
        const items = await scrapers[key]()
        const saved = (env.DB && items.length > 0) ? await upsertItems(env.DB, key, items) : 0
        results[key] = { scraped: items.length, saved }
      } catch (e) {
        results[key] = { error: e.message }
      }
    })
  )

  const totalScraped = Object.values(results).reduce((s, r) => s + (r.scraped ?? 0), 0)
  const totalSaved   = Object.values(results).reduce((s, r) => s + (r.saved   ?? 0), 0)

  if (env.DB) await writeAudit(env.DB, 'scrape_run', 'scraped_news', null,
    JSON.stringify({ source, totalScraped, totalSaved, results }))

  return json({ ok: true, source, totalScraped, totalSaved, results })
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 1: DOE Fuel Prices — Region VI
// ──────────────────────────────────────────────────────────────────────

async function scrapeFuelDoe() {
  const items = []
  const resp  = await fetchWithTimeout('https://oilmonitor.doe.gov.ph/prices/weekly',
    { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!resp.ok) return items
  const html = await resp.text()

  const rowRe  = /<tr[^>]*>(.*?)<\/tr>/gis
  const cellRe = /<td[^>]*>([^<]*)<\/td>/gi
  let match
  while ((match = rowRe.exec(html)) !== null) {
    const cells = [...match[1].matchAll(cellRe)].map(m => m[1].trim())
    if (cells.length >= 3 && /region\s*(vi|6|iloilo)/i.test(cells[0])) {
      items.push({
        title:    `DOE Fuel Prices — Region VI (${todayPH()})`,
        summary:  `Gasoline: ₱${cells[1]}–${cells[2]}/L · Diesel: ₱${cells[3] ?? '?'}–${cells[4] ?? '?'}/L`,
        url:      'https://oilmonitor.doe.gov.ph/prices/weekly',
        pub_date: isoDate(),
        category: 'fuel',
        raw_data: JSON.stringify(cells),
      })
      break
    }
  }

  // Fallback: latest h2 headline
  if (items.length === 0) {
    const h = html.match(/<h[12][^>]*>([^<]{10,120})<\/h[12]>/i)
    if (h) items.push({ title: h[1].trim(), summary: 'DOE weekly fuel price bulletin', url: 'https://oilmonitor.doe.gov.ph/prices/weekly', pub_date: isoDate(), category: 'fuel', raw_data: null })
  }
  return items
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 2: MORE Electric & Power Corp (deep)
// Sources:
//   1. RSS feed at more.com.ph/feed/ (fastest, most reliable)
//   2. Power Interruption Notice archive (WordPress)
//   3. Advisories archive (WordPress)
// ──────────────────────────────────────────────────────────────────────

async function scrapeMorePower() {
  const items = []

  // ① RSS feed — most reliable source for latest posts
  const RSS_FEEDS = [
    'https://www.more.com.ph/feed/',
    'https://www.more.com.ph/category/power-interruption-notice/feed/',
    'https://www.more.com.ph/category/advisory/feed/',
  ]

  for (const feedUrl of RSS_FEEDS) {
    try {
      const rssItems = await parseRssFeed(feedUrl, 'more-power', 6,
        /power.?interrupt|outage|schedul|advisory|restoration|load.?shedding|pemco|wesm/i)
      items.push(...rssItems)
    } catch (_) {}
  }

  // ② WordPress archive fallback
  const ARCHIVE_PAGES = [
    'https://www.more.com.ph/power-interruption-notices/',
    'https://www.more.com.ph/advisories/',
  ]
  for (const pageUrl of ARCHIVE_PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      items.push(...scrapeWordPressArchive(await resp.text(), 'more-power'))
    } catch (_) {}
  }

  return dedupeByTitle(items).slice(0, 12)
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 3: Metro Iloilo Water District
// ──────────────────────────────────────────────────────────────────────

async function scrapeMcwd() {
  const items = []
  const PAGES = [
    'https://www.mcwd.gov.ph/service-interruptions/',
    'https://www.mcwd.gov.ph/advisories/',
  ]
  for (const pageUrl of PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      items.push(...scrapeWordPressArchive(await resp.text(), 'mcwd'))
    } catch (_) {}
  }
  // Try RSS too
  try { items.push(...await parseRssFeed('https://www.mcwd.gov.ph/feed/', 'mcwd', 6, null)) } catch (_) {}
  return dedupeByTitle(items).slice(0, 10)
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 4: PAGASA — Heat Index with numeric value extraction
// Targets the PAGASA heat index page and extracts the actual °C readings
// for Western Visayas / Iloilo specifically.
// ──────────────────────────────────────────────────────────────────────

async function scrapePagasaHeatIndex() {
  const items = []

  // ① Heat index page — attempt numeric extraction
  try {
    const resp = await fetchWithTimeout(
      'https://www.pagasa.dost.gov.ph/climate/heat-index',
      { headers: { 'User-Agent': UA } }
    )
    if (resp.ok) {
      const html = await resp.text()

      // PAGASA renders a table of stations with heat index values.
      // Pattern: station name cell followed by a numeric cell (e.g. 42)
      // We look for rows containing "Iloilo" or "Western Visayas".
      const rowRe  = /<tr[^>]*>(.*?)<\/tr>/gis
      const cellRe = /<t[dh][^>]*>\s*([^<]{1,100})\s*<\/t[dh]>/gi
      let match
      const heatRows = []

      while ((match = rowRe.exec(html)) !== null) {
        const cells = [...match[1].matchAll(cellRe)].map(m => stripHtml(m[1]).trim())
        const rowText = cells.join(' ')
        if (/iloilo|western visayas|panay/i.test(rowText)) {
          // Find the first numeric value that looks like a heat index (30–50°C)
          const numCell = cells.find(c => /^\d{2}(\.\d)?$/.test(c.trim()) && +c >= 28 && +c <= 55)
          if (numCell) {
            heatRows.push({ station: cells[0], value: numCell, level: classifyHeat(+numCell) })
          }
        }
      }

      if (heatRows.length > 0) {
        const best = heatRows[0]
        items.push({
          title:    `PAGASA Heat Index — Iloilo: ${best.value}°C (${best.level})`,
          summary:  heatRows.map(r => `${r.station}: ${r.value}°C — ${r.level}`).join(' | '),
          url:      'https://www.pagasa.dost.gov.ph/climate/heat-index',
          pub_date: isoDate(),
          category: 'pagasa-heat-index',
          raw_data: JSON.stringify(heatRows),
        })
      } else {
        // Fallback: grab any heat index advisory text mentioning Iloilo / Region 6
        const matches = [...html.matchAll(/(?:iloilo|western visayas)[^.]{0,120}?\d{2}(?:\.\d)?°?\s*(?:degrees|c\b)/gi)]
        if (matches.length > 0) {
          items.push({
            title:    `PAGASA Heat Index Advisory — ${todayPH()}`,
            summary:  matches.slice(0, 3).map(m => m[0].trim()).join(' | '),
            url:      'https://www.pagasa.dost.gov.ph/climate/heat-index',
            pub_date: isoDate(),
            category: 'pagasa-heat-index',
            raw_data: null,
          })
        }
      }

      // Also grab weather advisories from the page
      items.push(...scrapeWordPressArchive(html, 'pagasa-heat-index').slice(0, 3))
    }
  } catch (_) {}

  // ② Daily weather forecast page
  try {
    const resp = await fetchWithTimeout(
      'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast',
      { headers: { 'User-Agent': UA } }
    )
    if (resp.ok) {
      const html = await resp.text()
      // Look for Western Visayas forecast text
      const wvMatch = html.match(/western visayas[^.]{0,300}/i)
      if (wvMatch) {
        items.push({
          title:    `PAGASA Daily Forecast — Western Visayas (${todayPH()})`,
          summary:  stripHtml(wvMatch[0]).slice(0, 250).trim(),
          url:      'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast',
          pub_date: isoDate(),
          category: 'pagasa-weather',
          raw_data: null,
        })
      }
    }
  } catch (_) {}

  // ③ PAGASA RSS — official advisories feed
  try {
    const rssItems = await parseRssFeed(
      'https://www.pagasa.dost.gov.ph/index.php?format=feed&type=rss',
      'pagasa-weather', 5,
      /western visayas|iloilo|panay|visayas/i
    )
    items.push(...rssItems)
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 10)
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 5: CDRRMO Iloilo City
// ──────────────────────────────────────────────────────────────────────

async function scrapeCdrrmo() {
  const items = []
  const PAGES = [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/weather-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/',
    'https://cdrrmo.iloilocity.gov.ph/advisories/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/traffic-updates/',
  ]
  for (const pageUrl of PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      items.push(...scrapeWordPressArchive(await resp.text(), 'cdrrmo'))
    } catch (_) {}
  }
  // RSS
  try { items.push(...await parseRssFeed('https://cdrrmo.iloilocity.gov.ph/feed/', 'cdrrmo', 8, null)) } catch (_) {}
  return dedupeByTitle(items).slice(0, 15)
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 6: Energy News (NEW)
// Sources:
//   • DOE official news feed
//   • BusinessMirror energy tag feed (often covers MORE Power / WESM / Region 6)
//   • Inquirer Business energy tag
//   • Panay News energy/power stories
// ──────────────────────────────────────────────────────────────────────

async function scrapeEnergyNews() {
  const items = []

  const ENERGY_FEEDS = [
    {
      url:     'https://www.doe.gov.ph/index.php?format=feed&type=rss',
      source:  'DOE',
      filter:  /iloilo|region.?6|region.?vi|western visayas|more.?power|pemco|wesm|panay|visayas/i,
    },
    {
      url:     'https://businessmirror.com.ph/category/energy/feed/',
      source:  'BusinessMirror',
      filter:  /iloilo|region.?6|region.?vi|western visayas|more.?power|panay|visayas/i,
    },
    {
      url:     'https://business.inquirer.net/tag/power/feed/',
      source:  'Inquirer Business',
      filter:  /iloilo|western visayas|panay|more.?power|visayas/i,
    },
    {
      url:     'https://www.panaynews.net/category/business/feed/',
      source:  'Panay News Business',
      filter:  /power|energy|fuel|electricity|pemco|more.?power|wesm|load.?shed/i,
    },
    {
      url:     'https://www.panaynews.net/feed/',
      source:  'Panay News',
      filter:  /power.?interrupt|outage|restoration|load.?shed|energy|fuel|pemco|wesm/i,
    },
  ]

  for (const feed of ENERGY_FEEDS) {
    try {
      const rssItems = await parseRssFeed(feed.url, 'energy', 5, feed.filter)
      // Tag each item with source
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      items.push(...rssItems)
    } catch (_) {}
  }

  return dedupeByTitle(items).slice(0, 15)
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 7: Traffic & Accident Alerts (NEW)
// Sources:
//   • CDRRMO traffic-updates subpage
//   • CITOM (City Traffic Operations Management Office) if available
//   • LTFRB Region 6 Facebook / website
//   • LTO Region 6 advisories
//   • Panay News traffic/accident tag feed
//   • Daily Guardian traffic/incident tag feed
// Keyword filter: only keeps stories about accidents, road closures,
//   traffic, rerouting, checkpoints — Iloilo-relevant.
// ──────────────────────────────────────────────────────────────────────

const TRAFFIC_KW = /traffic|accident|crash|collision|reroute|re-route|road.?clos|closed|checkpoint|congestion|vehicular|pileup|pile.?up|ltfrb|lto.?region|citom|enforce/i
const ILOILO_KW  = /iloilo|panay|western visayas|region.?6|diversion|molo|jaro|mandurriao|lapuz|la paz|pavia/i

async function scrapeTrafficAlerts() {
  const items = []

  // ① CDRRMO traffic-specific subpage
  const CDRRMO_TRAFFIC_PAGES = [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/traffic-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/incidents/',
  ]
  for (const pageUrl of CDRRMO_TRAFFIC_PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      items.push(...scrapeWordPressArchive(await resp.text(), 'traffic'))
    } catch (_) {}
  }

  // ② LTFRB Region 6 website
  try {
    const resp = await fetchWithTimeout('https://ltfrb.gov.ph/?s=iloilo', { headers: { 'User-Agent': UA } })
    if (resp.ok) {
      const html = await resp.text()
      const posts = scrapeWordPressArchive(html, 'traffic')
        .filter(p => ILOILO_KW.test(p.title + ' ' + (p.summary ?? '')))
      items.push(...posts)
    }
  } catch (_) {}

  // ③ LTO news (Region 6)
  try {
    const resp = await fetchWithTimeout('https://lto.gov.ph/index.php/news-and-advisories/advisory.html', { headers: { 'User-Agent': UA } })
    if (resp.ok) {
      const html  = await resp.text()
      const posts = scrapeWordPressArchive(html, 'traffic')
        .filter(p => ILOILO_KW.test(p.title + ' ' + (p.summary ?? '')))
      items.push(...posts)
    }
  } catch (_) {}

  // ④ News RSS feeds — filter for traffic & accident stories in Iloilo
  const TRAFFIC_RSS = [
    { url: 'https://www.panaynews.net/feed/',        source: 'Panay News'      },
    { url: 'https://thedailyguardian.net/feed/',     source: 'Daily Guardian'  },
    { url: 'https://www.philstar.com/rss/nation',    source: 'PhilStar Nation'  },
  ]
  for (const feed of TRAFFIC_RSS) {
    try {
      // Combined filter: must match traffic/accident AND Iloilo keywords
      const rssItems = await parseRssFeedDouble(feed.url, 'traffic', 5, TRAFFIC_KW, ILOILO_KW)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      items.push(...rssItems)
    } catch (_) {}
  }

  // ⑤ Inquirer Iloilo tag (often covers accidents)
  try {
    const rssItems = await parseRssFeed(
      'https://newsinfo.inquirer.net/tag/iloilo/feed/',
      'traffic', 5,
      /accident|crash|collision|reroute|traffic|road.?clos|checkpoint|citom|lto|ltfrb/i
    )
    rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'Inquirer' }) })
    items.push(...rssItems)
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 15)
}

// ──────────────────────────────────────────────────────────────────────
// SCRAPER 8: General Iloilo News
// ──────────────────────────────────────────────────────────────────────

async function scrapeIloiloNews() {
  const items = []
  const FEEDS = [
    { url: 'https://www.panaynews.net/feed/',                              source: 'Panay News'     },
    { url: 'https://thedailyguardian.net/feed/',                           source: 'Daily Guardian' },
    { url: 'https://newsinfo.inquirer.net/tag/iloilo/feed/',               source: 'Inquirer'       },
    { url: 'https://www.sunstar.com.ph/iloilo/rss.xml',                    source: 'SunStar Iloilo' },
    { url: 'https://www.pna.gov.ph/rss/articles?region=Region%20VI',       source: 'PNA Region VI'  },
  ]

  const ILOILO_FILTER = /iloilo|panay|visayas|western visayas|cdrrmo|pagasa|iloilo city/i

  for (const feed of FEEDS) {
    try {
      const rssItems = await parseRssFeed(feed.url, 'news', 5, ILOILO_FILTER)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      items.push(...rssItems)
    } catch (_) {}
  }

  return dedupeByTitle(items).slice(0, 20)
}

// ── RSS parser (reusable) ──────────────────────────────────────────────────────────
// parseRssFeed: fetch + parse RSS, optional regex filter applied to title+desc

async function parseRssFeed(feedUrl, sourceKey, maxItems = 8, filterRe = null) {
  const resp = await fetchWithTimeout(feedUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  })
  if (!resp.ok) return []
  const xml   = await resp.text()
  const items = []
  const itemRe = /<item[^>]*>(.*?)<\/item>/gis
  let m, count = 0

  while ((m = itemRe.exec(xml)) !== null && count < maxItems) {
    const block   = m[1]
    const title   = stripCdata(xmlTag(block, 'title')).trim()
    const link    = (xmlTag(block, 'link') || xmlAttr(block, 'guid', 'isPermaLink')).trim()
    const pubDate = xmlTag(block, 'pubDate').trim()
    const desc    = stripHtml(stripCdata(xmlTag(block, 'description') ?? '')).slice(0, 250).trim()
    if (!title) continue
    if (filterRe && !filterRe.test(title + ' ' + desc)) continue
    items.push({
      title,
      summary:  desc,
      url:      link || feedUrl,
      pub_date: pubDate ? toIsoDate(pubDate) : isoDate(),
      category: sourceKey,
      raw_data: null,
    })
    count++
  }
  return items
}

// parseRssFeedDouble: requires BOTH filters to match (e.g. traffic AND iloilo)
async function parseRssFeedDouble(feedUrl, sourceKey, maxItems = 8, filterA, filterB) {
  const resp = await fetchWithTimeout(feedUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  })
  if (!resp.ok) return []
  const xml   = await resp.text()
  const items = []
  const itemRe = /<item[^>]*>(.*?)<\/item>/gis
  let m, count = 0

  while ((m = itemRe.exec(xml)) !== null && count < maxItems) {
    const block   = m[1]
    const title   = stripCdata(xmlTag(block, 'title')).trim()
    const link    = (xmlTag(block, 'link') || xmlAttr(block, 'guid', 'isPermaLink')).trim()
    const pubDate = xmlTag(block, 'pubDate').trim()
    const desc    = stripHtml(stripCdata(xmlTag(block, 'description') ?? '')).slice(0, 250).trim()
    const text    = title + ' ' + desc
    if (!title) continue
    if (filterA && !filterA.test(text)) continue
    if (filterB && !filterB.test(text)) continue
    items.push({
      title,
      summary:  desc,
      url:      link || feedUrl,
      pub_date: pubDate ? toIsoDate(pubDate) : isoDate(),
      category: sourceKey,
      raw_data: null,
    })
    count++
  }
  return items
}

// ── WordPress archive helper ──────────────────────────────────────────────────

function scrapeWordPressArchive(html, sourceKey) {
  const items      = []
  const titleRe    = /<h[23][^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const dateRe     = /<time[^>]*class="[^"]*entry-date[^"]*"[^>]*datetime="([^"T]+)/gi
  const excerptRe  = /<div[^>]*class="[^"]*entry-(?:summary|content)[^"]*"[^>]*>\s*<p>([^<]{10,300})<\/p>/gi
  const titles     = [...html.matchAll(titleRe)]
  const dates      = [...html.matchAll(dateRe)]
  const excerpts   = [...html.matchAll(excerptRe)]
  titles.slice(0, 8).forEach((m, i) => items.push({
    title:    m[2].trim(),
    summary:  excerpts[i]?.[1]?.trim() ?? '',
    url:      m[1],
    pub_date: dates[i]?.[1] ?? isoDate(),
    category: sourceKey,
    raw_data: null,
  }))
  return items
}

// ── D1 upsert ─────────────────────────────────────────────────────────────────

async function upsertItems(DB, sourceKey, items) {
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS scraped_news (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      source_key TEXT NOT NULL,
      title      TEXT NOT NULL,
      summary    TEXT,
      url        TEXT,
      pub_date   TEXT,
      category   TEXT,
      raw_data   TEXT,
      scraped_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source_key, title)
    )
  `).run().catch(() => {})

  let saved = 0
  for (const item of items) {
    try {
      const r = await DB.prepare(`
        INSERT INTO scraped_news (source_key, title, summary, url, pub_date, category, raw_data, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(source_key, title) DO UPDATE SET
          summary    = excluded.summary,
          pub_date   = excluded.pub_date,
          raw_data   = excluded.raw_data,
          scraped_at = datetime('now')
      `).bind(
        sourceKey,
        item.title    ?? '',
        item.summary  ?? null,
        item.url      ?? null,
        item.pub_date ?? null,
        item.category ?? sourceKey,
        item.raw_data ?? null,
      ).run()
      if (r.changes > 0) saved++
    } catch (_) {}
  }
  return saved
}

// ── Auth ─────────────────────────────────────────────────────────────────────────

async function requireOperator(request, env) {
  const auth  = request.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Authentication required' }, 401)
  try {
    if (token === env.SCRAPE_SECRET) return null // allow cron trigger
    const parts   = token.split('.')
    if (parts.length !== 3) return json({ error: 'Invalid token' }, 401)
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp < Math.floor(Date.now() / 1000)) return json({ error: 'Token expired' }, 401)
    if (!['operator', 'admin'].includes(payload.role)) return json({ error: 'Insufficient role' }, 403)
    return null
  } catch { return json({ error: 'Invalid token' }, 401) }
}

// ── Utilities ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}) {
  const c  = new AbortController()
  const id = setTimeout(() => c.abort(), TIMEOUT_MS)
  try   { return await fetch(url, { ...opts, signal: c.signal }) }
  finally { clearTimeout(id) }
}

function classifyHeat(val) {
  if (val >= 52) return 'Extreme Danger'
  if (val >= 42) return 'Danger'
  if (val >= 33) return 'Extreme Caution'
  if (val >= 27) return 'Caution'
  return 'Normal'
}

function isoDate()           { return new Date().toISOString().slice(0, 10) }
function todayPH()           { return new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
function toIsoDate(str)      { try { return new Date(str).toISOString().slice(0, 10) } catch { return isoDate() } }

function xmlTag(xml, tag)    { return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? '' }
function xmlAttr(xml, tag, attr) { return xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, 'i'))?.[1] ?? '' }
function stripCdata(s)       { return (s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, (_, c) => c).trim() }
function stripHtml(s)        { return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }

function dedupeByTitle(items) {
  const seen = new Set()
  return items.filter(i => {
    const k = i.title?.toLowerCase().trim()
    if (!k || seen.has(k)) return false
    seen.add(k); return true
  })
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name ?? '', record_id ? String(record_id) : null, details ?? null).run()
  } catch (_) {}
}

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: CORS }) }
function safeJson(req)            { return req.json().catch(() => ({})) }
