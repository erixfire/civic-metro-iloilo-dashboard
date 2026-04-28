/**
 * GET /api/scrape/trigger
 *
 * Lightweight scheduled-scrape trigger.
 * Can be called by a Cloudflare Cron Trigger or any external ping.
 * Does NOT require auth — secured by SCRAPE_SECRET env variable.
 *
 * Usage:
 *   GET /api/scrape/trigger?secret=YOUR_SCRAPE_SECRET&source=all
 *
 * Set SCRAPE_SECRET in your Cloudflare Pages environment variables.
 * If SCRAPE_SECRET is not set, the trigger is disabled for security.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const secret = env.SCRAPE_SECRET
  if (!secret) {
    return new Response(JSON.stringify({ error: 'SCRAPE_SECRET not configured' }), {
      status: 503, headers: CORS,
    })
  }

  const url = new URL(request.url)
  if (url.searchParams.get('secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  const source = url.searchParams.get('source') ?? 'all'

  // Internally call /api/scrape POST
  const origin  = url.origin
  const resp    = await fetch(`${origin}/api/scrape`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      // Use a service-level token derived from SCRAPE_SECRET
      'Authorization': `Bearer ${env.SCRAPE_SECRET}`,
      'X-Internal':    '1',
    },
    body: JSON.stringify({ source }),
  })

  const result = await resp.json().catch(() => ({}))
  return new Response(JSON.stringify({ triggered: true, source, result }), { status: 200, headers: CORS })
}
