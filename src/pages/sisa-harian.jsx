import { useState } from 'react'
import { Panel, Progress } from './ui'
import { rupiah, tanggal, hariIni } from '../lib/format'
import { sisaHarian } from '../lib/hitung'

const KUNCI = 'duitku-gajian'
const bacaGajian = () => { try { const n = Number(localStorage.getItem(KUNCI)); return n >= 1 && n <= 28 ? n : 1 } catch { return 1 } }

export default function SisaHarian({ state }) {
  const [gajian, setGajian] = useState(bacaGajian)
  const [ubah, setUbah] = useState(false)
  const s = sisaHarian({ budgets: state.budgets, transactions: state.transactions, hari: hariIni(), gajian })
  const simpan = (v) => { const n = Math.min(28, Math.max(1, Math.floor(Number(v)) || 1)); setGajian(n); try { localStorage.setItem(KUNCI, String(n)) } catch {} }
  return (
    <Panel title="Sisa uang harian" sub={`Periode ${tanggal(s.mulai)} – ${tanggal(s.akhir)}`}>
      {!s.ada ? <p className="hint">Isi dulu anggaran pengeluaran di menu Anggaran, nanti di sini muncul berapa uang yang boleh kamu pakai tiap hari.</p> : (
        <div className="stack">
          <div>
            <small className="hint">Boleh dipakai hari ini</small>
            <div className="hero-amt" style={{ color: s.sisaHariIni < 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>{rupiah(Math.max(0, s.sisaHariIni))}</div>
            {s.sisaHariIni < 0 && <small className="out">Hari ini sudah lewat {rupiah(-s.sisaHariIni)} dari batas harian</small>}
          </div>
          <Progress value={s.terpakai} max={s.total} warn={s.terpakai > s.total} />
          <small className="hint">Sisa anggaran {rupiah(s.sisa)} untuk {s.sisaHari} hari lagi. Sudah dipakai {rupiah(s.terpakai)} dari {rupiah(s.total)}.</small>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        {ubah ? (
          <label>Tanggal gajian / awal periode (1–28)<input type="number" min="1" max="28" value={gajian} onChange={(e) => simpan(e.target.value)} onBlur={() => setUbah(false)} autoFocus /></label>
        ) : <button className="linkbtn" onClick={() => setUbah(true)}>Periode mulai tanggal {gajian} · ubah</button>}
      </div>
    </Panel>
  )
}
