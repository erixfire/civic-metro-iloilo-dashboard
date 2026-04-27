/**
 * POST /api/push/send  (admin/operator only)
 * Body: { title, body, url? }
 *
 * If VAPID keys are not configured, returns a clear 501 notice instead of crashing.
 * Configure when ready:
 *   npx web-push generate-vapid-keys
 *   Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT to Cloudflare Pages env vars.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST')    return json({ error: 'POST only' }, 405)

  // Auth
  const secret  = env.JWT_SECRET ?? 'civic-iloilo-default-secret-change-me'
  const payload = await verifyToken(getBearerToken(request), secret)
  if (!payload || !['admin','operator'].includes(payload.role)) {
    return json({ error: 'Operator or Admin token required' }, 403)
  }

  // VAPID not configured → friendly notice, no crash
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return json({
      ok: false,
      vapid_missing: true,
      error: 'VAPID keys are not configured yet. Push notifications are disabled. See the setup instructions in the Notifications tab.',
    }, 501)
  }

  const { title, body: msgBody, url = '/' } = await request.json()
  if (!title || !msgBody) return json({ error: 'title and body required' }, 400)

  const { results: subs } = await env.DB.prepare(
    `SELECT endpoint, keys FROM push_subscriptions LIMIT 500`
  ).all()

  if (!subs || subs.length === 0) return json({ ok: true, sent: 0, failed: 0, message: 'No subscribers yet' })

  const payload_str = JSON.stringify({ title, body: msgBody, url, icon: '/icons/icon-192.png' })
  let sent = 0, failed = 0

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const keys   = JSON.parse(sub.keys)
        const result = await sendPushMessage(sub.endpoint, keys, payload_str, env)
        if (result.ok || result.status === 201) { sent++ }
        else {
          failed++
          if (result.status === 410 || result.status === 404) {
            await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(sub.endpoint).run()
          }
        }
      } catch { failed++ }
    })
  )

  return json({ ok: true, sent, failed, total: subs.length })
}

async function sendPushMessage(endpoint, keys, payloadStr, env) {
  const vapidHeader = await buildVapidHeader(endpoint, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT ?? 'mailto:it@iloilocity.gov.ph')
  const { ciphertext } = await encryptPayload(payloadStr, keys)
  return fetch(endpoint, {
    method:  'POST',
    headers: { 'Authorization': vapidHeader, 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm', 'TTL': '86400' },
    body:    ciphertext,
  })
}

async function buildVapidHeader(endpoint, publicKey, privateKey, subject) {
  const url      = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const exp      = Math.floor(Date.now() / 1000) + 12 * 3600
  const header   = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload  = b64url(JSON.stringify({ aud: audience, exp, sub: subject }))
  const signing  = `${header}.${payload}`
  const privKey  = await crypto.subtle.importKey('pkcs8', b64ToArrayBuffer(privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig      = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(signing))
  return `vapid t=${signing}.${b64url(sig)}, k=${publicKey}`
}

async function encryptPayload(payloadStr, keys) {
  const { p256dh, auth } = keys
  if (!p256dh || !auth) return { ciphertext: new TextEncoder().encode(payloadStr) }
  try {
    const salt       = crypto.getRandomValues(new Uint8Array(16))
    const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
    const serverPub  = await crypto.subtle.exportKey('raw', serverKeys.publicKey)
    const clientPub  = await crypto.subtle.importKey('raw', b64ToArrayBuffer(p256dh), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
    const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPub }, serverKeys.privateKey, 256)
    const prk        = await hkdf(new Uint8Array(b64ToArrayBuffer(auth)), new Uint8Array(sharedBits), new TextEncoder().encode('Content-Encoding: auth\0'), 32)
    const cekInfo    = concat(new TextEncoder().encode('Content-Encoding: aes128gcm\0'), new Uint8Array(1))
    const nonceInfo  = concat(new TextEncoder().encode('Content-Encoding: nonce\0'), new Uint8Array(1))
    const serverPubU8 = new Uint8Array(serverPub)
    const clientPubU8 = new Uint8Array(b64ToArrayBuffer(p256dh))
    const cek        = await hkdf(salt, prk, concat(cekInfo, serverPubU8, clientPubU8), 16)
    const nonce      = await hkdf(salt, prk, concat(nonceInfo, serverPubU8, clientPubU8), 12)
    const aesKey     = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
    const plaintext  = concat(new TextEncoder().encode(payloadStr), new Uint8Array([2]))
    const cipher     = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
    const recSize    = new DataView(new ArrayBuffer(4)); recSize.setUint32(0, 4096, false)
    const hdr        = concat(salt, new Uint8Array(recSize.buffer), new Uint8Array([serverPub.byteLength]), serverPubU8)
    return { ciphertext: concat(new Uint8Array(hdr), new Uint8Array(cipher)) }
  } catch { return { ciphertext: new TextEncoder().encode(payloadStr) } }
}

async function hkdf(salt, ikm, info, len) {
  const key  = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8)
  return new Uint8Array(bits)
}
function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.byteLength, 0)
  const out   = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(new Uint8Array(a instanceof ArrayBuffer ? a : a.buffer), off); off += a.byteLength }
  return out
}
function b64url(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
}
function b64ToArrayBuffer(b64) {
  const s = atob(b64.replace(/-/g,'+').replace(/_/g,'/'))
  const b = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i)
  return b.buffer
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
