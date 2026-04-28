/**
 * GET  /api/scrape?source=all|fuel|more|mcwd|pagasa|cdrrmo|news
 * POST /api/scrape  { source: 'all' | specific }   (operator auth required)
 *
 * Unified scraper worker for Civic Metro Iloilo Dashboard.
 * Each scraper runs independently — one failure does not block others.
 *
 * Sources:
 *   fuel    — DOE WEPS weekly fuel price bulletin (Region 6 / Iloilo)
 *   more    — MORE Electric & Power Corp Facebook / website advisories
 *   mcwd    — Metro Iloilo Water District service interruption notices
 *   pagasa  — PAGASA heat index & weather bulletins
 *   cdrrmo  — CDRRMO Iloilo City Facebook updates
 *   news    — General Iloilo City news (Panay News, Daily Guardian)
 *
 * Results are stored in D1 table `scraped_news`.
 * GET returns cached results from D1 (no live scrape on GET).
 * POST triggers a live scrape and writes new items to D1.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

const UA = 'CivicIloiloDashboard/1.0 (+https://iloilocity.app)'
const TIMEOUT_MS = 10_000

// ── Entry point ──────────────────────────────────────────────────────────────

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase()
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url    = new URL(request.url)
  const source = (method === 'GET'
    ? url.searchParams.get('source')
    : (await safeJson(request))?.source
  ) ?? 'all'

  // GET — return cached results from D1
  if (method === 'GET') {
    return getCached(env.DB, source)
  }

  // POST — verify operator token, then run scrapers
  if (method === 'POST') {
    const authError = await requireOperator(request, env)
    if (authError) return authError
    return runScrape(env, source)
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ── GET: return cached D1 results ────────────────────────────────────────────

async function getCached(DB, source) {
  if (!DB) return json({ error: 'Database not configured', items: [] }, 503)

  const sourceFilter = source === 'all' ? null : source
  let rows
  try {
    const query = sourceFilter
      ? `SELECT * FROM scraped_news WHERE source_key = ? ORDER BY pub_date DESC, scraped_at DESC LIMIT 50`
      : `SELECT * FROM scraped_news ORDER BY pub_date DESC, scraped_at DESC LIMIT 100`
    const stmt = sourceFilter
      ? DB.prepare(query).bind(sourceFilter)
      : DB.prepare(query)
    const res = await stmt.all()
    rows = res.results ?? []
  } catch (e) {
    return json({ error: 'DB read error: ' + e.message, items: [] }, 500)
  }

  return json({
    source:    source,
    count:     rows.length,
    updatedAt: rows[0]?.scraped_at ?? null,
    items:     rows,
  })
}

// ── POST: run live scrapers ───────────────────────────────────────────────────

async function runScrape(env, source) {
  const scrapers = {
    fuel:   scrapeFuelDoe,
    more:   scrapeMorePower,
    mcwd:   scrapeMcwd,
    pagasa: scrapePagasa,
    cdrrmo: scrapeCdrrmo,
    news:   scrapeIloiloNews,
  }

  const toRun = source === 'all' ? Object.keys(scrapers) : [source]
  const results = {}

  await Promise.allSettled(
    toRun.map(async (key) => {
      if (!scrapers[key]) { results[key] = { error: 'Unknown source' }; return }
      try {
        const items = await scrapers[key]()
        let saved = 0
        if (env.DB && items.length > 0) {
          saved = await upsertItems(env.DB, key, items)
        }
        results[key] = { scraped: items.length, saved }
      } catch (e) {
        results[key] = { error: e.message }
      }
    })
  )

  const totalScraped = Object.values(results).reduce((s, r) => s + (r.scraped ?? 0), 0)
  const totalSaved   = Object.values(results).reduce((s, r) => s + (r.saved   ?? 0), 0)

  if (env.DB) {
    await writeAudit(env.DB, 'scrape_run', 'scraped_news', null,
      JSON.stringify({ source, totalScraped, totalSaved, results }))
  }

  return json({ ok: true, source, totalScraped, totalSaved, results })
}

// ── Scraper: DOE Fuel Prices (Region 6) ──────────────────────────────────────
// DOE WEPS posts weekly summaries at oilmonitor.doe.gov.ph

async function scrapeFuelDoe() {
  const items = []
  const resp  = await fetchWithTimeout(
    'https://oilmonitor.doe.gov.ph/prices/weekly',
    { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }
  )
  if (!resp.ok) return items
  const html = await resp.text()

  // Extract table rows for Region VI — Iloilo
  // DOE pages use <tr> rows with region labels
  const rowRe = /<tr[^>]*>(.*?)<\/tr>/gis
  const cellRe = /<td[^>]*>([^<]*)<\/td>/gi
  let match
  while ((match = rowRe.exec(html)) !== null) {
    const cells = [...match[1].matchAll(cellRe)].map(m => m[1].trim())
    // Rows typically: [Region, Gasoline min, Gasoline max, Diesel min, Diesel max, Kerosene min, Kerosene max]
    if (cells.length >= 3 && /region\s*(vi|6|iloilo)/i.test(cells[0])) {
      items.push({
        title:    `DOE Fuel Prices — Region VI (${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })})`,
        summary:  `Gasoline: ₱${cells[1]}–${cells[2]}/L · Diesel: ₱${cells[3] ?? '?'}–${cells[4] ?? '?'}/L`,
        url:      'https://oilmonitor.doe.gov.ph/prices/weekly',
        pub_date: new Date().toISOString().slice(0, 10),
        category: 'fuel',
        raw_data: JSON.stringify(cells),
      })
      break
    }
  }

  // Fallback: grab page title / latest bulletin headline
  if (items.length === 0) {
    const h2 = html.match(/<h[12][^>]*>([^<]{10,120})<\/h[12]>/i)
    if (h2) {
      items.push({
        title:    h2[1].trim(),
        summary:  'DOE weekly fuel price bulletin',
        url:      'https://oilmonitor.doe.gov.ph/prices/weekly',
        pub_date: new Date().toISOString().slice(0, 10),
        category: 'fuel',
        raw_data: null,
      })
    }
  }

  return items
}

// ── Scraper: MORE Electric & Power Corp ──────────────────────────────────────

async function scrapeMorePower() {
  const items = []
  const PAGES = [
    'https://www.more.com.ph/advisories/',
    'https://www.more.com.ph/power-interruption-notices/',
  ]

  for (const pageUrl of PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      const html  = await resp.text()
      const posts = scrapeWordPressArchive(html, 'more-power')
      items.push(...posts)
    } catch (_) { continue }
  }

  return items.slice(0, 10)
}

// ── Scraper: Metro Iloilo Water District ─────────────────────────────────────

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
      const html  = await resp.text()
      const posts = scrapeWordPressArchive(html, 'mcwd')
      items.push(...posts)
    } catch (_) { continue }
  }

  return items.slice(0, 10)
}

// ── Scraper: PAGASA Bulletins ─────────────────────────────────────────────────

async function scrapePagasa() {
  const items = []
  const PAGES = [
    { url: 'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast', label: 'weather' },
    { url: 'https://www.pagasa.dost.gov.ph/climate/heat-index',             label: 'heat-index' },
  ]

  for (const { url: pageUrl, label } of PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      const html = await resp.text()

      // Extract <h1>, <h2> bulletin headings from PAGASA pages
      const heads = [...html.matchAll(/<h[123][^>]*class="[^"]*(?:title|heading|bulletin)[^"]*"[^>]*>([^<]{10,200})<\/h[123]>/gi)]
      heads.slice(0, 4).forEach((m, i) => {
        items.push({
          title:    m[1].trim(),
          summary:  `PAGASA ${label} bulletin`,
          url:      pageUrl,
          pub_date: new Date().toISOString().slice(0, 10),
          category: `pagasa-${label}`,
          raw_data: null,
        })
      })

      // Also try standard WordPress archive pattern
      const wps = scrapeWordPressArchive(html, `pagasa-${label}`)
      items.push(...wps)
    } catch (_) { continue }
  }

  return items.slice(0, 10)
}

// ── Scraper: CDRRMO Iloilo City ───────────────────────────────────────────────

async function scrapeCdrrmo() {
  const PAGES = [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/weather-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/',
    'https://cdrrmo.iloilocity.gov.ph/advisories/',
  ]

  const items = []
  for (const pageUrl of PAGES) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (!resp.ok) continue
      const html  = await resp.text()
      const posts = scrapeWordPressArchive(html, 'cdrrmo')
      items.push(...posts)
    } catch (_) { continue }
  }

  return dedupeByTitle(items).slice(0, 12)
}

// ── Scraper: Iloilo Local News ────────────────────────────────────────────────

async function scrapeIloiloNews() {
  const items = []
  const FEEDS = [
    { url: 'https://www.panaynews.net/feed/', source: 'Panay News', isRss: true },
    { url: 'https://thedailyguardian.net/feed/', source: 'Daily Guardian', isRss: true },
    { url: 'https://newsinfo.inquirer.net/tag/iloilo/feed/', source: 'Inquirer', isRss: true },
  ]

  for (const feed of FEEDS) {
    try {
      const resp = await fetchWithTimeout(feed.url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml' },
      })
      if (!resp.ok) continue
      const xml = await resp.text()

      // Parse RSS <item> entries
      const itemRe = /<item[^>]*>(.*?)<\/item>/gis
      let m
      let count = 0
      while ((m = itemRe.exec(xml)) !== null && count < 5) {
        const block   = m[1]
        const title   = stripCdata(xmlTag(block, 'title'))
        const link    = xmlTag(block, 'link') || xmlAttr(block, 'guid', '#')
        const pubDate = xmlTag(block, 'pubDate')
        const desc    = stripHtml(stripCdata(xmlTag(block, 'description') ?? '')).slice(0, 200)

        if (!title) continue

        // Filter for Iloilo-relevant content
        if (!/iloilo|panay|visayas|western visayas|cdrrmo|pagasa/i.test(title + ' ' + desc)) continue

        items.push({
          title:    title.trim(),
          summary:  desc.trim(),
          url:      link?.trim() ?? feed.url,
          pub_date: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          category: 'news',
          raw_data: JSON.stringify({ source: feed.source }),
        })
        count++
      }
    } catch (_) { continue }
  }

  return dedupeByTitle(items).slice(0, 15)
}

// ── WordPress archive helper ──────────────────────────────────────────────────
// Parses <h2 class="entry-title"> and <time class="entry-date"> patterns

function scrapeWordPressArchive(html, sourceKey) {
  const items = []
  const titleRe   = /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const dateRe    = /<time[^>]*class="[^"]*entry-date[^"]*"[^>]*datetime="([^"T]+)/gi
  const excerptRe = /<div[^>]*class="[^"]*entry-summary[^"]*"[^>]*>\s*<p>([^<]{10,300})<\/p>/gi

  const titles   = [...html.matchAll(titleRe)]
  const dates    = [...html.matchAll(dateRe)]
  const excerpts = [...html.matchAll(excerptRe)]

  titles.slice(0, 6).forEach((m, i) => {
    items.push({
      title:    m[2].trim(),
      summary:  excerpts[i]?.[1]?.trim() ?? '',
      url:      m[1],
      pub_date: dates[i]?.[1] ?? new Date().toISOString().slice(0, 10),
      category: sourceKey,
      raw_data: null,
    })
  })

  return items
}

// ── D1 upsert ─────────────────────────────────────────────────────────────────

async function upsertItems(DB, sourceKey, items) {
  // Ensure table exists
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
      const result = await DB.prepare(`
        INSERT INTO scraped_news (source_key, title, summary, url, pub_date, category, raw_data, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(source_key, title) DO UPDATE SET
          summary    = excluded.summary,
          pub_date   = excluded.pub_date,
          raw_data   = excluded.raw_data,
          scraped_at = datetime('now')
      `).bind(
        sourceKey,
        item.title   ?? '',
        item.summary ?? null,
        item.url     ?? null,
        item.pub_date ?? null,
        item.category ?? sourceKey,
        item.raw_data ?? null,
      ).run()
      if (result.changes > 0) saved++
    } catch (_) {}
  }
  return saved
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireOperator(request, env) {
  const auth  = request.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Authentication required' }, 401)

  try {
    const secret = env.JWT_SECRET ?? 'civic-iloilo-CHANGE-THIS-IN-PRODUCTION'
    const parts  = token.split('.')
    if (parts.length !== 3) return json({ error: 'Invalid token' }, 401)
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp < Math.floor(Date.now() / 1000)) return json({ error: 'Token expired' }, 401)
    if (!['operator', 'admin'].includes(payload.role)) return json({ error: 'Insufficient role' }, 403)
    return null // OK
  } catch {
    return json({ error: 'Invalid token' }, 401)
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

function xmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m?.[1] ?? ''
}

function xmlAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, 'i'))
  return m?.[1] ?? ''
}

function stripCdata(s) {
  return (s ?? '').replace(/<![CDATA[\s\S]*?]]>/gi, m => m.slice(9, -3)).trim()
}

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}

function safeJson(req) {
  return req.json().catch(() => ({}))
}
