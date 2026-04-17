// Cloudflare Worker for Fuel Watch — Iloilo
// This is a reference implementation to deploy as a Worker and call from the dashboard.

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url)
      if (url.pathname !== '/api/fuel-watch') {
        return new Response('Not found', { status: 404 })
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      // 1) Fetch Philippines gasoline price (DOE-based) from GlobalPetrolPrices
      const phResp = await fetch('https://www.globalpetrolprices.com/Philippines/gasoline_prices/', {
        signal: controller.signal,
      })
      if (!phResp.ok) throw new Error('Failed to fetch PH fuel prices')
      const phHtml = await phResp.text()

      // Naive scrape for the first numeric price in PHP, e.g., "96.50 Philippine Peso/liter"
      const phMatch = phHtml.match(/([0-9]{2,3}\.[0-9]{2})\s*Philippine Peso/)
      const phPrice = phMatch ? parseFloat(phMatch[1]) : null

      // 2) Fetch Iloilo gasoline price estimate from Numbeo
      const iloResp = await fetch('https://www.numbeo.com/gas-prices/in/Iloilo', {
        signal: controller.signal,
      })
      if (!iloResp.ok) throw new Error('Failed to fetch Iloilo fuel prices')
      const iloHtml = await iloResp.text()

      // Scrape "Gasoline (1 Liter)" row, e.g., "Gasoline (1 Liter)  75.00 ₱"
      const rowMatch = iloHtml.match(/Gasoline \(1 Liter\)[^0-9]*([0-9]{2,3}\.[0-9]{2})/)
      const iloPrice = rowMatch ? parseFloat(rowMatch[1]) : null

      clearTimeout(timeoutId)

      const body = {
        iloilo: {
          gasoline: iloPrice,
          source: 'Numbeo — Gasoline (1 Liter) in Iloilo',
        },
        philippines: {
          gasoline: phPrice,
          source: 'GlobalPetrolPrices — Philippines gasoline prices (DOE-based)',
        },
        lastUpdated: new Date().toISOString(),
      }

      return new Response(JSON.stringify(body, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=1800', // 30 minutes
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch fuel data', message: err.message }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }
  },
}
