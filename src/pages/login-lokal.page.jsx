import { useState } from 'react'
import { adaAkun, buatAkun, cekAkun, namaAkun, tandaiBuka, hapusSemua } from '../lib/akun-lokal'

// Login di HP: akun dibuat sendiri dan hanya tersimpan di HP ini.
export default function LoginLokal({ onMasuk }) {
  const baru = !adaAkun()
  const [u, setU] = useState(baru ? '' : namaAkun()), [p, setP] = useState(''), [p2, setP2] = useState('')
  const [ingat, setIngat] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false)

  const kirim = async (e) => {
    e.preventDefault(); setErr('')
    if (!u.trim() || !p) return setErr('Isi username dan password')
    if (baru && p !== p2) return setErr('Password dan ulangannya tidak sama')
    setBusy(true)
    try {
      if (baru) await buatAkun(u, p)
      else if (!(await cekAkun(u, p))) { setP(''); setBusy(false); return setErr('Username atau password salah') }
      tandaiBuka(ingat); onMasuk()
    } catch (x) { setErr(x.message || 'Gagal masuk'); setBusy(false) }
  }
  const lupa = () => {
    if (window.confirm('Semua data Duitku di HP ini akan DIHAPUS dan akun dibuat ulang. Kalau kamu punya file backup, kamu bisa memulihkannya setelah itu. Lanjutkan?')) { hapusSemua(); location.reload() }
  }

  return (
    <div className="login-wrap">
      <form className="panel login" onSubmit={kirim}>
        <div className="brand">Duitku</div>
        <p className="hint">{baru ? 'Buat akun untuk mengunci Duitku di HP ini. Akun ini hanya tersimpan di HP-mu.' : 'Masuk untuk melihat keuanganmu.'}</p>
        <label>Username<input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} autoFocus={baru} /></label>
        <label>Password{baru ? ' (minimal 6 karakter)' : ''}<input type="password" autoComplete={baru ? 'new-password' : 'current-password'} value={p} onChange={(e) => setP(e.target.value)} autoFocus={!baru} /></label>
        {baru && <label>Ulangi password<input type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></label>}
        <label className="cek"><input type="checkbox" checked={ingat} onChange={(e) => setIngat(e.target.checked)} /> Ingat saya di HP ini</label>
        {baru && <small className="hint">Catat password-mu. Kalau lupa, satu-satunya cara adalah menghapus data HP lalu memulihkan dari backup.</small>}
        {err && <p role="alert" className="out">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Memeriksa…' : baru ? 'Buat akun & masuk' : 'Masuk'}</button>
        {!baru && <button type="button" className="btn" onClick={lupa}>Lupa password</button>}
      </form>
    </div>
  )
}
