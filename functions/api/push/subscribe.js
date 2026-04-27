/**
 * POST /api/push/subscribe
 * Body: { subscription: PushSubscriptionJSON }
 * Saves browser push subscription to D1.
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

  const { subscription } = await request.json()
  if (!subscription?.endpoint) return json({ error: 'Invalid subscription' }, 400)

  const endpoint = subscription.endpoint
  const keys     = JSON.stringify(subscription.keys ?? {})

  await env.DB.prepare(
    `INSERT INTO push_subscriptions (endpoint, keys, created_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET keys = excluded.keys, updated_at = datetime('now')`
  ).bind(endpoint, keys).run()

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
