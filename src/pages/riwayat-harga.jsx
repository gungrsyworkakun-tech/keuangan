import { useEffect, useMemo, useState } from 'react'
import { Panel } from './ui'
import { LineChart } from '../components/charts'
import { rupiah, hariIni } from '../lib/format'
import { ringkasRiwayat } from '../lib/hitung'

const RENTANG = [[30, '30 hari'], [90, '90 hari'], [365, '1 tahun']]
const tglPendek = (t) => new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

// daftar: [{ kunci:'emasid:ANTAM|buyback', nama:'Emas Antam' }]; klien.riwayat(jenis, hari) -> [{t,p}]
export default function RiwayatHarga({ daftar, klien, versiKunci }) {
  const [pilih, setPilih] = useState(daftar[0]?.kunci || '')
  const [hari, setHari] = useState(90)
  const [st, setSt] = useState({ muat: true, titik: [], galat: '' })
  const ada = daftar.some((d) => d.kunci === pilih)
  const kunci = ada ? pilih : daftar[0]?.kunci || ''
  useEffect(() => {
    if (!kunci) return
    let batal = false
    setSt((x) => ({ ...x, muat: true, galat: '' }))
    klien.riwayat(kunci, Math.max(hari, 30))
      .then((titik) => { if (!batal) setSt({ muat: false, titik, galat: '' }) })
      .catch((e) => { if (!batal) setSt({ muat: false, titik: [], galat: e.message }) })
    return () => { batal = true }
  }, [kunci, hari, versiKunci])
  const r = useMemo(() => ringkasRiwayat(st.titik, hari, hariIni()), [st.titik, hari])
  if (!daftar.length) return null
  return (
    <Panel title="Grafik harga" sub="Dicatat tiap kali harga diperbarui">
      <div className="stack">
        <div className="toolbar">
          {daftar.length > 1 && <select aria-label="Pilih aset" value={kunci} onChange={(e) => setPilih(e.target.value)}>{daftar.map((d) => <option key={d.kunci} value={d.kunci}>{d.nama}</option>)}</select>}
          <div className="seg">{RENTANG.map(([n, l]) => <button key={n} className={hari === n ? 'on' : ''} onClick={() => setHari(n)}>{l}</button>)}</div>
        </div>
        {st.galat === 'SKRIP_LAMA'
          ? <p className="hint">Grafik butuh skrip Sheet versi 3. Buka <b>Profil → Salin skrip</b>, tempel ulang di Apps Script, lalu <b>Deploy → Kelola deployment → Versi baru</b>. Link dan kunci tidak berubah.</p>
          : st.galat ? <p role="alert" className="out">Grafik belum bisa dimuat: {st.galat}</p>
          : st.muat && !st.titik.length ? <p className="hint">Memuat grafik…</p>
          : !r.ada || r.data.length < 2 ? <p className="hint">Grafik mulai terisi sejak hari ini. Buka halaman ini tiap hari (atau tekan Perbarui harga) dan garisnya akan tumbuh. Harga masa lalu tidak bisa diambil.</p>
          : <>
            <div className="hero-sub" style={{ margin: 0 }}>
              <div><small>Sekarang</small><b>{rupiah(r.akhir)}</b></div>
              <div><small>Perubahan</small><b className={r.ubah >= 0 ? 'pos' : 'neg'}>{r.ubah >= 0 ? '+' : '−'}{rupiah(Math.abs(r.ubah))} ({r.persen.toFixed(1)}%)</b></div>
            </div>
            <LineChart dasarNol={false} maksLabel={5} formatY={(n) => (n / 1e6).toFixed(2).replace('.', ',') + ' jt'} height={200} data={r.data.map((x) => ({ label: tglPendek(x.t), value: x.p }))} />
            <small className="hint">Tertinggi {rupiah(r.tertinggi)} · terendah {rupiah(r.terendah)}</small>
          </>}
      </div>
    </Panel>
  )
}
