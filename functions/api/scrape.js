/**
 * GET  /api/scrape?source=all|fuel|more|mcwd|pagasa|cdrrmo|energy|traffic|news|facebook
 * GET  /api/scrape?source=news&limit=40   (optional limit param, default 60)
 * POST /api/scrape  { source: 'all' | specific }   (operator auth required)
 * POST /api/scrape  { source: 'purge_gambling' }    (operator auth required) — deletes gambling rows from DB
 *
 * Unified scraper — each scraper runs independently, one failure never blocks others.
 * All timestamps stored in PHT (Asia/Manila, UTC+8).
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

const UA           = 'CivicIloiloDashboard/1.0 (+https://iloilocity.app)'
const TIMEOUT_MS   = 18_000
const FEED_TIMEOUT = 10_000

// ── PHT helpers (UTC+8) ──────────────────────────────────────────────────────
// All timestamps stored in PHT so relativeTime() in the UI is always correct.
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000

function phtNow()         { return new Date(Date.now() + PHT_OFFSET_MS) }
function isoDatetimePHT() { return phtNow().toISOString().replace('T', ' ').slice(0, 19) }
function isoDatePHT()     { return phtNow().toISOString().slice(0, 10) }
function todayPHT()       { return phtNow().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }

// Keep old aliases used across scrapers
const isoDatetime = isoDatetimePHT
const isoDate     = isoDatePHT
const todayPH     = todayPHT

function toIsoDatetime(str) {
  try {
    const d = new Date(str)
    if (isNaN(d)) return isoDatetimePHT()
    // If the source string has no timezone info assume PHT already;
    // if it has Z / offset, convert correctly to PHT wall-clock
    const hasTz = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(str.trim())
    if (hasTz) return new Date(d.getTime() + PHT_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 19)
    return d.toISOString().replace('T', ' ').slice(0, 19)
  } catch { return isoDatetimePHT() }
}

// ── Gambling / casino content blocklist ─────────────────────────────────────
const GAMBLING_BLOCKLIST = /\b(casino|gambling|gambl(?:e|ing|er)|slot\s*machine|poker|baccarat|roulette|lotto(?!\s*result)|e-?sabong|sabong|cockfight|cockpit|PAGCOR|PCSO|sweepstake|jueteng|mahjong\s*den|illegal\s*numbers?\s*game|bet(?:ting|tor)|sportsbook|online\s*casino|casino\s*plus|casinoplus|bingo\s*plus|bingoplus|\bBingo\b(?!\s*(?:hall|game|card|night))|PhilWeb|Lucky\s*Cola|Okbet|Megawin|Jilibet|Hawkplay|Lodibet|Winfordbet|Nuebe(?:gaming)?|phlwin|22bet|tmtplay|peso123|pinasbet)\b/i

function isGamblingNews(item) {
  return GAMBLING_BLOCKLIST.test(`${item.title ?? ''} ${item.summary ?? ''}`)
}
function filterGambling(items) {
  return items.filter(i => !isGamblingNews(i))
}

// ── RSSHub public instances ──────────────────────────────────────────────────
const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rss.laundmo.de',
  'https://rsshub.rssforever.com',
  'https://hub.slarker.me',
  'https://rsshub.woodland.cafe',
]

const FB_PAGES = [
  { slug: 'MOREpowerIloilo',   label: 'MORE Power',      sourceKey: 'more-power', filter: /power|interrupt|outage|advisory|restoration|wesm|pemco/i },
  { slug: 'IloiloCDRRMO',      label: 'CDRRMO Iloilo',   sourceKey: 'cdrrmo',     filter: null },
  { slug: 'CITOMIloilo',       label: 'CITOM Iloilo',    sourceKey: 'traffic',    filter: null },
  { slug: 'MCWDIloiloWater',   label: 'MCWD Water',      sourceKey: 'mcwd',       filter: null },
  { slug: 'iloilocitygov',     label: 'Iloilo City Gov', sourceKey: 'news',       filter: null },
  { slug: 'PanayNewsOnline',   label: 'Panay News',      sourceKey: 'news',       filter: /iloilo|panay|visayas/i },
  { slug: 'LTFRBRegion6',      label: 'LTFRB Region 6',  sourceKey: 'traffic',    filter: /iloilo|panay|visayas|region.?6/i },
  { slug: 'pnaregion6',        label: 'PNA Region VI',   sourceKey: 'news',       filter: /iloilo|panay|visayas/i },
  { slug: 'GMANewsTV',         label: 'GMA News',        sourceKey: 'news',       filter: /iloilo|panay|visayas|western visayas/i },
  { slug: 'sunstariloilo',     label: 'SunStar Iloilo',  sourceKey: 'news',       filter: null },
]

// ── RSSHub helper ─────────────────────────────────────────────────────────────
async function fetchRSSHubFeed(pageSlug) {
  for (const base of RSSHUB_INSTANCES) {
    try {
      const url  = `${base}/facebook/page/${pageSlug}`
      const resp = await fetchWithTimeout(url, {
        headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' },
      }, FEED_TIMEOUT)
      if (resp.ok) {
        const text = await resp.text()
        if (text.includes('<item') || text.includes('<entry')) return text
      }
    } catch (_) {}
  }
  return null
}

// ── Parse RSS 2.0 + Atom 1.0 ─────────────────────────────────────────────────
function parseRssXml(xml, sourceKey, maxItems = 8, filterRe = null) {
  const items  = []
  const itemRe = /<item[^>]*>(.*?)<\/item>/gis
  let m
  while ((m = itemRe.exec(xml)) !== null && items.length < maxItems) {
    const block   = m[1]
    const title   = stripCdata(xmlTag(block, 'title')).trim()
    const link    = (stripCdata(xmlTag(block, 'link')) || xmlAttr(block, 'guid', 'isPermaLink') || xmlAttr(block, 'enclosure', 'url')).trim()
    const pubDate = xmlTag(block, 'pubDate').trim() || xmlTag(block, 'dc:date').trim()
    const desc    = stripHtml(stripCdata(xmlTag(block, 'description') ?? '')).slice(0, 400).trim()
    if (!title) continue
    if (filterRe && !filterRe.test(title + ' ' + desc)) continue
    items.push({ title, summary: desc, url: link || null, pub_date: pubDate ? toIsoDatetime(pubDate) : isoDatetimePHT(), category: sourceKey, raw_data: null })
  }
  if (items.length === 0) {
    const entryRe = /<entry[^>]*>(.*?)<\/entry>/gis
    while ((m = entryRe.exec(xml)) !== null && items.length < maxItems) {
      const block   = m[1]
      const title   = stripCdata(xmlTag(block, 'title')).trim()
      const link    = xmlAttr(block, 'link', 'href') || stripCdata(xmlTag(block, 'id')).trim()
      const updated = xmlTag(block, 'updated').trim() || xmlTag(block, 'published').trim()
      const desc    = stripHtml(stripCdata(xmlTag(block, 'summary') || xmlTag(block, 'content') || '')).slice(0, 400).trim()
      if (!title) continue
      if (filterRe && !filterRe.test(title + ' ' + desc)) continue
      items.push({ title, summary: desc, url: link || null, pub_date: updated ? toIsoDatetime(updated) : isoDatetimePHT(), category: sourceKey, raw_data: null })
    }
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
  const limit  = parseInt(url.searchParams.get('limit') ?? '0', 10) || null

  if (method === 'GET')  return getCached(env.DB, source, limit)
  if (method === 'POST') {
    const authError = await requireOperator(request, env)
    if (authError) return authError
    if (source === 'purge_gambling') return purgeGamblingRows(env.DB)
    return runScrape(env, source)
  }
  return json({ error: 'Method not allowed' }, 405)
}

// ── GET: cached D1 results ────────────────────────────────────────────────────
async function getCached(DB, source, limit = null) {
  if (!DB) return json({ error: 'Database not configured', items: [] }, 503)
  const FB_KEYS = FB_PAGES.map(p => p.sourceKey)
  const cap     = limit ?? (source === 'all' ? 200 : 60)
  let stmt
  if (source === 'all') {
    stmt = DB.prepare(`SELECT * FROM scraped_news ORDER BY scraped_at DESC, pub_date DESC LIMIT ${cap}`)
  } else if (source === 'facebook') {
    const placeholders = FB_KEYS.map(() => '?').join(',')
    stmt = DB.prepare(
      `SELECT * FROM scraped_news WHERE source_key IN (${placeholders}) AND raw_data LIKE '%"fb":true%'
       ORDER BY scraped_at DESC, pub_date DESC LIMIT ${cap}`
    ).bind(...FB_KEYS)
  } else {
    stmt = DB.prepare(
      `SELECT * FROM scraped_news WHERE source_key = ? ORDER BY scraped_at DESC, pub_date DESC LIMIT ${cap}`
    ).bind(source)
  }
  try {
    const { results: rows = [] } = await stmt.all()
    const filtered = filterGambling(rows)
    return json({ source, count: filtered.length, updatedAt: filtered[0]?.scraped_at ?? null, items: filtered })
  } catch (e) {
    return json({ error: 'DB read error: ' + e.message, items: [] }, 500)
  }
}

// ── POST: purge gambling rows ─────────────────────────────────────────────────
async function purgeGamblingRows(DB) {
  if (!DB) return json({ error: 'Database not configured' }, 503)
  try {
    const { results: rows = [] } = await DB.prepare('SELECT id, title, summary FROM scraped_news').all()
    const badIds = rows.filter(r => isGamblingNews(r)).map(r => r.id)
    if (badIds.length === 0) return json({ ok: true, purged: 0, message: 'No gambling rows found' })
    const chunks = []
    for (let i = 0; i < badIds.length; i += 50) chunks.push(badIds.slice(i, i + 50))
    let purged = 0
    for (const chunk of chunks) {
      const placeholders = chunk.map(() => '?').join(',')
      const r = await DB.prepare(`DELETE FROM scraped_news WHERE id IN (${placeholders})`).bind(...chunk).run()
      purged += r.changes ?? 0
    }
    return json({ ok: true, purged, message: `Deleted ${purged} gambling rows from DB` })
  } catch (e) {
    return json({ error: 'Purge error: ' + e.message }, 500)
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
    facebook: scrapeFacebookPages,
  }

  const toRun   = source === 'all' ? Object.keys(scrapers) : [source]
  const results = {}

  await Promise.allSettled(
    toRun.map(async (key) => {
      if (!scrapers[key]) { results[key] = { error: 'Unknown source' }; return }
      try {
        const raw   = await scrapers[key]()
        const items = filterGambling(raw)
        const saved = (env.DB && items.length > 0) ? await upsertItems(env.DB, key, items) : 0
        results[key] = { scraped: raw.length, filtered: raw.length - items.length, saved }
      } catch (e) {
        results[key] = { error: e.message }
      }
    })
  )

  const totalScraped  = Object.values(results).reduce((s, r) => s + (r.scraped  ?? 0), 0)
  const totalFiltered = Object.values(results).reduce((s, r) => s + (r.filtered ?? 0), 0)
  const totalSaved    = Object.values(results).reduce((s, r) => s + (r.saved    ?? 0), 0)

  if (env.DB) await writeAudit(env.DB, 'scrape_run', 'scraped_news', null,
    JSON.stringify({ source, totalScraped, totalFiltered, totalSaved, results }))

  return json({ ok: true, source, totalScraped, totalFiltered, totalSaved, results })
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
        title:    `DOE Fuel Prices — Region VI (${todayPHT()})`,
        summary:  `Gasoline: ₱${cells[1]}–${cells[2]}/L · Diesel: ₱${cells[3] ?? '?'}–${cells[4] ?? '?'}/L`,
        url:      'https://oilmonitor.doe.gov.ph/prices/weekly',
        pub_date: isoDatetimePHT(),
        category: 'fuel',
        raw_data: JSON.stringify(cells),
      })
      break
    }
  }
  if (items.length === 0) {
    const h = html.match(/<h[12][^>]*>([^<]{10,120})<\/h[12]>/i)
    if (h) items.push({ title: h[1].trim(), summary: 'DOE weekly fuel price bulletin', url: 'https://oilmonitor.doe.gov.ph/prices/weekly', pub_date: isoDatetimePHT(), category: 'fuel', raw_data: null })
  }
  return items
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 2: MORE Electric & Power Corp
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeMorePower() {
  const items       = []
  const MORE_FILTER = /power.?interrupt|outage|schedul|advisory|restoration|load.?shedding|pemco|wesm/i

  const feedJobs = [
    () => parseRssFeed('https://www.more.com.ph/feed/',                                   'more-power', 6, MORE_FILTER),
    () => parseRssFeed('https://www.more.com.ph/category/power-interruption-notice/feed/', 'more-power', 6, MORE_FILTER),
    () => parseRssFeed('https://www.more.com.ph/category/advisory/feed/',                  'more-power', 6, MORE_FILTER),
  ]
  const feedResults = await Promise.allSettled(feedJobs.map(f => f()))
  feedResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })

  for (const pageUrl of [
    'https://www.more.com.ph/power-interruption-notices/',
    'https://www.more.com.ph/advisories/',
  ]) {
    try {
      const resp = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } }, FEED_TIMEOUT)
      if (resp.ok) items.push(...scrapeWordPressArchive(await resp.text(), 'more-power'))
    } catch (_) {}
  }

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
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeMcwd() {
  const items = []

  const pageJobs = [
    'https://www.mcwd.gov.ph/service-interruptions/',
    'https://www.mcwd.gov.ph/advisories/',
  ].map(url => fetchWithTimeout(url, { headers: { 'User-Agent': UA } }, FEED_TIMEOUT)
      .then(r => r.ok ? r.text() : '').then(html => html ? scrapeWordPressArchive(html, 'mcwd') : []).catch(() => []))
  ;(await Promise.all(pageJobs)).flat().forEach(i => items.push(i))

  try { items.push(...await parseRssFeed('https://www.mcwd.gov.ph/feed/', 'mcwd', 6, null)) } catch (_) {}

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
// Title always includes PHT date so each day's entry is treated as NEW (not deduped).
// ─────────────────────────────────────────────────────────────────────────────
async function scrapePagasaHeatIndex() {
  const items = []
  const today = isoDatePHT()    // e.g. "2026-05-05" — appended to titles so each day is unique

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
          // Date in title = unique key per day, so the row is treated as a new entry each day
          title:    `PAGASA Heat Index — Iloilo: ${best.value}°C (${best.level}) [${today}]`,
          summary:  heatRows.map(r => `${r.station}: ${r.value}°C — ${r.level}`).join(' | '),
          url:      'https://www.pagasa.dost.gov.ph/climate/heat-index',
          pub_date: isoDatetimePHT(),
          category: 'pagasa-heat-index',
          raw_data: JSON.stringify(heatRows),
        })
      } else {
        const matches = [...html.matchAll(/(?:iloilo|western visayas)[^.]{0,120}?\d{2}(?:\.\d)?°?\s*(?:degrees|c\b)/gi)]
        if (matches.length > 0) {
          items.push({
            title:    `PAGASA Heat Index Advisory — ${todayPHT()} [${today}]`,
            summary:  matches.slice(0, 3).map(m => m[0].trim()).join(' | '),
            url:      'https://www.pagasa.dost.gov.ph/climate/heat-index',
            pub_date: isoDatetimePHT(),
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
        // Date in title = unique key per day
        title:    `PAGASA Daily Forecast — Western Visayas [${today}]`,
        summary:  stripHtml(wvMatch[0]).slice(0, 250).trim(),
        url:      'https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast',
        pub_date: isoDatetimePHT(),
        category: 'pagasa-weather',
        raw_data: null,
      })
    }
  } catch (_) {}

  for (const feedUrl of [
    'https://www.pagasa.dost.gov.ph/index.php?format=feed&type=rss',
    'https://www.pagasa.dost.gov.ph/index.php?format=feed&type=atom',
  ]) {
    try {
      items.push(...await parseRssFeed(feedUrl, 'pagasa-weather', 5, /western visayas|iloilo|panay|visayas/i))
    } catch (_) {}
  }

  return dedupeByTitle(items).slice(0, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 5: CDRRMO Iloilo City
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeCdrrmo() {
  const items = []

  const pageUrls = [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/weather-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/',
    'https://cdrrmo.iloilocity.gov.ph/advisories/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/traffic-updates/',
  ]
  const pageResults = await Promise.allSettled(
    pageUrls.map(url => fetchWithTimeout(url, { headers: { 'User-Agent': UA } }, FEED_TIMEOUT)
      .then(r => r.ok ? r.text() : '').then(html => html ? scrapeWordPressArchive(html, 'cdrrmo') : []).catch(() => []))
  )
  pageResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })

  try { items.push(...await parseRssFeed('https://cdrrmo.iloilocity.gov.ph/feed/', 'cdrrmo', 8, null)) } catch (_) {}

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
    { url: 'https://www.doe.gov.ph/index.php?format=feed&type=rss',         source: 'DOE',                  filter: /iloilo|region.?6|region.?vi|western visayas|more.?power|pemco|wesm|panay|visayas/i },
    { url: 'https://www.doe.gov.ph/index.php?format=feed&type=atom',        source: 'DOE Atom',             filter: /iloilo|region.?6|region.?vi|western visayas|more.?power|pemco|wesm|panay|visayas/i },
    { url: 'https://businessmirror.com.ph/category/energy/feed/',            source: 'BusinessMirror',       filter: /iloilo|region.?6|region.?vi|western visayas|more.?power|panay|visayas/i },
    { url: 'https://business.inquirer.net/tag/power/feed/',                  source: 'Inquirer Business',    filter: /iloilo|western visayas|panay|more.?power|visayas/i },
    { url: 'https://www.panaynews.net/category/business/feed/',              source: 'Panay News Business',  filter: /power|energy|fuel|electricity|pemco|more.?power|wesm|load.?shed/i },
    { url: 'https://www.panaynews.net/feed/',                                source: 'Panay News',           filter: /power.?interrupt|outage|restoration|load.?shed|energy|fuel|pemco|wesm/i },
    { url: 'https://www.bworldonline.com/feed/',                             source: 'BusinessWorld',        filter: /iloilo|region.?6|western visayas|more.?power|pemco|wesm|panay/i },
  ]
  const feedResults = await Promise.allSettled(
    ENERGY_FEEDS.map(async (feed) => {
      const rssItems = await parseRssFeed(feed.url, 'energy', 5, feed.filter)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      return rssItems
    })
  )
  feedResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })
  return dedupeByTitle(items).slice(0, 15)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 7: Traffic & Accident Alerts
// ─────────────────────────────────────────────────────────────────────────────
const TRAFFIC_KW = /traffic|accident|crash|collision|reroute|re-route|road.?clos|closed|checkpoint|congestion|vehicular|pileup|pile.?up|ltfrb|lto.?region|citom|enforce/i
const ILOILO_KW  = /iloilo|panay|western visayas|region.?6|diversion|molo|jaro|mandurriao|lapuz|la paz|pavia/i

async function scrapeTrafficAlerts() {
  const items = []

  const cdrrmoPages = [
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/traffic-updates/',
    'https://cdrrmo.iloilocity.gov.ph/fb-updates/incidents/',
  ]
  const pageResults = await Promise.allSettled(
    cdrrmoPages.map(url => fetchWithTimeout(url, { headers: { 'User-Agent': UA } }, FEED_TIMEOUT)
      .then(r => r.ok ? r.text() : '').then(html => html ? scrapeWordPressArchive(html, 'traffic') : []).catch(() => []))
  )
  pageResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })

  try {
    const xml = await fetchRSSHubFeed('CITOMIloilo')
    if (xml) {
      const fbItems = parseRssXml(xml, 'traffic', 10, null)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'CITOM FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  try {
    const xml = await fetchRSSHubFeed('LTFRBRegion6')
    if (xml) {
      const fbItems = parseRssXml(xml, 'traffic', 6, ILOILO_KW)
      fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'LTFRB R6 FB', fb: true }) })
      items.push(...fbItems)
    }
  } catch (_) {}

  const newsFeeds = [
    { url: 'https://www.panaynews.net/feed/',     source: 'Panay News'     },
    { url: 'https://thedailyguardian.net/feed/',  source: 'Daily Guardian'  },
    { url: 'https://www.philstar.com/rss/nation', source: 'PhilStar'        },
    { url: 'https://www.mb.com.ph/feed/',         source: 'Manila Bulletin'  },
  ]
  const feedResults = await Promise.allSettled(
    newsFeeds.map(async (feed) => {
      const rssItems = await parseRssFeedDouble(feed.url, 'traffic', 5, TRAFFIC_KW, ILOILO_KW)
      rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
      return rssItems
    })
  )
  feedResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })

  try {
    const rssItems = await parseRssFeed(
      'https://newsinfo.inquirer.net/tag/iloilo/feed/',
      'traffic', 5,
      /accident|crash|collision|reroute|traffic|road.?clos|checkpoint|citom|lto|ltfrb/i
    )
    rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: 'Inquirer' }) })
    items.push(...rssItems)
  } catch (_) {}

  return dedupeByTitle(items).slice(0, 20)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 8: General Iloilo News
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeIloiloNews() {
  const items = []
  const IL    = /iloilo|panay|visayas|western visayas|cdrrmo|pagasa|iloilo city/i

  const FEEDS = [
    { url: 'https://www.panaynews.net/feed/',                          source: 'Panay News',        filter: IL },
    { url: 'https://www.panaynews.net/category/local/feed/',           source: 'Panay News Local',  filter: IL },
    { url: 'https://thedailyguardian.net/feed/',                       source: 'Daily Guardian',    filter: IL },
    { url: 'https://www.sunstar.com.ph/iloilo/rss.xml',                source: 'SunStar Iloilo',   filter: null },
    { url: 'https://newsinfo.inquirer.net/tag/iloilo/feed/',            source: 'Inquirer',          filter: null },
    { url: 'https://www.pna.gov.ph/rss/articles?region=Region%20VI',   source: 'PNA Region VI',     filter: null },
    { url: 'https://www.gmanetwork.com/news/rss/region_iloilo.xml',    source: 'GMA Iloilo',        filter: null },
    { url: 'https://www.rappler.com/places/regions/western-visayas/feed/', source: 'Rappler W.Vis', filter: IL },
    { url: 'https://www.mb.com.ph/feed/',                              source: 'Manila Bulletin',   filter: IL },
    { url: 'https://www.philstar.com/rss/headlines',                   source: 'PhilStar',          filter: IL },
    { url: 'https://www.philstar.com/rss/nation',                      source: 'PhilStar Nation',   filter: IL },
    { url: 'https://www.bworldonline.com/feed/',                       source: 'BusinessWorld',     filter: IL },
    { url: 'https://www.pna.gov.ph/rss/articles?region=Region%20VI&format=atom', source: 'PNA Region VI (Atom)', filter: null },
    { url: 'https://iloilocity.gov.ph/feed/',                          source: 'Iloilo City Gov',   filter: null },
  ]

  const feedResults = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const rssItems = await parseRssFeed(feed.url, 'news', 6, feed.filter)
        rssItems.forEach(i => { i.raw_data = JSON.stringify({ source: feed.source }) })
        return rssItems
      } catch (_) { return [] }
    })
  )
  feedResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })

  try {
    const resp = await fetchWithTimeout('https://iloilocity.gov.ph/news/', { headers: { 'User-Agent': UA } }, FEED_TIMEOUT)
    if (resp.ok) items.push(...scrapeWordPressArchive(await resp.text(), 'news'))
  } catch (_) {}

  const FB_NEWS = [
    { slug: 'iloilocitygov',   source: 'Iloilo City Gov FB'  },
    { slug: 'PanayNewsOnline', source: 'Panay News FB'        },
    { slug: 'pnaregion6',      source: 'PNA Region VI FB'     },
    { slug: 'GMANewsTV',       source: 'GMA News FB'          },
    { slug: 'sunstariloilo',   source: 'SunStar Iloilo FB'    },
  ]
  const fbResults = await Promise.allSettled(
    FB_NEWS.map(async (page) => {
      try {
        const xml = await fetchRSSHubFeed(page.slug)
        if (!xml) return []
        const fbItems = parseRssXml(xml, 'news', 6, IL)
        fbItems.forEach(i => { i.raw_data = JSON.stringify({ source: page.source, fb: true }) })
        return fbItems
      } catch (_) { return [] }
    })
  )
  fbResults.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value) })

  return dedupeByTitle(items).slice(0, 40)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER 9: Facebook Pages — dedicated source
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeFacebookPages() {
  const items   = []
  const results = []

  await Promise.allSettled(
    FB_PAGES.map(async (page) => {
      try {
        const xml = await fetchRSSHubFeed(page.slug)
        if (!xml) { results.push({ page: page.slug, ok: false, reason: 'No response from RSSHub' }); return }
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

  if (items.length > 0) items[0]._rsshub_health = results
  return dedupeByTitle(items).slice(0, 50)
}

// ── RSS helpers ───────────────────────────────────────────────────────────────
async function parseRssFeed(feedUrl, sourceKey, maxItems = 8, filterRe = null) {
  const resp = await fetchWithTimeout(feedUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
  }, FEED_TIMEOUT)
  if (!resp.ok) return []
  return parseRssXml(await resp.text(), sourceKey, maxItems, filterRe)
}

async function parseRssFeedDouble(feedUrl, sourceKey, maxItems = 8, filterA, filterB) {
  const resp = await fetchWithTimeout(feedUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
  }, FEED_TIMEOUT)
  if (!resp.ok) return []
  const xml    = await resp.text()
  const items  = []
  const itemRe = /<item[^>]*>(.*?)<\/item>/gis
  let m
  while ((m = itemRe.exec(xml)) !== null && items.length < maxItems) {
    const block   = m[1]
    const title   = stripCdata(xmlTag(block, 'title')).trim()
    const link    = (stripCdata(xmlTag(block, 'link')) || xmlAttr(block, 'guid', 'isPermaLink')).trim()
    const pubDate = xmlTag(block, 'pubDate').trim() || xmlTag(block, 'dc:date').trim()
    const desc    = stripHtml(stripCdata(xmlTag(block, 'description') ?? '')).slice(0, 250).trim()
    const text    = title + ' ' + desc
    if (!title) continue
    if (filterA && !filterA.test(text)) continue
    if (filterB && !filterB.test(text)) continue
    items.push({ title, summary: desc, url: link || null, pub_date: pubDate ? toIsoDatetime(pubDate) : isoDatetimePHT(), category: sourceKey, raw_data: null })
  }
  return items
}

// ── WordPress archive helper ───────────────────────────────────────────────────
function scrapeWordPressArchive(html, sourceKey) {
  const items = []
  const seen  = new Set()

  function addItem(title, url, pubDate, excerpt) {
    const key = normalizeTitle(title)
    if (!title || !key || seen.has(key)) return
    seen.add(key)
    items.push({ title: title.trim(), summary: excerpt?.trim() ?? '', url, pub_date: pubDate ? toIsoDatetime(pubDate) : isoDatetimePHT(), category: sourceKey, raw_data: null })
  }

  const titleReA   = /<h[2-4][^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const dateReA    = /<time[^>]*(?:class="[^"]*entry-date[^"]*"[^>]*datetime|datetime)="([^"]+)"/gi
  const excerptReA = /<div[^>]*class="[^"]*entry-(?:summary|content|excerpt)[^"]*"[^>]*>\s*<p>([^<]{10,400})<\/p>/gi
  const titlesA    = [...html.matchAll(titleReA)]
  const datesA     = [...html.matchAll(dateReA)]
  const excerptsA  = [...html.matchAll(excerptReA)]
  titlesA.slice(0, 10).forEach((m, i) =>
    addItem(m[2], m[1], datesA[i]?.[1], excerptsA[i]?.[1])
  )

  const articleRe  = /<article[^>]*>(.*?)<\/article>/gis
  const hLinkRe    = /<h[2-4][^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]{5,200})<\/a>/is
  const dtAttrRe   = /datetime="([^"]{8,30})"/i
  const pExcerptRe = /<p[^>]*>([^<]{20,400})<\/p>/i
  let am
  while ((am = articleRe.exec(html)) !== null && items.length < 12) {
    const block   = am[1]
    const hMatch  = hLinkRe.exec(block)
    if (!hMatch) continue
    const dtMatch = dtAttrRe.exec(block)
    const pMatch  = pExcerptRe.exec(block)
    addItem(hMatch[2], hMatch[1], dtMatch?.[1], pMatch?.[1])
  }

  return items.slice(0, 10)
}

// ── D1 upsert — always updates scraped_at so "just now" is accurate ───────────
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

  const nowPHT = isoDatetimePHT()
  let saved = 0
  for (const item of items) {
    try {
      const r = await DB.prepare(`
        INSERT INTO scraped_news (source_key, title, summary, url, pub_date, category, raw_data, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_key, title) DO UPDATE SET
          summary    = excluded.summary,
          pub_date   = excluded.pub_date,
          raw_data   = excluded.raw_data,
          scraped_at = ?              -- always refresh so relativeTime() is accurate
      `).bind(
        sourceKey,
        item.title    ?? '',
        item.summary  ?? null,
        item.url      ?? null,
        item.pub_date ?? null,
        item.category ?? sourceKey,
        item.raw_data ?? null,
        nowPHT,   // INSERT value
        nowPHT,   // UPDATE value
      ).run()
      if (r.changes > 0) saved++
    } catch (_) {}
  }
  return saved
}

// ── Auth ──────────────────────────────────────────────────────────────────────
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

// ── Utilities ─────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, ms = TIMEOUT_MS) {
  const c  = new AbortController()
  const id = setTimeout(() => c.abort(), ms)
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

function xmlTag(xml, tag)         { return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? '' }
function xmlAttr(xml, tag, attr)  { return xml.match(new RegExp(`<${tag}[^>\\s][^>]*\\b${attr}="([^"]+)"`, 'i'))?.[1] ?? '' }
function stripCdata(s)            { return (s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, (_, c) => c).trim() }
function stripHtml(s)             { return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim() }

function normalizeTitle(t) {
  return (t ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80)
}

function dedupeByTitle(items) {
  const seen = new Set()
  return items.filter(i => {
    const k = normalizeTitle(i.title)
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
