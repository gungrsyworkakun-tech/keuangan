import { useState } from 'react'
import { Panel } from './ui'
import { I } from '../components/icons'
import { inisial } from '../lib/format'
import skripBackup from '../../apps-script/Backup.gs?raw'
import { buatBerkas, bacaBerkas, namaBerkas, simpanBerkas } from '../lib/backup-file'

function Pesan({ p }) {
  if (!p) return null
  return <p role={p.ok ? 'status' : 'alert'} className={p.ok ? 'in' : 'out'}>{p.teks}</p>
}

function waktu(iso) {
  if (!iso) return 'belum pernah'
  try { return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

function BackupSheets({ c }) {
  const terhubung = Boolean(c.meta && c.meta.id)
  const [url, setUrl] = useState(''), [kunci, setKunci] = useState(''), [salin, setSalin] = useState('')
  return (
    <Panel title="Backup otomatis ke Google Sheets" sub="Data utama ada di HP ini. Salinannya otomatis dikirim ke Sheet milikmu">
      {!terhubung && c.status !== 'pilih' && c.jenis === 'script' && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); c.hubungkan({ url: url.trim(), kunci }) }}>
          <p className="hint">Tempel <b>Link</b> dan <b>Kunci</b> dari skrip di Google Sheet-mu. Data tetap utama di HP; Sheet hanya salinan yang diperbarui otomatis.</p>
          <label>Link skrip<input inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
          <label>Kunci rahasia<input type="password" autoComplete="off" value={kunci} onChange={(e) => setKunci(e.target.value)} /></label>
          {c.pesan && <p role="alert" className="out">{c.pesan}</p>}
          <button className="btn primary" disabled={c.status === 'menghubungkan' || !url || !kunci}>{c.status === 'menghubungkan' ? 'Menghubungkan…' : 'Hubungkan & tes'}</button>
          <details className="pasang">
            <summary>Cara menyiapkan Sheet (sekali, sekitar 5 menit)</summary>
            <ol>
              <li>Buka <b>sheets.new</b> untuk membuat Google Sheet kosong.</li>
              <li>Menu <b>Ekstensi → Apps Script</b>. Hapus isinya, lalu tempel skrip (tombol di bawah).</li>
              <li>Di baris pertama skrip, ganti <b>KUNCI_RAHASIA</b> dengan kata rahasia buatanmu (minimal 16 huruf/angka), lalu simpan.</li>
              <li>Klik <b>Deploy → Deployment baru → Aplikasi web</b>. Jalankan sebagai <b>Saya</b>, akses <b>Siapa saja</b>, lalu <b>Deploy</b> dan izinkan akses.</li>
              <li>Salin <b>URL aplikasi web</b> (berakhiran /exec) ke kolom Link di atas, dan kata rahasia tadi ke kolom Kunci.</li>
            </ol>
            <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(skripBackup); setSalin('Skrip tersalin') } catch { setSalin('Tidak bisa menyalin; buka file apps-script/Backup.gs') } }}>Salin skrip</button>
            {salin && <small className="hint"> {salin}</small>}
          </details>
        </form>
      )}
      {!terhubung && c.status !== 'pilih' && c.jenis !== 'script' && (
        <div className="stack">
          <p className="hint">Masuk dengan akun Google. Duitku membuat satu spreadsheet bernama “Duitku Backup” di Google Drive-mu. Aplikasi hanya bisa membuka file itu, bukan file Drive lainnya.</p>
          {c.pesan && <p role="alert" className="out">{c.pesan}</p>}
          <button className="btn primary" disabled={c.status === 'menghubungkan'} onClick={() => c.hubungkan()}>{c.status === 'menghubungkan' ? 'Menghubungkan…' : 'Masuk dengan Google'}</button>
        </div>
      )}
      {c.status === 'pilih' && c.pilihan && (
        <div className="stack">
          <p><b>Sudah ada data di kedua tempat.</b> HP ini berisi {c.pilihan.jumlahHp} baris, Google Sheets berisi {c.pilihan.jumlahSheet} baris. Pilih yang dipakai. Yang tidak dipilih akan tertimpa.</p>
          <button className="btn primary" onClick={c.pakaiSheets}>Pakai data dari Sheets</button>
          <button className="btn" onClick={c.pakaiHp}>Pakai data di HP ini</button>
        </div>
      )}
      {terhubung && c.status !== 'pilih' && (
        <div className="stack">
          <p>Terhubung{c.meta.email ? ' ke ' + c.meta.email : ''}. Terakhir dicadangkan: <b>{waktu(c.meta.terakhir)}</b>.</p>
          {c.status === 'gagal' && <p role="alert" className="out">{c.pesan || 'Backup gagal'}. Data tetap aman di HP, akan dicoba lagi otomatis.</p>}
          <div className="actions-row">
            <button className="btn" onClick={c.cadangkanSekarang} disabled={c.status === 'menyimpan'}>{c.status === 'menyimpan' ? 'Mencadangkan…' : 'Cadangkan sekarang'}</button>
            <button className="btn" onClick={() => window.confirm('Data di HP akan diganti dengan data dari Sheets. Lanjutkan?') && c.pulihkan()}>Pulihkan dari Sheets</button>
            <button className="btn danger" onClick={c.putuskan}>Putuskan</button>
          </div>
        </div>
      )}
    </Panel>
  )
}

