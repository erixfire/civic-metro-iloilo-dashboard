/**
 * POST /api/auth/logout
 * Clears the session. Token invalidation is client-side (remove from localStorage).
 * For server-side revocation add a token_blacklist table and check it in verifyToken.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  return new Response(JSON.stringify({ ok: true, message: 'Logged out' }), { status: 200, headers: CORS })
}
