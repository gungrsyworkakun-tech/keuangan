import { useState } from 'react'
import { Panel } from './ui'
import { I } from '../components/icons'
import { inisial } from '../lib/format'

function Pesan({ p }) {
  if (!p) return null
  return <p role={p.ok ? 'status' : 'alert'} className={p.ok ? 'in' : 'out'}>{p.teks}</p>
}

export default function Profil({ akun }) {
  const { profil, simpanProfil, gantiPassword, sheets, onLogout, onBackup } = akun
  const [nama, setNama] = useState(profil.nama || '')
  const [pn, setPn] = useState(null), [busyN, setBusyN] = useState(false)
  const [lama, setLama] = useState(''), [baru, setBaru] = useState(''), [ulang, setUlang] = useState('')
  const [pp, setPp] = useState(null), [busyP, setBusyP] = useState(false)

  const kirimNama = async (e) => {
    e.preventDefault(); setBusyN(true); setPn(null)
    try { await simpanProfil(nama); setPn({ ok: true, teks: 'Profil tersimpan' }) }
    catch (err) { setPn({ ok: false, teks: err.message }) }
    setBusyN(false)
  }
  const kirimPass = async (e) => {
    e.preventDefault(); setPp(null)
    if (baru.length < 8) return setPp({ ok: false, teks: 'Password baru minimal 8 karakter' })
    if (baru !== ulang) return setPp({ ok: false, teks: 'Pengulangan password tidak sama' })
    setBusyP(true)
    try { await gantiPassword(lama, baru); setPp({ ok: true, teks: 'Password berhasil diganti' }); setLama(''); setBaru(''); setUlang('') }
    catch (err) { setPp({ ok: false, teks: err.message }) }
    setBusyP(false)
  }

  return (
    <>
      <section className="hero profil-hero">
        <span className="avatar big-av">{inisial(profil.nama || profil.username)}</span>
        <div><div className="hero-amt sm">{profil.nama || profil.username || 'Pengguna'}</div>
          <small>{sheets ? `Username: ${profil.username || '-'}` : 'Mode lokal (belum terhubung Sheets)'}</small></div>
      </section>
      <div className="grid-main">
        <Panel title="Edit profil" sub="Nama ini tampil di aplikasi">
          <form className="stack" onSubmit={kirimNama}>
            <label>Nama tampilan<input value={nama} maxLength={40} onChange={(e) => setNama(e.target.value)} /></label>
            {sheets && <label>Username<input value={profil.username || ''} disabled /></label>}
            <Pesan p={pn} />
            <button className="btn primary" disabled={busyN}>{busyN ? 'Menyimpan…' : 'Simpan profil'}</button>
          </form>
        </Panel>
        <Panel title="Ganti password" sub="Minimal 8 karakter">
          {sheets ? (
            <form className="stack" onSubmit={kirimPass}>
              <label>Password lama<input type="password" autoComplete="current-password" value={lama} onChange={(e) => setLama(e.target.value)} /></label>
              <label>Password baru<input type="password" autoComplete="new-password" value={baru} onChange={(e) => setBaru(e.target.value)} /></label>
              <label>Ulangi password baru<input type="password" autoComplete="new-password" value={ulang} onChange={(e) => setUlang(e.target.value)} /></label>
              <Pesan p={pp} />
              <button className="btn primary" disabled={busyP}>{busyP ? 'Menyimpan…' : 'Ganti password'}</button>
            </form>
          ) : <p className="empty">Login dan password aktif setelah aplikasi terhubung ke Google Sheets.</p>}
        </Panel>
      </div>
      <Panel title="Pasang di HP" sub="Buka Duitku dari layar utama, tanpa mengetik alamat">
        <details className="pasang" open>
          <summary>Android (Chrome)</summary>
          <ol><li>Buka alamat Duitku di Chrome lalu login.</li><li>Ketuk menu <b>⋮</b> → <b>Instal aplikasi</b> (atau <b>Tambahkan ke layar utama</b>).</li><li>Tekan lama ikon <b>Duitku</b> di layar utama untuk pintasan <b>Catat pengeluaran</b> dan <b>Catat pemasukan</b>.</li></ol>
        </details>
        <details className="pasang">
          <summary>iPhone (Safari)</summary>
          <ol><li>Buka alamat Duitku di Safari.</li><li>Ketuk tombol <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>.</li></ol>
        </details>
        <small className="hint">Di HP pribadi, centang “Ingat saya” saat login supaya tidak perlu masuk ulang setiap membuka.</small>
      </Panel>
      {sheets && (
        <Panel title="Data & akun">
          <div className="actions-row">
            <button className="btn" onClick={onBackup}><I n="backup" size={18} /> Backup ke Drive</button>
            <button className="btn danger" onClick={onLogout}><I n="logout" size={18} /> Keluar</button>
          </div>
        </Panel>
      )}
    </>
  )
}