function BackupFile({ state, pulihkan }) {
  const [pesan, setPesan] = useState(null)
  const [busy, setBusy] = useState(false)
  const simpan = async () => {
    setBusy(true); setPesan(null)
    try { const r = await simpanBerkas(buatBerkas(state), namaBerkas()); setPesan({ ok: true, teks: r === 'dibagikan' ? 'Pilih tujuan penyimpanan (Drive, WhatsApp, Files, dll).' : 'File backup diunduh.' }) }
    catch (e) { if (!/cancel|dismiss/i.test(String(e && e.message))) setPesan({ ok: false, teks: 'Gagal menyimpan backup: ' + ((e && e.message) || 'coba lagi') }) }
    setBusy(false)
  }
  const pilih = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''
    if (!f) return
    setPesan(null)
    try {
      const r = bacaBerkas(await f.text())
      if (window.confirm('File ini berisi ' + r.jumlah + ' catatan. Data di HP ini akan diganti. Lanjutkan?')) { pulihkan(r.state); setPesan({ ok: true, teks: 'Data berhasil dipulihkan (' + r.jumlah + ' catatan).' }) }
    } catch (err) { setPesan({ ok: false, teks: err.message }) }
  }
  return (
    <Panel title="Backup ke file" sub="Data utama ada di HP ini. Simpan salinannya ke tempat lain supaya aman">
      <div className="stack">
        <p className="hint">Tekan <b>Simpan backup</b>, lalu pilih tujuan (Google Drive, WhatsApp ke dirimu sendiri, dll). Kalau ganti HP atau data hilang, tekan <b>Pulihkan dari file</b> dan pilih file itu. Lakukan secara rutin, misalnya seminggu sekali.</p>
        <Pesan p={pesan} />
        <div className="actions-row">
          <button className="btn primary" onClick={simpan} disabled={busy}>{busy ? 'Menyiapkan…' : 'Simpan backup'}</button>
          <label className="btn" style={{ cursor: 'pointer' }}>Pulihkan dari file<input type="file" accept=".json,application/json" onChange={pilih} style={{ display: 'none' }} /></label>
        </div>
      </div>
    </Panel>
  )
}

export default function Profil({ akun }) {
  const { profil, simpanProfil, gantiPassword, sheets, onLogout, onBackup, cadang, native, state, pulihkanData } = akun
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
          <small>{sheets ? `Username: ${profil.username || '-'}` : cadang ? 'Data tersimpan di HP ini' : 'Mode lokal (belum terhubung Sheets)'}</small></div>
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
        {!native && <Panel title="Ganti password" sub="Minimal 8 karakter">
          {sheets ? (
            <form className="stack" onSubmit={kirimPass}>
              <label>Password lama<input type="password" autoComplete="current-password" value={lama} onChange={(e) => setLama(e.target.value)} /></label>
              <label>Password baru<input type="password" autoComplete="new-password" value={baru} onChange={(e) => setBaru(e.target.value)} /></label>
              <label>Ulangi password baru<input type="password" autoComplete="new-password" value={ulang} onChange={(e) => setUlang(e.target.value)} /></label>
              <Pesan p={pp} />
              <button className="btn primary" disabled={busyP}>{busyP ? 'Menyimpan…' : 'Ganti password'}</button>
            </form>
          ) : <p className="empty">Login dan password aktif setelah aplikasi terhubung ke Google Sheets.</p>}
        </Panel>}
        {native && <BackupFile state={state} pulihkan={pulihkanData} />}
        {cadang && <BackupSheets c={cadang} />}
      </div>
      {!native && <Panel title="Pasang di HP" sub="Buka Duitku dari layar utama, tanpa mengetik alamat">
        <details className="pasang" open>
          <summary>Android (Chrome)</summary>
          <ol><li>Buka alamat Duitku di Chrome lalu login.</li><li>Ketuk menu <b>⋮</b> → <b>Instal aplikasi</b> (atau <b>Tambahkan ke layar utama</b>).</li><li>Tekan lama ikon <b>Duitku</b> di layar utama untuk pintasan <b>Catat pengeluaran</b> dan <b>Catat pemasukan</b>.</li></ol>
        </details>
        <details className="pasang">
          <summary>iPhone (Safari)</summary>
          <ol><li>Buka alamat Duitku di Safari.</li><li>Ketuk tombol <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>.</li></ol>
        </details>
        <small className="hint">Di HP pribadi, centang “Ingat saya” saat login supaya tidak perlu masuk ulang setiap membuka.</small>
      </Panel>}
      {(sheets || native) && (
        <Panel title="Data & akun">
          <div className="actions-row">
            {!native && <button className="btn" onClick={onBackup}><I n="backup" size={18} /> Backup ke Drive</button>}
            <button className="btn danger" onClick={onLogout}><I n="logout" size={18} /> {native ? 'Kunci aplikasi' : 'Keluar'}</button>
          </div>
        </Panel>
      )}
    </>
  )
}
