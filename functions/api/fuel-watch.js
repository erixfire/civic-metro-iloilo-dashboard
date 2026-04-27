// Cloudflare Pages Function for Fuel Watch — Iloilo
// Runs at /api/fuel-watch. Fetches national PH gasoline benchmark from GlobalPetrolPrices.
// Falls back to DOE-sourced static values if scrape fails.

// Static fallback: post-April 14, 2026 rollback DOE benchmarks (national averages)
const FALLBACK = {
  gasoline: 65.80,
  diesel: 46.20,
  kerosene: 64.10,
  source: 'Static fallback — DOE national benchmark post-Apr 14 2026 rollback',
}

export async function onRequest(context) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let phPrice = null
    let scrapedSource = 'GlobalPetrolPrices — PH gasoline (DOE-based)'

    try {
      const phResp = await fetch(
        'https://www.globalpetrolprices.com/Philippines/gasoline_prices/',
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CivicIloiloDashboard/1.0)',
            'Accept': 'text/html',
          },
        },
      )
      if (phResp.ok) {
        const html = await phResp.text()
        // Try multiple patterns for resilience
        const patterns = [
          /([0-9]{2,3}\.[0-9]{1,2})\s*Philippine Peso/i,
          /PHP\s*([0-9]{2,3}\.[0-9]{1,2})/i,
          /"PHP"[^0-9]*([0-9]{2,3}\.[0-9]{1,2})/,
        ]
        for (const p of patterns) {
          const m = html.match(p)
          if (m) {
            const v = parseFloat(m[1])
            // Sanity check: PH gasoline must be between 40 and 120 PHP/L
            if (v >= 40 && v <= 120) {
              phPrice = v
              break
            }
          }
        }
      }
    } catch (_) {
      // scrape failed; will use fallback
    }

    clearTimeout(timeoutId)

    const usingFallback = phPrice === null
    const gasoline = phPrice ?? FALLBACK.gasoline

    return new Response(
      JSON.stringify(
        {
          philippines: {
            gasoline,
            diesel: FALLBACK.diesel,
            kerosene: FALLBACK.kerosene,
            source: usingFallback ? FALLBACK.source : scrapedSource,
            isFallback: usingFallback,
          },
          lastUpdated: new Date().toISOString(),
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=1800',
        },
      },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Fuel Watch function error', message: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    )
  }
}
