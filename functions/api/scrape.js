/**
 * GET  /api/scrape?source=all|fuel|more|mcwd|pagasa|cdrrmo|energy|traffic|news|facebook
 * POST /api/scrape  { source: 'all' | specific }   (operator auth required)
 *
 * Unified scraper — each scraper runs independently, one failure never blocks others.
 *
 * Facebook strategy: RSSHub public instance converts FB pages → RSS.
 * No API token required. Falls back gracefully if RSSHub is down.
 * RSSHub routes: https://rsshub.app/facebook/page/{pageSlug}
 *
 * Sources:
 *   fuel     — DOE WEPS weekly fuel bulletin, Region VI pump prices
 *   more     — MORE Electric & Power Corp: website RSS + RSSHub FB feed
 *   mcwd     — Metro Iloilo Water District: website + RSSHub FB feed
 *   pagasa   — PAGASA heat index (numeric) + weather advisories
 *   cdrrmo   — CDRRMO Iloilo City: website + RSSHub FB feed
 *   energy   — DOE/BusinessMirror/Inquirer energy news filtered for Iloilo
 *   traffic  — CDRRMO/CITOM/LTFRB/LTO traffic alerts + news filtered for Iloilo
 *   news     — General Iloilo news (Panay News, Daily Guardian, Inquirer, SunStar, PNA)
 *   facebook — Dedicated: all Iloilo FB pages via RSSHub (MORE, CDRRMO, CITOM,
 *              MCWD, Iloilo City Gov, Panay News, PNA Region VI)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

const UA         = 'CivicIloiloDashboard/1.0 (+https://iloilocity.app)'
const TIMEOUT_MS = 14_000

// ── RSSHub public instances (tried in order, first success wins) ─────────────
// Self-hosting RSSHub on a free Cloudflare Worker is also an option later.
const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rss.laundmo.de',       // community mirror
  'https://rsshub.rssforever.com',
]

// Known Iloilo-relevant Facebook page slugs
// Each entry: { slug, label, sourceKey, filter }
const FB_PAGES = [
  { slug: 'MOREpowerIloilo',      label: 'MORE Power',          sourceKey: 'more-power',  filter: /power|interrupt|outage|advisory|restoration|wesm|pemco/i },
  { slug: 'IloiloCDRRMO',         label: 'CDRRMO Iloilo',       sourceKey: 'cdrrmo',      filter: null },
  { slug: 'CITOMIloilo',          label: 'CITOM Iloilo',        sourceKey: 'traffic',     filter: null },
  { slug: 'MCWDIloiloWater',      label: 'MCWD Water',          sourceKey: 'mcwd',        filter: null },
  { slug: 'iloilocitygov',        label: 'Iloilo City Gov',     sourceKey: 'news',        filter: null },
  { slug: 'PanayNewsOnline',      label: 'Panay News',          sourceKey: 'news',        filter: /iloilo|panay|visayas/i },
  { slug: 'LTFRBRegion6',         label: 'LTFRB Region 6',      sourceKey: 'traffic',     filter: /iloilo|panay|visayas|region.?6/i },
  { slug: 'pnaregion6',           label: 'PNA Region VI',       sourceKey: 'news',        filter: /iloilo|panay|visayas/i },
]

// ── RSSHub helper: try each instance until one works ─────────────────────────
async function fetchRSSHubFeed(pageSlug) {
  for (const base of RSSHUB_INSTANCES) {
    try {
      const url  = `${base}/facebook/page/${pageSlug}`
      const resp = await fetchWithTimeout(url, {
        headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' },
      })
      if (resp.ok) {
        const text = await resp.text()
        // Sanity check — must look like RSS/XML
        if (text.includes('<item') || text.includes('<entry')) return text
      }
    } catch (_) {}
  }
  return null
}

// Parse already-fetched XML string into items
function parseRssXml(xml, sourceKey, maxItems = 8, filterRe = null) {
  const items  = []
  const itemRe = /<item[^>]*>(.*?)<\/item>/gis
  let m, count = 0
  while ((m = itemRe.exec(xml)) !== null && count < maxItems) {
    const block   = m[1]
    const title   = stripCdata(xmlTag(block, 'title')).trim()
    const link    = (xmlTag(block, 'link') || xmlAttr(block, 'guid', 'isPermaLink')).trim()
    const pubDate = xmlTag(block, 'pubDate').trim()
    const desc    = stripHtml(stripCdata(xmlTag(block, 'description') ?? '')).slice(0, 300).trim()
    if (!title) continue
    if (filterRe && !filterRe.test(title + ' ' + desc)) continue
    items.push({
      title,
      summary:  desc,
      url:      link || null,
      pub_date: pubDate ? toIsoDate(pubDate) : isoDate(),
      category: sourceKey,
      raw_data: null,
    })
    count++
  }
  return items
}

// ── Entry point ───────────────────────────────────────────────────────────────

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

// ── GET: cached D1 results ────────────────────────────────────────────────────

async function getCached(DB, source) {
  if (!DB) return json({ error: 'Database not configured', items: [] }, 503)
  // 'facebook' is a virtual source — maps to items across multiple source_keys
  const FB_KEYS = FB_PAGES.map(p => p.sourceKey)
  let stmt
  if (source === 'all') {
    stmt = DB.prepare(`SELECT * FROM scraped_news ORDER BY pub_date DESC, scraped_at DESC LIMIT 200`)
  } else if (source === 'facebook') {
    const placeholders = FB_KEYS.map(() => '?').join(',')
    stmt = DB.prepare(
      `SELECT * FROM scraped_news WHERE source_key IN (${placeholders}) AND raw_data LIKE '%"fb":true%'
       ORDER BY pub_date DESC, scraped_at DESC LIMIT 80`
    ).bind(...FB_KEYS)
  } else {
    stmt = DB.prepare(
      `SELECT * FROM scraped_news WHERE source_key = ? ORDER BY pub_date DESC, scraped_at DESC LIMIT 60`
    ).bind(source)
  }
  try {
    const { results: rows = [] } = await stmt.all()
    return json({ source, count: rows.length, updatedAt: rows[0]?.scraped_at ?? null, items: rows })
  } catch (e) {
    return json({ error: 'DB read error: ' + e.message, items: [] }, 500)
  }
}

// ── POST: run live scrapers ───────────────────────────────────────────────────

async function runScrape(env, source) {
  const scrapers = {
    fuel:     scrapeFuelDoe,
    more:     scrapeMorePower,
    mcwd:     scrapeMcwd,
    pagasa:   scrapePagasaHeatIndex,
    cdrrmo:   scrapeCdrrmo,
    energy:   scrapeEnergyNews,
    traffic:  scrapeTrafficAlerts,
    news:     scrapeIloiloNews,
    facebook: scrapeFacebookPages,   // RSSHub-powered FB scraper
  }

  const toRun   = source === 'all' ? Object.keys(scrapers) : [source]
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

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 1: DOE Fuel Prices — Region VI
// ─────────────────────────────────────────────────────────────────────────────

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
  if (items.length === 0) {
    const h = html.match(/<h[12][^>]*>([^<]{10,120})<\/h[12]>/i)
    if (h) items.push({ title: h[1].trim(), summary: 'DOE weekly fuel price bulletin', url: 'https://oilmonitor.doe.gov.ph/prices/weekly', pub_date: isoDate(), category: 'fuel', raw_data: null })
  }
  return items
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 2: MORE Electric & Power Corp
// Website RSS + WordPress archive + RSSHub Facebook feed
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeMorePower() {
  const items = []
  const MORE_FILTER = /power.?interrupt|outage|schedul|advisory|restoration|load.?shedding|pemco|wesm/i

  // ① Official website RSS feeds
  for (const feedUrl of [
    'https://www.more.com.ph/feed/',
    'https://www.more.com.ph/category/power-interruption-notice/feed/',
    'https://www.more.com.ph/category/advisory/feed/',
  ]) {
    try { items.push(...await parseRssFeed(feedUrl, 'more-power', 6, MORE_FILTER)) } catch (_) {}
  }

  // ② WordPress archive fallback
  for (const pageUrl of [
    'https://www.more.com.ph/power-interruption-notices/',
    'https://www.more.com.ph/advisories/',
  ]) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (resp.ok) items.push(...scrapeWordPressArchive(await resp.text(), 'more-power'))
    } catch (_) {}
  }

  // ③ RSSHub Facebook — MOREpowerIloilo page
  try {
    const xml = await fetchRSSHubFeed('MOREpowerIloilo')
    if (xml) {
      const fbItems = parseRssXml(xml, 'more-power', 8, MORE_FILTER)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'MORE Power FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 15)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 3: Metro Iloilo Water District
// Website + RSSHub Facebook feed
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeMcwd() {
  const items = []

  // ① Official website
  for (const pageUrl of [
    'https://www.mcwd.gov.ph/service-interruptions/',
    'https://www.mcwd.gov.ph/advisories/',
  ]) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (resp.ok) items.push(...scrapeWordPressArchive(await resp.text(), 'mcwd'))
    } catch (_) {}
  }
  try { items.push(...await parseRssFeed('https://www.mcwd.gov.ph/feed/', 'mcwd', 6, null)) } catch (_) {}

  // ② RSSHub Facebook — MCWDIloiloWater page
  try {
    const xml = await fetchRSSHubFeed('MCWDIloiloWater')
    if (xml) {
      const fbItems = parseRssXml(xml, 'mcwd', 8, null)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'MCWD FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 12)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 4: PAGASA — Heat Index + Weather
// ─────────────────────────────────────────────────────────────────────────────

async function scrapePagasaHeatIndex() {
  const items = []

  try {
    const resp = await fetchWithTimeout(
      'https://www.pagasa.dost.gov.ph/climate/heat-index',
      { headers: { 'User-Agent': UA } }
    )
    if (resp.ok) {
      const html     = await resp.text()
      const rowRe    = /<tr[^>]*>(.*?)<\/tr>/gis
      const cellRe   = /<t[dh][^>]*>\s*([^<]{1,100})\s*<\/t[dh]>/gi
      let match
      const heatRows = []
      while ((match = rowRe.exec(html)) !== null) {
        const cells   = [...match[1].matchAll(cellRe)].map(m => stripHtml(m[1]).trim())
        const rowText = cells.join(' ')
        if (/iloilo|western visayas|panay/i.test(rowText)) {
          const numCell = cells.find(c => /^\d{2}(\.\d)?$/.test(c.trim()) && +c >= 28 && +c <= 55)
          if (numCell) heatRows.push({ station: cells[0], value: numCell, level: classifyHeat(+numCell) })
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
      items.push(...scrapeWordPressArchive(html, 'pagasa-heat-index').slice(0, 3))
    }
  } catch (_) {}

  try {
    const resp = await fetchWithTimeout(
      'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast',
      { headers: { 'User-Agent': UA } }
    )
    if (resp.ok) {
      const html    = await resp.text()
      const wvMatch = html.match(/western visayas[^.]{0,300}/i)
      if (wvMatch) items.push({
        title:    `PAGASA Daily Forecast — Western Visayas (${todayPH()})`,
        summary:  stripHtml(wvMatch[0]).slice(0, 250).trim(),
        url:      'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast',
        pub_date: isoDate(),
        category: 'pagasa-weather',
        raw_data: null,
      })
    }
  } catch (_) {}

  try {
    items.push(...await parseRssFeed(
      'https://www.pagasa.dost.gov.ph/index.php?format=feed&type=rss',
      'pagasa-weather', 5, /western visayas|iloilo|panay|visayas/i
    ))
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 5: CDRRMO Iloilo City
// Website subpages + RSS + RSSHub Facebook feed
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeCdrrmo() {
  const items = []

  // ① Official website subpages
  for (const pageUrl of [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/weather-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/',
    'https://cdrrmo.iloilocity.gov.ph/advisories/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/traffic-updates/',
  ]) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (resp.ok) items.push(...scrapeWordPressArchive(await resp.text(), 'cdrrmo'))
    } catch (_) {}
  }

  // ② RSS
  try { items.push(...await parseRssFeed('https://cdrrmo.iloilocity.gov.ph/feed/', 'cdrrmo', 8, null)) } catch (_) {}

  // ③ RSSHub Facebook — IloiloCDRRMO page
  try {
    const xml = await fetchRSSHubFeed('IloiloCDRRMO')
    if (xml) {
      const fbItems = parseRssXml(xml, 'cdrrmo', 10, null)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'CDRRMO FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 18)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 6: Energy News
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeEnergyNews() {
  const items = []
  const ENERGY_FEEDS = [
    { url: 'https://www.doe.gov.ph/index.php?format=feed&type=rss',       source: 'DOE',                filter: /iloilo|region.?6|region.?vi|western visayas|more.?power|pemco|wesm|panay|visayas/i },
    { url: 'https://businessmirror.com.ph/category/energy/feed/',          source: 'BusinessMirror',     filter: /iloilo|region.?6|region.?vi|western visayas|more.?power|panay|visayas/i },
    { url: 'https://business.inquirer.net/tag/power/feed/',                source: 'Inquirer Business',  filter: /iloilo|western visayas|panay|more.?power|visayas/i },
    { url: 'https://www.panaynews.net/category/business/feed/',            source: 'Panay News Business', filter: /power|energy|fuel|electricity|pemco|more.?power|wesm|load.?shed/i },
    { url: 'https://www.panaynews.net/feed/',                              source: 'Panay News',          filter: /power.?interrupt|outage|restoration|load.?shed|energy|fuel|pemco|wesm/i },
  ]
  for (const feed of ENERGY_FEEDS) {
    try {
      const rssItems = await parseRssFeed(feed.url, 'energy', 5, feed.filter)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      items.push(...rssItems)
    } catch (_) {}
  }
  return dedupeByTitle(items).slice(0, 15)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 7: Traffic & Accident Alerts
// CDRRMO + CITOM (RSSHub FB) + LTFRB + LTO + news RSS
// ─────────────────────────────────────────────────────────────────────────────

const TRAFFIC_KW = /traffic|accident|crash|collision|reroute|re-route|road.?clos|closed|checkpoint|congestion|vehicular|pileup|pile.?up|ltfrb|lto.?region|citom|enforce/i
const ILOILO_KW  = /iloilo|panay|western visayas|region.?6|diversion|molo|jaro|mandurriao|lapuz|la paz|pavia/i

async function scrapeTrafficAlerts() {
  const items = []

  // ① CDRRMO traffic subpages
  for (const pageUrl of [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/traffic-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/incidents/',
  ]) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } })
      if (resp.ok) items.push(...scrapeWordPressArchive(await resp.text(), 'traffic'))
    } catch (_) {}
  }

  // ② RSSHub Facebook — CITOM Iloilo (primary traffic source)
  try {
    const xml = await fetchRSSHubFeed('CITOMIloilo')
    if (xml) {
      const fbItems = parseRssXml(xml, 'traffic', 10, null)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'CITOM FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  // ③ RSSHub Facebook — LTFRB Region 6
  try {
    const xml = await fetchRSSHubFeed('LTFRBRegion6')
    if (xml) {
      const fbItems = parseRssXml(xml, 'traffic', 6, ILOILO_KW)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'LTFRB R6 FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  // ④ LTFRB website search
  try {
    const resp = await fetchWithTimeout('https://ltfrb.gov.ph/?s=iloilo', { headers: { 'User-Agent': UA } })
    if (resp.ok) {
      items.push(...scrapeWordPressArchive(await resp.text(), 'traffic')
        .filter(p => ILOILO_KW.test(p.title + ' ' + (p.summary ?? ''))))
    }
  } catch (_) {}

  // ⑤ LTO advisories
  try {
    const resp = await fetchWithTimeout('https://lto.gov.ph/index.php/news-and-advisories/advisory.html', { headers: { 'User-Agent': UA } })
    if (resp.ok) {
      items.push(...scrapeWordPressArchive(await resp.text(), 'traffic')
        .filter(p => ILOILO_KW.test(p.title + ' ' + (p.summary ?? ''))))
    }
  } catch (_) {}

  // ⑥ News RSS — double-filter traffic + Iloilo
  for (const feed of [
    { url: 'https://www.panaynews.net/feed/',     source: 'Panay News'    },
    { url: 'https://thedailyguardian.net/feed/',  source: 'Daily Guardian' },
    { url: 'https://www.philstar.com/rss/nation', source: 'PhilStar'      },
  ]) {
    try {
      const rssItems = await parseRssFeedDouble(feed.url, 'traffic', 5, TRAFFIC_KW, ILOILO_KW)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      items.push(...rssItems)
    } catch (_) {}
  }

  // ⑦ Inquirer Iloilo — traffic filter
  try {
    const rssItems = await parseRssFeed(
      'https://newsinfo.inquirer.net/tag/iloilo/feed/',
      'traffic', 5,
      /accident|crash|collision|reroute|traffic|road.?clos|checkpoint|citom|lto|ltfrb/i
    )
    rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'Inquirer' }) })
    items.push(...rssItems)
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 18)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 8: General Iloilo News
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeIloiloNews() {
  const items = []
  const ILOILO_FILTER = /iloilo|panay|visayas|western visayas|cdrrmo|pagasa|iloilo city/i
  const FEEDS = [
    { url: 'https://www.panaynews.net/feed/',                        source: 'Panay News'     },
    { url: 'https://thedailyguardian.net/feed/',                     source: 'Daily Guardian' },
    { url: 'https://newsinfo.inquirer.net/tag/iloilo/feed/',         source: 'Inquirer'       },
    { url: 'https://www.sunstar.com.ph/iloilo/rss.xml',              source: 'SunStar Iloilo' },
    { url: 'https://www.pna.gov.ph/rss/articles?region=Region%20VI', source: 'PNA Region VI'  },
  ]
  for (const feed of FEEDS) {
    try {
      const rssItems = await parseRssFeed(feed.url, 'news', 5, ILOILO_FILTER)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      items.push(...rssItems)
    } catch (_) {}
  }

  // RSSHub: Iloilo City Gov FB + PNA Region VI FB + Panay News FB
  const FB_NEWS_PAGES = [
    { slug: 'iloilocitygov',   source: 'Iloilo City Gov FB' },
    { slug: 'PanayNewsOnline', source: 'Panay News FB'      },
    { slug: 'pnaregion6',      source: 'PNA Region VI FB'   },
  ]
  for (const page of FB_NEWS_PAGES) {
    try {
      const xml = await fetchRSSHubFeed(page.slug)
      if (xml) {
        const fbItems = parseRssXml(xml, 'news', 6, ILOILO_FILTER)
        fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: page.source, fb: true }) })
        items.push(...fbItems)
      }
    } catch (_) {}
  }

  return dedupeByTitle(items).slice(0, 25)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 9: Facebook Pages — dedicated source (all Iloilo FB pages via RSSHub)
// Stores items under their natural source_key with fb:true in raw_data.
// Running this source separately allows admins to test FB connectivity alone.
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeFacebookPages() {
  const items    = []
  const results  = []

  await Promise.allSettled(
    FB_PAGES.map(async (page) => {
      try {
        const xml = await fetchRSSHubFeed(page.slug)
        if (!xml) {
          results.push({ page: page.slug, ok: false, reason: 'No response from RSSHub' })
          return
        }
        const parsed = parseRssXml(xml, page.sourceKey, 8, page.filter)
        parsed.forEach(i => {
          i.raw_data = JSON.stringify({ source: `${page.label} (FB)`, fb: true, fbPage: page.slug })
        })
        items.push(...parsed)
        results.push({ page: page.slug, ok: true, count: parsed.length })
      } catch (e) {
        results.push({ page: page.slug, ok: false, reason: e.message })
      }
    })
  )

  // Attach RSSHub health summary to first item so admin can see what worked
  if (items.length > 0) {
    items[0]._rsshub_health = results
  }

  return dedupeByTitle(items).slice(0, 50)
}

// ── RSS helpers ───────────────────────────────────────────────────────────────

async function parseRssFeed(feedUrl, sourceKey, maxItems = 8, filterRe = null) {
  const resp = await fetchWithTimeout(feedUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  })
  if (!resp.ok) return []
  return parseRssXml(await resp.text(), sourceKey, maxItems, filterRe)
}

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
    items.push({ title, summary: desc, url: link || null, pub_date: pubDate ? toIsoDate(pubDate) : isoDate(), category: sourceKey, raw_data: null })
    count++
  }
  return items
}

// ── WordPress archive helper ───────────────────────────────────────────────────

function scrapeWordPressArchive(html, sourceKey) {
  const items     = []
  const titleRe   = /<h[23][^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const dateRe    = /<time[^>]*class="[^"]*entry-date[^"]*"[^>]*datetime="([^"T]+)/gi
  const excerptRe = /<div[^>]*class="[^"]*entry-(?:summary|content)[^"]*"[^>]*>\s*<p>([^<]{10,300})<\/p>/gi
  const titles    = [...html.matchAll(titleRe)]
  const dates     = [...html.matchAll(dateRe)]
  const excerpts  = [...html.matchAll(excerptRe)]
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

// ── D1 upsert ──────────────────────────────────────────────────────────────────

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

// ── Auth ───────────────────────────────────────────────────────────────────────

async function requireOperator(request, env) {
  const auth  = request.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Authentication required' }, 401)
  try {
    if (token === env.SCRAPE_SECRET) return null
    const parts   = token.split('.')
    if (parts.length !== 3) return json({ error: 'Invalid token' }, 401)
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp < Math.floor(Date.now() / 1000)) return json({ error: 'Token expired' }, 401)
    if (!['operator', 'admin'].includes(payload.role)) return json({ error: 'Insufficient role' }, 403)
    return null
  } catch { return json({ error: 'Invalid token' }, 401) }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

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

function isoDate()      { return new Date().toISOString().slice(0, 10) }
function todayPH()      { return new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
function toIsoDate(str) { try { return new Date(str).toISOString().slice(0, 10) } catch { return isoDate() } }

function xmlTag(xml, tag)         { return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? '' }
function xmlAttr(xml, tag, attr)  { return xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, 'i'))?.[1] ?? '' }
function stripCdata(s)            { return (s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, (_, c) => c).trim() }
function stripHtml(s)             { return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }

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
