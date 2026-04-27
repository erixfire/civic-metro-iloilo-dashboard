/**
 * AdminNotifications — Send push notifications to subscribed browsers.
 * Shows a clear "VAPID not configured" banner when keys are missing.
 * All other UI (presets, form) still renders so it's ready when you add keys later.
 */
import { useState } from 'react'

function getToken() { return localStorage.getItem('civic_admin_token') ?? '' }

const PRESET_MSGS = [
  { label: '🌧️ Flood Advisory',  title: 'Flood Advisory — Iloilo City',    body: 'CDRRMO: Flooding reported in low-lying areas. Please monitor updates.' },
  { label: '⚡ Power Outage',     title: 'Power Outage Alert',               body: 'MORE Power: Scheduled outage affecting selected barangays. Check Utility Alerts.' },
  { label: '🌡️ Heat Danger',     title: 'Extreme Heat Index Warning',        body: 'PAGASA: Heat index has reached Danger level. Stay hydrated. Limit outdoor activities.' },
  { label: '🍲 Kitchen Open',    title: 'Community Kitchen Now Open',        body: 'CSWDO: Community kitchen feeding is now serving at your nearest site.' },
  { label: '📌 Major Incident',  title: 'Major Incident Reported',           body: 'CDRRMO: A major incident has been reported. Please check the Incident Dashboard.' },
]

export default function AdminNotifications() {
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [url,      setUrl]      = useState('/')
  const [sending,  setSending]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [subCount, setSubCount] = useState(null)
  const [vapidMissing, setVapidMissing] = useState(false)

  // Load subscriber count on mount
  useState(() => {
    fetch('/api/push/subscriptions', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setSubCount(d.count ?? 0))
      .catch(() => setSubCount(0))
  })

  function applyPreset(p) { setTitle(p.title); setBody(p.body) }

  async function sendNotification(e) {
    e.preventDefault()
    if (!title || !body) return
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ title, body, url }),
      })
      const d = await r.json()
      if (d.vapid_missing) setVapidMissing(true)
      setResult(d)
      if (d.ok) { setTitle(''); setBody(''); setUrl('/') }
    } catch (err) {
      setResult({ ok: false, error: err.message })
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-5">

      {/* VAPID missing banner */}
      {vapidMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">VAPID keys not configured — Push notifications are disabled</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Push notifications will work once you add VAPID keys to Cloudflare Pages environment variables.
              Expand the setup guide below to get started whenever you're ready.
            </div>
          </div>
        </div>
      )}

      {/* Subscriber count */}
      <div className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
        <span className="text-2xl">🔔</span>
        <div>
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {subCount === null ? '…' : subCount} subscribed browser{subCount !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-zinc-400">These devices will receive push notifications once VAPID is configured</div>
        </div>
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

      {/* Compose */}
      <form onSubmit={sendNotification} className="space-y-3">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Compose Notification</div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Title</label>
          <input required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Flood Advisory — Iloilo City" className="input-field" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Message Body</label>
          <textarea required value={body} onChange={e => setBody(e.target.value)}
            placeholder="Message text…" rows={3} className="input-field resize-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Deep-link URL (optional)</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="/" className="input-field" />
        </div>
        {result && (
          <div className={`text-xs rounded-lg px-3 py-2 ${ result.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : result.vapid_missing ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700' : 'bg-red-50 dark:bg-red-900/20 text-red-600' }`}>
            {result.ok
              ? `✅ Sent to ${result.sent} device(s).${ result.failed ? ` ${result.failed} failed.` : '' }`
              : result.vapid_missing
                ? '⚠️ VAPID keys not configured. Expand setup guide below.'
                : `❌ ${result.error}`}
          </div>
        )}
        <button type="submit" disabled={sending || !title || !body} className="btn-primary">
          {sending ? 'Sending…' : '🔔 Send Push Notification'}
        </button>
      </form>

      {/* Setup guide — always visible */}
      <details className="text-xs border border-black/5 dark:border-white/5 rounded-xl p-4" open={vapidMissing}>
        <summary className="cursor-pointer font-semibold text-zinc-600 dark:text-zinc-300">⚙️ VAPID Setup Guide (do once when ready)</summary>
        <div className="mt-4 space-y-3 text-zinc-500 dark:text-zinc-400">
          <div>
            <div className="font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Step 1 — Generate VAPID keys</div>
            <code className="block bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-zinc-700 dark:text-zinc-200 font-mono text-[11px]">
              npx web-push generate-vapid-keys
            </code>
          </div>
          <div>
            <div className="font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Step 2 — Add to Cloudflare Pages → Settings → Environment Variables</div>
            <code className="block bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 font-mono text-[11px] space-y-1 whitespace-pre">{`VAPID_PUBLIC_KEY   = <your public key>
VAPID_PRIVATE_KEY  = <your private key>
VAPID_SUBJECT      = mailto:it@iloilocity.gov.ph
VITE_VAPID_PUBLIC_KEY = <same public key>`}</code>
          </div>
          <div>
            <div className="font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Step 3 — Create D1 table (if not done yet)</div>
            <code className="block bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 font-mono text-[11px] whitespace-pre">{`CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  keys       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);`}</code>
          </div>
          <div className="text-zinc-400">After deploying with the new env vars, the 🔔 bell in the public header will let users subscribe. Then use this panel to broadcast alerts.</div>
        </div>
      </details>
    </div>
  )
}
