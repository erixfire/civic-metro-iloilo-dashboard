/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { ok, token, user: { id, username, role, full_name } }
 *
 * Security features:
 * - PBKDF2-SHA256 password verification (100k iterations)
 * - HMAC-SHA256 signed JWT-like token
 * - Server-side rate limiting: 5 attempts per IP per 15 minutes (stored in D1)
 * - Constant-time error responses (no username enumeration)
 * - Audit log on every attempt
 * - Failed attempts written even for unknown usernames
 */

const CORS = {
  'Access-Control-Allow-Origin':  'https://iloilocity.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

const TOKEN_EXPIRY_HOURS = 8
const MAX_ATTEMPTS       = 5
const WINDOW_SECONDS     = 15 * 60 // 15 minutes

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'

  // ── Rate limit check ─────────────────────────────────────────
  try {
    const windowStart = Math.floor(Date.now() / 1000) - WINDOW_SECONDS
    const row = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM audit_log
       WHERE action = 'login_failed'
         AND details LIKE ?
         AND created_at > datetime(?, 'unixepoch')`
    ).bind(`%IP: ${ip}%`, windowStart).first()

    if ((row?.cnt ?? 0) >= MAX_ATTEMPTS) {
      await writeAudit(env.DB, 'login_blocked', 'admin_users', null, `IP: ${ip} — rate limited`)
      return json(
        { error: 'Too many failed attempts. Try again in 15 minutes.' },
        429,
        { 'Retry-After': String(WINDOW_SECONDS) }
      )
    }
  } catch (_) {
    // If rate limit check fails (e.g. table not ready), allow through rather than blocking all logins
  }

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { username, password } = body
  if (!username || !password) return json({ error: 'Username and password required' }, 400)

  // ── User lookup ───────────────────────────────────────────────
  let user
  try {
    user = await env.DB.prepare(
      `SELECT id, username, password_hash, salt, role, full_name, is_active
       FROM admin_users WHERE username = ? LIMIT 1`
    ).bind(username.trim().toLowerCase()).first()
  } catch (e) {
    return json({ error: 'Service temporarily unavailable' }, 503)
  }

  // Always run password hash even for unknown users to prevent timing attacks
  const dummyHash = user?.password_hash ?? 'x'.repeat(64)
  const dummySalt = user?.salt          ?? 'dummy-salt'
  const valid = user?.is_active
    ? await verifyPassword(password, dummyHash, dummySalt)
    : (await verifyPassword(password, dummyHash, dummySalt), false) // run hash, discard result

  if (!valid || !user?.is_active) {
    await writeAudit(env.DB, 'login_failed', 'admin_users', user?.id ?? null,
      `IP: ${ip} — user: ${username.trim().toLowerCase()}`)
    // Generic error — no hint about whether username exists
    return json({ error: 'Invalid username or password' }, 401)
  }

  // ── Issue token ──────────────────────────────────────────────
  const secret = env.JWT_SECRET ?? 'civic-iloilo-CHANGE-THIS-IN-PRODUCTION'
  const exp    = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600
  const token  = await makeToken({ sub: user.id, username: user.username, role: user.role, exp }, secret)

  await writeAudit(env.DB, 'login_success', 'admin_users', user.id, `IP: ${ip}`)

  return json({
    ok:        true,
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    user:      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
  })
}

// ── Crypto helpers ─────────────────────────────────────────────────

async function verifyPassword(password, storedHash, salt) {
  try {
    const derived = await pbkdf2Hash(password, salt)
    return derived === storedHash
  } catch { return false }
}

async function pbkdf2Hash(password, salt) {
  const enc    = new TextEncoder()
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits   = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMat, 256
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function makeToken(payload, secret) {
  const enc    = new TextEncoder()
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = btoa(JSON.stringify(payload))
  const data   = `${header}.${body}`
  const key    = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sig    = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${data}.${sig}`
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name ?? '', record_id ? String(record_id) : null, details ?? null).run()
  } catch (_) {}
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, ...extraHeaders } })
}
