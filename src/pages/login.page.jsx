import { useState } from 'react'
import { call, setToken } from '../lib/api'

export default function Login({ onLogin }) {
  const [u, setU] = useState(''), [p, setP] = useState('')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!u.trim() || !p) return setErr('Isi username dan password')
    setBusy(true); setErr('')
    try {
      const r = await call('login', { username: u.trim(), password: p })
      if (!r.ok) { setErr(r.error || 'Gagal masuk'); setP('') }
      else { setToken(r.token); onLogin() }
    } catch { setErr('Tidak bisa terhubung ke server') }
    setBusy(false)
  }
  return (
    <div className="login-wrap">
      <form className="panel login" onSubmit={submit}>
        <div className="brand">Duitku</div>
        <p className="hint">Masuk untuk melihat keuanganmu.</p>
        <label>Username<input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} autoFocus /></label>
        <label>Password<input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></label>
        {err && <p role="alert" className="out">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
      </form>
    </div>
  )
}
