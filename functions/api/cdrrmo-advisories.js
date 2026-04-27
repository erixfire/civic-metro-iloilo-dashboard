// Cloudflare Pages Function: /api/cdrrmo-advisories
// Fetches latest weather + heat index advisories from CDRRMO Iloilo City.

export async function onRequest(context) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 8000)
  const items = []

  const PAGES = [
    {
      url:  'https://cdrrmo.iloilocity.gov.ph/fb-updates/weather-updates/',
      type: 'weather',
    },
    {
      url:  'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-updates/',
      type: 'heat-index',
    },
  ]

  try {
    for (const page of PAGES) {
      let resp
      try {
        resp = await fetch(page.url, {
          signal:  controller.signal,
          headers: { 'User-Agent': 'CivicIloiloDashboard/1.0 (+https://iloilocity.gov.ph)' },
        })
      } catch (_) {
        continue
      }
      if (!resp.ok) continue

      const html = await resp.text()
      const titleMatches = [...html.matchAll(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)]
      const dateMatches  = [...html.matchAll(/<time[^>]*class="[^"]*entry-date[^"]*"[^>]*datetime="([^"]+)"/gi)]
      const excerptMatches = [...html.matchAll(/<div[^>]*class="[^"]*entry-summary[^"]*"[^>]*>\s*<p>([^<]{10,200})<\/p>/gi)]

      titleMatches.slice(0, 4).forEach((m, i) => {
        const rawDate = dateMatches[i]?.[1] ?? ''
        items.push({
          id:      `cdrrmo-${page.type}-${i}`,
          type:    page.type,
          source:  'CDRRMO Iloilo City',
          title:   m[2].trim(),
          summary: excerptMatches[i]?.[1]?.trim() ?? '',
          url:     m[1],
          date:    rawDate ? rawDate.slice(0, 10) : '',
        })
      })
    }
  } catch (_) {
    // ignore global errors
  } finally {
    clearTimeout(timeoutId)
  }

  return new Response(
    JSON.stringify(
      {
        source:    'CDRRMO Iloilo City',
        isFallback: items.length === 0,
        updatedAt: new Date().toISOString(),
        items,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1200', // 20 minutes
      },
    },
  )
}
