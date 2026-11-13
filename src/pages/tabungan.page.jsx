import { useMemo, useState } from 'react'
import { Panel, Empty } from './ui'
import { BarChart } from '../components/charts'
import { rupiah, bulanLabel, bulanPendek } from '../lib/format'

const sekarang = () => new Date().toISOString().slice(0, 7)
const geser = (key, n) => { const [y, m] = key.split('-').map(Number); const i = y * 12 + m - 1 + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}` }

export default function Tabungan({ state, dispatch }) {
  const savings = state.savings || []
  const kini = sekarang()
  const [tahun, setTahun] = useState(Number(kini.slice(0, 4)))
  const [isi, setIsi] = useState({ from: `${tahun - 1}-01`, to: geser(kini, -1), amount: '' })
  const [pesan, setPesan] = useState('')
  const peta = useMemo(() => Object.fromEntries(savings.map((x) => [x.month, x])), [savings])
  const total = savings.reduce((a, x) => a + x.amount, 0)
  const terisi = savings.length
  const rata = terisi ? Math.round(total / terisi) : 0
  const terbesar = savings.reduce((a, x) => (x.amount > (a?.amount || 0) ? x : a), null)
  // berturut-turut: dihitung mundur dari bulan ini (kalau bulan ini belum diisi, mulai dari bulan lalu)
  let beruntun = 0
  for (let k = peta[kini] ? kini : geser(kini, -1); peta[k]; k = geser(k, -1)) beruntun++
  const bulanTahun = Array.from({ length: 12 }, (_, i) => `${tahun}-${String(i + 1).padStart(2, '0')}`)
  const totalTahun = bulanTahun.reduce((a, k) => a + (peta[k]?.amount || 0), 0)
  const batang = bulanTahun.map((k) => ({ label: bulanPendek(k), jumlah: peta[k]?.amount || 0 }))
  const simpan = (k, e, ubah) => {
    const v = ubah === 'amount' ? Number(e.target.value) : (peta[k]?.amount || 0)
    if (ubah === 'amount' && v === (peta[k]?.amount || 0)) return
    if (ubah === 'note' && e.target.value === (peta[k]?.note || '')) return
    if (!(v > 0)) return ubah === 'amount' ? dispatch({ type: 'setSaving', month: k, amount: 0 }) : undefined
    dispatch({ type: 'setSaving', month: k, amount: v, note: ubah === 'note' ? e.target.value.trim() : undefined })
  }
  const submitIsi = (e) => {
    e.preventDefault()
    const n = Number(isi.amount)
    if (!isi.from || !isi.to || isi.from > isi.to) return setPesan('Bulan awal harus sebelum bulan akhir')
    if (!(n > 0)) return setPesan('Jumlah harus lebih dari 0')
    dispatch({ type: 'fillSavings', from: isi.from, to: isi.to, amount: n })
    setPesan('Bulan yang masih kosong sudah terisi. Silakan ubah per bulan bila nominalnya berbeda.')
    setIsi({ ...isi, amount: '' })
  }
  return (
    <>
      <section className="hero">
        <small>Total tabungan rutin</small>
        <div className="hero-amt">{rupiah(total)}</div>
        <div className="hero-sub">
          <div><small>Rata-rata / bulan</small><b>{rupiah(rata)}</b></div>
          <div><small>Bulan terisi</small><b>{terisi}</b></div>
          <div><small>Beruntun</small><b>{beruntun} bln</b></div>
        </div>
      </section>
      <Panel title={'Tabungan ' + tahun} sub={`Total tahun ini ${rupiah(totalTahun)}`}
        action={<div className="chips" role="group" aria-label="Pilih tahun"><button className="chip" aria-label="Tahun sebelumnya" onClick={() => setTahun(tahun - 1)}>‹</button><span className="chip on">{tahun}</span><button className="chip" aria-label="Tahun berikutnya" onClick={() => setTahun(tahun + 1)}>›</button></div>}>
        <BarChart data={batang} series={[{ key: 'jumlah', label: 'Setoran', color: 'var(--data-1)' }]} height={180} />
      </Panel>
      <Panel title="Isi per bulan" sub="Ketik nominal tiap bulan; kosongkan untuk menghapus">
        {bulanTahun.map((k) => {
          const x = peta[k], depan = k > kini
          return (
            <div key={k} className="budget">
              <div className="trow">
                <div><strong>{bulanLabel(k)}</strong><small>{x ? rupiah(x.amount) : depan ? 'Belum waktunya' : 'Belum diisi'}</small></div>
                <label className="mini">Setoran (Rp)<input key={k + ':' + (x?.amount || 0)} type="number" inputMode="numeric" defaultValue={x?.amount || ''} placeholder="0" onBlur={(e) => simpan(k, e, 'amount')} aria-label={'Setoran ' + bulanLabel(k)} /></label>
              </div>
              {x && <input key={k + ':n:' + (x.note || '')} className="notetab" defaultValue={x.note || ''} placeholder="Catatan (opsional)" maxLength={80} onBlur={(e) => simpan(k, e, 'note')} aria-label={'Catatan ' + bulanLabel(k)} />}
            </div>
          )
        })}
      </Panel>
      <Panel title="Isi data lama sekaligus" sub="Untuk menyusul tabungan sebelumnya dengan nominal yang sama. Hanya bulan yang masih kosong yang diisi.">
        <form className="inline" onSubmit={submitIsi}>
          <label className="mini">Dari bulan<input type="month" value={isi.from} onChange={(e) => setIsi({ ...isi, from: e.target.value })} /></label>
          <label className="mini">Sampai bulan<input type="month" value={isi.to} onChange={(e) => setIsi({ ...isi, to: e.target.value })} /></label>
          <label className="mini">Nominal / bulan<input type="number" inputMode="numeric" placeholder="Rp" value={isi.amount} onChange={(e) => setIsi({ ...isi, amount: e.target.value })} /></label>
          <button className="btn primary">Isi</button>
        </form>
        {pesan && <p className="empty" role="status">{pesan}</p>}
      </Panel>
      {terbesar && <Panel title="Setoran terbesar"><p><b>{rupiah(terbesar.amount)}</b> <small>pada {bulanLabel(terbesar.month)}</small></p></Panel>}
      {terisi === 0 && <Empty>Belum ada setoran. Mulai isi bulan di atas atau pakai isi sekaligus.</Empty>}
    </>
  )
}
