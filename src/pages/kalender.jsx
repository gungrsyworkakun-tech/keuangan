import { kalenderBulan, geserBulanKey } from '../lib/hitung'
import { bulanLabel, ringkas } from '../lib/format'

const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export default function Kalender({ transaksi, bulan, setBulan, pilih, setPilih }) {
  const k = kalenderBulan(transaksi, bulan)
  const sel = Array(k.mulaiHari).fill(null).concat(k.hari)
  return (
    <div className="kal">
      <div className="kal-head">
        <button className="btn sm" aria-label="Bulan sebelumnya" onClick={() => { setBulan(geserBulanKey(bulan, -1)); setPilih(null) }}>‹</button>
        <strong>{bulanLabel(bulan)}</strong>
        <button className="btn sm" aria-label="Bulan berikutnya" onClick={() => { setBulan(geserBulanKey(bulan, 1)); setPilih(null) }}>›</button>
      </div>
      <div className="kal-grid kal-nama">{NAMA_HARI.map((h) => <span key={h}>{h}</span>)}</div>
      <div className="kal-grid">
        {sel.map((h, i) => h === null ? <span key={'k' + i} /> : (
          <button key={h.tgl} className={'kal-hari' + (pilih === h.tgl ? ' on' : '') + (h.n ? ' ada' : '')} aria-pressed={pilih === h.tgl}
            aria-label={`${+h.tgl.slice(8)}: masuk ${h.masuk}, keluar ${h.keluar}`} onClick={() => setPilih(pilih === h.tgl ? null : h.tgl)}>
            <b>{+h.tgl.slice(8)}</b>
            {h.keluar > 0 && <small className="out">{ringkas(h.keluar)}</small>}
            {h.masuk > 0 && <small className="in">{ringkas(h.masuk)}</small>}
          </button>
        ))}
      </div>
      <p className="hint">Bulan ini: masuk <b className="in">{ringkas(k.totalMasuk)}</b> · keluar <b className="out">{ringkas(k.totalKeluar)}</b>. Ketuk tanggal untuk melihat transaksinya.</p>
    </div>
  )
}
