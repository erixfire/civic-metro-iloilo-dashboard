/**
 * AdminNotifications — Send push notifications to subscribed browsers
 * Phase 7: Web Push via Cloudflare Workers
 */
import { useState } from 'react'

function getToken() { return localStorage.getItem('civic_admin_token') ?? '' }

const PRESET_MSGS = [
  { label: '🌧️ Flood Advisory', title: 'Flood Advisory — Iloilo City', body: 'CDRRMO: Flooding reported in low-lying areas. Please monitor updates.' },
  { label: '⚡ Power Outage', title: 'Power Outage Alert', body: 'MORE Power: Scheduled outage affecting selected barangays. Check Utility Alerts.' },
  { label: '🌡️ Heat Danger', title: 'Extreme Heat Index Warning', body: 'PAGASA: Heat index has reached Danger level. Stay hydrated. Limit outdoor activities.' },
  { label: '🍲 Kitchen Open', title: 'Community Kitchen Now Open', body: 'CSWDO: Community kitchen feeding is now serving at your nearest site.' },
  { label: '📌 Major Incident', title: 'Major Incident Reported', body: 'CDRRMO: A major incident has been reported. Please check the Incident Dashboard.' },
]

export default function AdminNotifications() {
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [url,     setUrl]     = useState('/')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState(null)
  const [subCount, setSubCount] = useState(null)

  async function loadSubCount() {
    try {
      const r = await fetch('/api/push/subscriptions', { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await r.json()
      setSubCount(d.count ?? 0)
    } catch { setSubCount('?') }
  }

  useState(() => { loadSubCount() })

  function applyPreset(p) {
    setTitle(p.title)
    setBody(p.body)
  }

  async function sendNotification(e) {
    e.preventDefault()
    if (!title || !body) return
    setSending(true)
    setResult(null)
    try {
      const r = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title, body, url }),
      })
      const d = await r.json()
      setResult(d)
      if (d.ok) { setTitle(''); setBody(''); setUrl('/') }
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-5">

      {/* Subscriber count */}
      <div className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
        <span className="text-2xl">🔔</span>
        <div>
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {subCount === null ? '…' : subCount} subscribed browser{subCount !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-zinc-400">These devices will receive push notifications</div>
        </div>
        <button onClick={loadSubCount} className="ml-auto text-xs text-zinc-400 hover:text-[#01696f]">↻ Refresh</button>
      </div>

      {/* Quick presets */}
      <div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Quick Presets</div>
        <div className="flex flex-wrap gap-2">
          {PRESET_MSGS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-[#01696f] hover:text-[#01696f] transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose form */}
      <form onSubmit={sendNotification} className="space-y-3">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Compose Notification</div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Title</label>
          <input required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Flood Advisory — Iloilo City"
            className="input-field" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Message Body</label>
          <textarea required value={body} onChange={e => setBody(e.target.value)}
            placeholder="Message text…" rows={3}
            className="input-field resize-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Deep-link URL (optional)</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="/" className="input-field" />
        </div>
        {result && (
          <div className={`text-xs rounded-lg px-3 py-2 ${ result.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-600' }`}>
            {result.ok ? `✅ Sent to ${result.sent} device(s). ${result.failed ? `${result.failed} failed.` : ''}` : `❌ ${result.error}`}
          </div>
        )}
        <button type="submit" disabled={sending || !title || !body} className="btn-primary">
          {sending ? 'Sending…' : '🔔 Send Push Notification'}
        </button>
      </form>

      {/* Setup instructions */}
      <details className="text-xs text-zinc-400 border border-black/5 dark:border-white/5 rounded-xl p-4">
        <summary className="cursor-pointer font-semibold text-zinc-500 dark:text-zinc-400">⚙️ VAPID Setup Instructions</summary>
        <ol className="mt-3 space-y-2 list-decimal list-inside">
          <li>Generate VAPID keys: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">npx web-push generate-vapid-keys</code></li>
          <li>Add to Cloudflare Pages env vars: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">VAPID_PUBLIC_KEY</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">VAPID_PRIVATE_KEY</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">VAPID_SUBJECT=mailto:it@iloilocity.gov.ph</code></li>
          <li>Run the D1 migration: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">CREATE TABLE push_subscriptions (...)</code> (see db/admin_schema.sql)</li>
          <li>Users subscribe by clicking the 🔔 bell icon in the public header</li>
        </ol>
      </details>
    </div>
  )
}
