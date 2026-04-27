// Cloudflare Pages Function: /api/heat-index-news
// Aggregates heat index news from CDRRMO Iloilo City and PAGASA.
// Falls back to hardcoded static items if fetches fail.

const STATIC_FALLBACK = [
  {
    id: 'f1',
    date: '2026-04-27',
    source: 'PAGASA',
    title: '10 areas to sizzle at Danger level on April 27',
    summary: 'Dumangas, Iloilo logged 45°C. PAGASA warns of heat cramps, exhaustion, and heat stroke risk.',
    url: 'https://newsinfo.inquirer.net/2218846/heat-index-alert-10-areas-to-sizzle-at-danger-level-on-monday',
    level: 'Danger',
  },
  {
    id: 'f2',
    date: '2026-04-27',
    source: 'PAGASA',
    title: 'Heat, thunderstorms expected across Visayas',
    summary: 'Lambunao, Iloilo may reach 40°C. PAGASA warned of dangerous heat 9AM–4PM.',
    url: 'https://newsinfo.inquirer.net/2218881/heat-thunderstorms-expected-across-visayas-pagasa',
    level: 'Caution',
  },
  {
    id: 'f3',
    date: '2026-04-25',
    source: 'Philstar',
    title: 'PAGASA: 14 areas hit danger-level heat index on April 25',
    summary: 'Dumangas, Iloilo at 45°C and Iloilo City at 43°C on April 25.',
    url: 'https://www.philstar.com/headlines/weather/2026/04/25/2523508/pagasa-14-areas-hit-danger-level-heat-index-april-25',
    level: 'Danger',
  },
  {
    id: 'f4',
    date: '2026-04-10',
    source: 'GMA Network',
    title: 'Heat index in Dumangas, Iloilo reaches 44°C',
    summary: 'Highest in PH. PAGASA Danger level. Heat exhaustion likely with prolonged exposure.',
    url: 'https://www.gmanetwork.com/news/weather/content/983431/heat-index-in-dumangas-iloilo-reaches-44-c-on-april-10-2026/story/',
    level: 'Danger',
  },
  {
    id: 'f5',
    date: '2026-04-01',
    source: 'CDRRMO Iloilo City',
    title: 'Heat Index Forecast: Iloilo City expected to reach 38°C',
    summary: 'Based on DOST-PAGASA forecast. Public advised to minimize outdoor activity.',
    url: 'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/',
    level: 'Caution',
  },
]

export async function onRequest(context) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 8000)
  const items = []

  try {
    // 1. Attempt to scrape CDRRMO heat index updates page
    const cdrrmoResp = await fetch(
      'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/',
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'CivicIloiloDashboard/1.0 (+https://iloilocity.gov.ph)' },
      },
    )
    if (cdrrmoResp.ok) {
      const html = await cdrrmoResp.text()
      // Extract post titles and dates from the page
      // CDRRMO WordPress pages use <h2 class="entry-title"> and <time class="entry-date">
      const titleMatches = [...html.matchAll(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)]
      const dateMatches  = [...html.matchAll(/<time[^>]*class="[^"]*entry-date[^"]*"[^>]*datetime="([^"]+)"/gi)]

      titleMatches.slice(0, 5).forEach((m, i) => {
        const rawDate = dateMatches[i]?.[1] ?? ''
        const date    = rawDate ? rawDate.slice(0, 10) : ''
        items.push({
          id:      `cdrrmo-${i}`,
          source:  'CDRRMO Iloilo City',
          title:   m[2].trim(),
          summary: '',
          url:     m[1],
          date,
          level:   null,
        })
      })
    }
  } catch (_) {
    // scrape failed; fall through to static fallback
  } finally {
    clearTimeout(timeoutId)
  }

  // Merge with static fallback, filling up to 8 items
  const merged = [...items]
  for (const s of STATIC_FALLBACK) {
    if (merged.length >= 8) break
    const isDupe = merged.some(
      (x) =>
        x.title.toLowerCase() === s.title.toLowerCase() ||
        (x.date === s.date && x.source === s.source),
    )
    if (!isDupe) merged.push(s)
  }

  return new Response(
    JSON.stringify(
      {
        source:     'CDRRMO Iloilo City + PAGASA + local news',
        isFallback: items.length === 0,
        updatedAt:  new Date().toISOString(),
        items:      merged,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=900', // 15 minutes
      },
    },
  )
}
