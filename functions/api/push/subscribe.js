/**
 * POST /api/push/subscribe
 * Saves a browser push subscription to D1.
 * Safe to call even when VAPID is not configured — subscriptions are stored
 * and will be used once VAPID keys are added later.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { subscription } = body ?? {}
  if (!subscription?.endpoint) return json({ error: 'Invalid subscription object' }, 400)

  // Gracefully skip if push_subscriptions table doesn't exist yet
  try {
    await env.DB.prepare(
      `INSERT INTO push_subscriptions (endpoint, keys, created_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(endpoint) DO UPDATE SET keys = excluded.keys, updated_at = datetime('now')`
    ).bind(subscription.endpoint, JSON.stringify(subscription.keys ?? {})).run()
    return json({ ok: true })
  } catch (e) {
    // Table not yet created — return ok so the UI doesn't throw
    return json({ ok: true, warning: 'push_subscriptions table not yet created. Run db/admin_schema.sql in D1 Console.' })
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
