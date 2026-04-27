/**
 * AdminUserManagement — List, create, activate/deactivate admin users
 * Visible only to role='admin'
 */
import { useState, useEffect, useCallback } from 'react'

const ROLES = ['admin', 'operator', 'viewer']

const ROLE_BADGE = {
  admin:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  operator: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  viewer:   'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
}

function getToken() { return localStorage.getItem('civic_admin_token') ?? '' }

export default function AdminUserManagement() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState('')

  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'operator' })
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const d = await r.json()
      setUsers(d.users ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function createUser(e) {
    e.preventDefault()
    setFormErr('')
    if (form.password.length < 8) { setFormErr('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) { setFormErr(d.error ?? 'Failed to create user'); return }
      showToast(`✅ User "${form.username}" created`)
      setForm({ username: '', password: '', full_name: '', role: 'operator' })
      loadUsers()
    } finally { setSaving(false) }
  }

  async function toggleActive(user) {
    const next = user.is_active ? 0 : 1
    await fetch('/api/auth/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ id: user.id, is_active: next }),
    })
    showToast(`${next ? '✅ Activated' : '🚫 Deactivated'}: ${user.username}`)
    loadUsers()
  }

  return (
    <div className="space-y-6">
      {toast && <div className="text-xs font-semibold text-green-600 dark:text-green-400">{toast}</div>}

      {/* User list */}
      <div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">All Users ({users.length})</div>
        {loading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>}
        {!loading && users.length === 0 && <div className="text-xs text-zinc-400">No users found.</div>}
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${ u.is_active ? 'border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900' : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 opacity-60' }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{u.full_name ?? u.username}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[u.role] ?? ROLE_BADGE.viewer}`}>{u.role}</span>
                  {!u.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">Inactive</span>}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">@{u.username} · Created {new Date(u.created_at).toLocaleDateString('en-PH')}</div>
              </div>
              <button
                onClick={() => toggleActive(u)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${ u.is_active ? 'border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' }`}>
                {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create user form */}
      <form onSubmit={createUser} className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">+ Create New User</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Username</label>
            <input required value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))}
              placeholder="jdelacruz" className="input-field" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
            <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
              placeholder="Juan Dela Cruz" className="input-field" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Password</label>
            <input required type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="min. 8 characters" className="input-field" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="input-field">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {formErr && <div className="text-xs text-red-500">{formErr}</div>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Creating…' : 'Create User'}
        </button>
      </form>
    </div>
  )
}
