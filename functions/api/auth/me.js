/**
 * GET /api/auth/me
 * Returns current user from token.
 * Authorization: Bearer <token>
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return json({ error: 'No token' }, 401)

  const secret  = env.JWT_SECRET ?? 'civic-iloilo-default-secret-change-me'
  const payload = await verifyToken(token, secret)
  if (!payload) return json({ error: 'Invalid or expired token' }, 401)

  const user = await env.DB.prepare(
    `SELECT id, username, role, full_name, is_active FROM admin_users WHERE id = ? LIMIT 1`
  ).bind(payload.sub).first()

  if (!user || !user.is_active) return json({ error: 'User not found or inactive' }, 401)

  return json({ ok: true, user })
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const enc  = new TextEncoder()
    const key  = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBuf = new Uint8Array(sig.match(/.{2}/g).map((b) => parseInt(b, 16)))
    const valid  = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(`${header}.${body}`))
    if (!valid) return null
    const payload = JSON.parse(atob(body))
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch { return null }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
