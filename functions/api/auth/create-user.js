/**
 * POST /api/auth/create-user  (admin-only: requires valid token with role='admin')
 * Body: { username, password, full_name, role }
 * Creates a new admin_users row with PBKDF2-hashed password.
 *
 * Also used for initial seed — first request with no existing users is always allowed.
 */

const CORS = {
  'Access-Control-Allow-Origin':  'https://iloilocity.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

const ROLES = ['admin', 'operator', 'viewer']

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  // ── Require JWT_SECRET to be configured ──────────────────────
  if (!env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.')
    return json({ error: 'Service misconfigured. Contact administrator.' }, 503)
  }

  // Count existing users — if 0, allow bootstrap without auth
  const { count } = await env.DB.prepare(`SELECT COUNT(*) as count FROM admin_users`).first() ?? { count: 1 }

  if (count > 0) {
    // Require admin token
    const auth    = request.headers.get('Authorization') ?? ''
    const token   = auth.startsWith('Bearer ') ? auth.slice(7) : null
    const secret  = env.JWT_SECRET
    const payload = token ? await verifyToken(token, secret) : null
    if (!payload || payload.role !== 'admin') {
      return json({ error: 'Admin token required' }, 403)
    }
  }

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { username, password, full_name, role = 'operator' } = body
  if (!username || !password) return json({ error: 'username and password required' }, 400)
  if (!ROLES.includes(role))  return json({ error: `role must be one of: ${ROLES.join(', ')}` }, 400)
  if (password.length < 8)    return json({ error: 'Password must be at least 8 characters' }, 400)

  // Check for duplicate
  const existing = await env.DB.prepare(`SELECT id FROM admin_users WHERE username = ?`)
    .bind(username.trim().toLowerCase()).first()
  if (existing) return json({ error: 'Username already exists' }, 409)

  const salt  = generateSalt()
  const hash  = await pbkdf2Hash(password, salt)
  const id    = `usr-${Date.now()}`

  await env.DB.prepare(
    `INSERT INTO admin_users (id, username, password_hash, salt, role, full_name)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, username.trim().toLowerCase(), hash, salt, role, full_name ?? username).run()

  return json({ ok: true, id, username: username.trim().toLowerCase(), role }, 201)
}

function generateSalt(len = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function pbkdf2Hash(password, salt) {
  const enc    = new TextEncoder()
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits   = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMat, 256
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2,'0')).join('')
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const enc    = new TextEncoder()
    const key    = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
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
