/**
 * AdminSettings — Read + edit app_settings from D1
 */
import { useState, useEffect } from 'react'

export default function AdminSettings() {
  const [settings, setSettings] = useState([])
  const [saving,   setSaving]   = useState(null)  // key being saved
  const [saved,    setSaved]    = useState(null)   // key just saved
  const [edits,    setEdits]    = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await fetch('/api/settings')
      const d = await r.json()
      const s = d.settings ?? []
      setSettings(s)
      // init edits map
      const m = {}
      s.forEach((row) => { m[row.key] = row.value })
      setEdits(m)
    } catch (_) {}
  }

  async function save(key) {
    setSaving(key)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: edits[key] }),
      })
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
      setSettings((s) => s.map((row) => row.key === key ? { ...row, value: edits[key] } : row))
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-2">
      {settings.map((row) => (
        <div key={row.key}
          className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5">
          <div className="col-span-4">
            <div className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-300">{row.key}</div>
            {row.description && <div className="text-[11px] text-zinc-400">{row.description}</div>}
          </div>
          <div className="col-span-6">
            <input
              value={edits[row.key] ?? row.value}
              onChange={(e) => setEdits((m) => ({ ...m, [row.key]: e.target.value }))}
              className="input-field text-xs"
            />
          </div>
          <div className="col-span-2 flex items-center justify-end gap-1">
            {saved === row.key && <span className="text-green-600 text-xs">✅</span>}
            <button
              onClick={() => save(row.key)}
              disabled={saving === row.key || edits[row.key] === row.value}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving === row.key ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
