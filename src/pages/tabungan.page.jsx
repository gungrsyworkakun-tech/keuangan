import { useMemo, useState } from 'react'
import { Panel, Empty, Progress } from './ui'
import { BarChart } from '../components/charts'
import { rupiah, bulanLabel, bulanPendek } from '../lib/format'
import { POS_TABUNGAN, posDari, adalahBulan } from '../lib/store'

const sekarang = () => new Date().toISOString().slice(0, 7)
const geser = (key, n) => { const [y, m] = key.split('-').map(Number); const i = y * 12 + m - 1 + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}` }
const KET = {
  rutin: 'Tabungan bulanan biasa',
  darurat: 'Cadangan untuk kejadian mendadak (patokan umum: 3–6 kali pengeluaran bulanan)',
  kesehatan: 'Simpanan untuk biaya berobat, obat, atau asuransi',
}

export default function Tabungan({ state, dispatch }) {
  const semua = state.savings || []
  const kini = sekarang()
  const [pos, setPos] = useState('rutin')
  const [tahun, setTahun] = useState(Number(kini.slice(0, 4)))
  const [isi, setIsi] = useState({ from: `${tahun - 1}-01`, to: geser(kini, -1), amount: '' })
  const [pesan, setPesan] = useState('')
  const [pakai, setPakai] = useState({ amount: '', note: '' })
  const [tgt, setTgt] = useState('')
  const [err, setErr] = useState('')
  const namaPos = POS_TABUNGAN.find(([k]) => k === pos)[1]

  const milik = useMemo(() => semua.filter((x) => posDari(x) === pos), [semua, pos])
  const setoran = milik.filter((x) => adalahBulan(x) && x.amount > 0)
  const pemakaian = milik.filter((x) => adalahBulan(x) && x.amount < 0).sort((a, b) => b.month.localeCompare(a.month))
  const target = milik.find((x) => x.month === 'target')?.amount || 0
  const peta = useMemo(() => Object.fromEntries(setoran.map((x) => [x.month, x])), [setoran])
  const disetor = setoran.reduce((a, x) => a + x.amount, 0)
  const dipakai = pemakaian.reduce((a, x) => a - x.amount, 0)
  const saldo = disetor - dipakai
  const terisi = setoran.length
  const rata = terisi ? Math.round(disetor / terisi) : 0
  const terbesar = setoran.reduce((a, x) => (x.amount > (a?.amount || 0) ? x : a), null)
  const saldoPos = (k) => semua.filter((x) => posDari(x) === k && adalahBulan(x)).reduce((a, x) => a + x.amount, 0)
  const totalSemua = POS_TABUNGAN.reduce((a, [k]) => a + saldoPos(k), 0)
  let beruntun = 0
  for (let k = peta[kini] ? kini : geser(kini, -1); peta[k]; k = geser(k, -1)) beruntun++
  const bulanTahun = Array.from({ length: 12 }, (_, i) => `${tahun}-${String(i + 1).padStart(2, '0')}`)
  const totalTahun = bulanTahun.reduce((a, k) => a + (peta[k]?.amount || 0), 0)
  const batang = bulanTahun.map((k) => ({ label: bulanPendek(k), jumlah: peta[k]?.amount || 0 }))

  const simpan = (k, e, ubah) => {
    const v = ubah === 'amount' ? Number(e.target.value) : (peta[k]?.amount || 0)
    if (ubah === 'amount' && v === (peta[k]?.amount || 0)) return
    if (ubah === 'note' && e.target.value === (peta[k]?.note || '')) return
    if (!(v > 0)) return ubah === 'amount' ? dispatch({ type: 'setSaving', pos, month: k, amount: 0 }) : undefined
    dispatch({ type: 'setSaving', pos, month: k, amount: v, note: ubah === 'note' ? e.target.value.trim() : undefined })
  }
  const submitIsi = (e) => {
    e.preventDefault()
    const n = Number(isi.amount)
    if (!isi.from || !isi.to || isi.from > isi.to) return setPesan('Bulan awal harus sebelum bulan akhir')
    if (!(n > 0)) return setPesan('Jumlah harus lebih dari 0')
    dispatch({ type: 'fillSavings', pos, from: isi.from, to: isi.to, amount: n })
    setPesan('Bulan yang masih kosong sudah terisi. Silakan ubah per bulan bila nominalnya berbeda.')
    setIsi({ ...isi, amount: '' })
  }
  const submitPakai = (e) => {
    e.preventDefault()
    const n = Number(pakai.amount)
    if (!(n > 0)) return setErr('Jumlah harus lebih dari 0')
    if (n > saldo) return setErr('Melebihi saldo ' + namaPos.toLowerCase() + ' (' + rupiah(saldo) + ')')
    dispatch({ type: 'pakaiDana', pos, month: kini, amount: n, note: pakai.note.trim().slice(0, 80) })
    setErr(''); setPakai({ amount: '', note: '' })
  }
  const submitTarget = (e) => { e.preventDefault(); dispatch({ type: 'setTargetTabungan', pos, amount: Number(tgt) || 0 }); setTgt('') }

  return (
    <>
      <div className="chips" role="group" aria-label="Pilih jenis tabungan" style={{ marginBottom: 12 }}>
        {POS_TABUNGAN.map(([k, l]) => <button key={k} className={'chip' + (pos === k ? ' on' : '')} aria-pressed={pos === k} onClick={() => { setPos(k); setPesan(''); setErr('') }}>{l}</button>)}
      </div>
      <section className="hero">
        <small>Saldo {namaPos.toLowerCase()}</small>
        <div className="hero-amt">{rupiah(saldo)}</div>
        <div className="hero-sub">
          <div><small>Rata-rata / bulan</small><b>{rupiah(rata)}</b></div>
          <div><small>Bulan terisi</small><b>{terisi}</b></div>
          <div><small>Beruntun</small><b>{beruntun} bln</b></div>
          {dipakai > 0 && <div><small>Sudah dipakai</small><b>{rupiah(dipakai)}</b></div>}
        </div>
      </section>
      <small className="hint">{KET[pos]}. Total semua tabungan: <b>{rupiah(totalSemua)}</b></small>

      {pos !== 'rutin' && (
        <Panel title={'Target ' + namaPos.toLowerCase()} sub={target ? `${rupiah(saldo)} dari ${rupiah(target)}` : 'Belum diatur'}>
          {target > 0 && <><Progress value={saldo} max={target} /><small>{saldo >= target ? 'Target tercapai 🎉' : `Kurang ${rupiah(target - saldo)}`}</small></>}
          <form className="inline" onSubmit={submitTarget} style={{ marginTop: 10 }}>
            <input type="number" inputMode="numeric" placeholder={target ? 'Ubah target (Rp), 0 = hapus' : 'Target (Rp)'} value={tgt} onChange={(e) => setTgt(e.target.value)} aria-label="Target" />
            <button className="btn">Simpan target</button>
          </form>
        </Panel>
      )}

      <Panel title={namaPos + ' ' + tahun} sub={`Total disetor tahun ini ${rupiah(totalTahun)}`}
        action={<div className="chips" role="group" aria-label="Pilih tahun"><button className="chip" aria-label="Tahun sebelumnya" onClick={() => setTahun(tahun - 1)}>‹</button><span className="chip on">{tahun}</span><button className="chip" aria-label="Tahun berikutnya" onClick={() => setTahun(tahun + 1)}>›</button></div>}>
        <BarChart data={batang} series={[{ key: 'jumlah', label: 'Setoran', color: 'var(--data-1)' }]} height={180} />
      </Panel>
      <Panel title="Isi per bulan" sub="Ketik nominal tiap bulan; kosongkan untuk menghapus">
        {bulanTahun.map((k) => {
          const x = peta[k], depan = k > kini
          return (
            <div key={pos + k} className="budget">
              <div className="trow">
                <div><strong>{bulanLabel(k)}</strong><small>{x ? rupiah(x.amount) : depan ? 'Belum waktunya' : 'Belum diisi'}</small></div>
                <label className="mini">Setoran (Rp)<input key={pos + k + ':' + (x?.amount || 0)} type="number" inputMode="numeric" defaultValue={x?.amount || ''} placeholder="0" onBlur={(e) => simpan(k, e, 'amount')} aria-label={'Setoran ' + bulanLabel(k)} /></label>
              </div>
              {x && <input key={pos + k + ':n:' + (x.note || '')} className="notetab" defaultValue={x.note || ''} placeholder="Catatan (opsional)" maxLength={80} onBlur={(e) => simpan(k, e, 'note')} aria-label={'Catatan ' + bulanLabel(k)} />}
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
      {pos !== 'rutin' && (
        <Panel title="Pakai dana" sub={`Catat saat ${namaPos.toLowerCase()} dipakai; saldo berkurang`}>
          <form className="inline" onSubmit={submitPakai}>
            <input type="number" inputMode="numeric" placeholder="Jumlah dipakai (Rp)" value={pakai.amount} onChange={(e) => setPakai({ ...pakai, amount: e.target.value })} aria-label="Jumlah dipakai" />
            <input placeholder={pos === 'kesehatan' ? 'Untuk apa (mis. berobat)' : 'Untuk apa'} value={pakai.note} maxLength={80} onChange={(e) => setPakai({ ...pakai, note: e.target.value })} aria-label="Keperluan" />
            <button className="btn primary">Catat</button>
          </form>
          {err && <em role="alert">{err}</em>}
          {pemakaian.map((x) => (
            <div key={x.id} className="trow"><div><strong>{rupiah(-x.amount)}</strong><small>{bulanLabel(x.month)}{x.note ? ' · ' + x.note : ''}</small></div><button className="btn sm" onClick={() => dispatch({ type: 'deleteSaving', id: x.id })} aria-label={'Hapus pemakaian ' + rupiah(-x.amount)}>Hapus</button></div>
          ))}
        </Panel>
      )}
      {terbesar && <Panel title="Setoran terbesar"><p><b>{rupiah(terbesar.amount)}</b> <small>pada {bulanLabel(terbesar.month)}</small></p></Panel>}
      {terisi === 0 && <Empty>Belum ada setoran di {namaPos.toLowerCase()}. Mulai isi bulan di atas atau pakai isi sekaligus.</Empty>}
    </>
  )
}
