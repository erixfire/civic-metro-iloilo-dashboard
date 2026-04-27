/**
 * GET /api/audit-log?limit=20  — last N audit entries
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 100)
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`
    ).bind(limit).all()
    return new Response(JSON.stringify({ log: results ?? [] }), { headers: CORS })
  } catch {
    return new Response(JSON.stringify({ log: [] }), { headers: CORS })
  }
}
