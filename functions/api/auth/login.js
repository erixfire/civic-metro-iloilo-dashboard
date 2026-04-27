/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { ok, token, user: { id, username, role, full_name } }
 *
 * Password hashing: PBKDF2-SHA256 (Web Crypto — available in Cloudflare Workers)
 * Session token: signed JWT-like structure (header.payload.sig) using HMAC-SHA256
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

const TOKEN_EXPIRY_HOURS = 8

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { username, password } = body
  if (!username || !password) return json({ error: 'Username and password required' }, 400)

  // Look up user
  let user
  try {
    user = await env.DB.prepare(
      `SELECT id, username, password_hash, salt, role, full_name, is_active
       FROM admin_users WHERE username = ? LIMIT 1`
    ).bind(username.trim().toLowerCase()).first()
  } catch (e) {
    return json({ error: 'Database error', detail: e.message }, 500)
  }

  if (!user || !user.is_active) {
    return json({ error: 'Invalid username or password' }, 401)
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash, user.salt)
  if (!valid) {
    await writeAudit(env.DB, 'login_failed', 'admin_users', user.id, `IP: ${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`)
    return json({ error: 'Invalid username or password' }, 401)
  }

  // Issue token
  const secret = env.JWT_SECRET ?? 'civic-iloilo-default-secret-change-me'
  const exp    = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600
  const token  = await makeToken({ sub: user.id, username: user.username, role: user.role, exp }, secret)

  await writeAudit(env.DB, 'login_success', 'admin_users', user.id,
    `IP: ${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`)

  return json({
    ok: true,
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
  })
}

// ── Crypto helpers ─────────────────────────────────────────────────────

async function verifyPassword(password, storedHash, salt) {
  try {
    const derived = await pbkdf2Hash(password, salt)
    return derived === storedHash
  } catch { return false }
}

async function pbkdf2Hash(password, salt) {
  const enc      = new TextEncoder()
  const keyMat   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits     = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMat, 256
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2,'0')).join('')
}

async function makeToken(payload, secret) {
  const enc     = new TextEncoder()
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = btoa(JSON.stringify(payload))
  const data    = `${header}.${body}`
  const key     = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuf  = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sig     = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2,'0')).join('')
  return `${data}.${sig}`
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name, String(record_id), details ?? null).run()
  } catch (_) {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
