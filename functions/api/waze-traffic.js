// Cloudflare Pages Function: /api/waze-traffic
// Proxies the Waze Traffic View TVT feed for Iloilo City managed area.
// Feed ID: 11373257236

const WAZE_TVT_URL = 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=11373257236'

const JAM_LABEL = ['Free Flow', 'Light', 'Moderate', 'Heavy', 'Standstill', 'Blocked']
const JAM_COLOR = ['#22c55e', '#86efac', '#facc15', '#f97316', '#ef4444', '#7f1d1d']

export async function onRequest(context) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 8000)

  try {
    const resp = await fetch(WAZE_TVT_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CivicIloiloDashboard/1.0 (+https://iloilocity.app)',
        'Accept': 'application/json',
      },
    })
    clearTimeout(timeoutId)

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Waze API error ${resp.status}`, isFallback: true }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const raw = await resp.json()

    // Total jammed length in meters across all levels
    const totalJamM = (raw.lengthOfJams ?? []).reduce((sum, j) => sum + (j.jamLength ?? 0), 0)
    const totalJamKm = (totalJamM / 1000).toFixed(2)

    // Total active drivers on jams
    const totalWazers = (raw.usersOnJams ?? []).reduce((sum, u) => sum + (u.wazersCount ?? 0), 0)

    // Dominant jam level = highest level with meaningful length (>= 200m)
    const significantJams = (raw.lengthOfJams ?? [])
      .filter(j => j.jamLength >= 200)
      .sort((a, b) => b.jamLevel - a.jamLevel)
    const dominantLevel = significantJams[0]?.jamLevel ?? 0

    // Jam breakdown per level (1-5)
    const jamBreakdown = (raw.lengthOfJams ?? []).map(j => ({
      level:  j.jamLevel,
      label:  JAM_LABEL[j.jamLevel] ?? `Level ${j.jamLevel}`,
      color:  JAM_COLOR[j.jamLevel] ?? '#6b7280',
      meters: j.jamLength,
      km:     (j.jamLength / 1000).toFixed(2),
    }))

    // Driver breakdown per jam level
    const driversByLevel = (raw.usersOnJams ?? []).map(u => ({
      level:  u.jamLevel,
      label:  JAM_LABEL[u.jamLevel] ?? `Level ${u.jamLevel}`,
      count:  u.wazersCount,
    }))

    const payload = {
      isFallback:     false,
      updatedAt:      new Date(raw.updateTime ?? Date.now()).toISOString(),
      areaName:       raw.areaName ?? 'Iloilo City',
      totalJamKm,
      totalWazers:    Math.round(totalWazers),
      dominantLevel,
      dominantLabel:  JAM_LABEL[dominantLevel] ?? 'Unknown',
      dominantColor:  JAM_COLOR[dominantLevel] ?? '#6b7280',
      jamBreakdown,
      driversByLevel,
      bbox:           raw.bbox ?? null,
    }

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=120', // 2 minutes
      },
    })
  } catch (err) {
    clearTimeout(timeoutId)
    return new Response(JSON.stringify({ error: err.message, isFallback: true }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
