/**
 * GET /api/push/subscriptions  — count of active subscriptions (admin only)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const secret  = env.JWT_SECRET ?? 'civic-iloilo-default-secret-change-me'
  const payload = await verifyToken(getBearerToken(request), secret)
  if (!payload) return json({ error: 'Auth required' }, 401)

  const row = await env.DB.prepare(`SELECT COUNT(*) as count FROM push_subscriptions`).first()
  return json({ count: row?.count ?? 0 })
}

function getBearerToken(req) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

async function verifyToken(token, secret) {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const enc    = new TextEncoder()
    const key    = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBuf = new Uint8Array(sig.match(/.{2}/g).map(b => parseInt(b, 16)))
    const valid  = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(`${header}.${body}`))
    if (!valid) return null
    const pl = JSON.parse(atob(body))
    if (pl.exp && Math.floor(Date.now() / 1000) > pl.exp) return null
    return pl
  } catch { return null }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
