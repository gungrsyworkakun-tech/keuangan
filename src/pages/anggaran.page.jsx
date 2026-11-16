import { useState } from 'react'
import { Panel, Progress, Empty } from './ui'
import { BarChart } from '../components/charts'
import { rupiah, bulanKey, bulanLabel } from '../lib/format'
import { KATEGORI_KELUAR, KATEGORI_MASUK, adalahTransfer, tipeAnggaran } from '../lib/store'
import EditDialog from './edit-dialog'

export default function Anggaran({ state, dispatch }) {
  const [tipe, setTipe] = useState('out') // out = batas pengeluaran, in = target pemasukan
  const [ed, setEd] = useState(null)
  const [f, setF] = useState({ category: '', limit: '' })
  const [err, setErr] = useState('')
  const masuk = tipe === 'in'
  const months = [...new Set(state.transactions.filter((t) => !adalahTransfer(t)).map((t) => bulanKey(t.date)))].sort()
  const key = months[months.length - 1] || new Date().toISOString().slice(0, 7)
  const daftar = state.budgets.filter((b) => tipeAnggaran(b) === tipe)
  const total = (c) => state.transactions.filter((t) => t.type === tipe && !adalahTransfer(t) && t.category === c && bulanKey(t.date) === key).reduce((a, t) => a + t.amount, 0)
  const kenal = [...new Set([...(masuk ? KATEGORI_MASUK : KATEGORI_KELUAR), ...state.transactions.filter((t) => t.type === tipe && !adalahTransfer(t)).map((t) => t.category)])]
  const belum = kenal.filter((c) => !daftar.some((b) => b.category === c) && total(c) > 0)
  const batang = daftar.map((b) => ({ label: b.category.split(' ')[0], batas: b.limit, pakai: total(b.category) }))
  const tambah = (e) => {
    e.preventDefault()
    const c = f.category.trim(), l = Number(f.limit)
    if (!c) return setErr('Nama kategori wajib diisi')
    if (!(l > 0)) return setErr(masuk ? 'Target harus lebih dari 0' : 'Batas harus lebih dari 0')
    const ada = daftar.find((b) => b.category.toLowerCase() === c.toLowerCase())
    dispatch({ type: 'setBudget', tipe, category: ada ? ada.category : c, limit: l })
    setErr(''); setF({ category: '', limit: '' })
  }
  const ganti = (t) => { setTipe(t); setF({ category: '', limit: '' }); setErr(''); setEd(null) }
  return (
    <>
      <div className="chips" role="group" aria-label="Jenis anggaran" style={{ marginBottom: 12 }}>
        <button className={'chip' + (!masuk ? ' on' : '')} aria-pressed={!masuk} onClick={() => ganti('out')}>Pengeluaran</button>
        <button className={'chip' + (masuk ? ' on' : '')} aria-pressed={masuk} onClick={() => ganti('in')}>Pemasukan</button>
      </div>
      {batang.length > 0 && (
        <Panel title={masuk ? 'Diterima vs target' : 'Terpakai vs batas'} sub={bulanLabel(key)}>
          <BarChart data={batang} series={[{ key: 'batas', label: masuk ? 'Target' : 'Batas', color: 'var(--data-2)' }, { key: 'pakai', label: masuk ? 'Diterima' : 'Terpakai', color: 'var(--data-3)' }]} />
        </Panel>
      )}
      <Panel title={(masuk ? 'Target pemasukan ' : 'Anggaran ') + bulanLabel(key)} sub={masuk ? 'Ubah nama, target, atau hapus target pemasukan' : 'Ubah nama, batas, atau hapus anggaran'}>
        {daftar.length === 0 && <Empty>{masuk ? 'Belum ada target pemasukan. Tambahkan di bawah.' : 'Belum ada anggaran. Tambahkan di bawah.'}</Empty>}
        {daftar.map((b) => {
          const s = total(b.category)
          return (
            <div key={b.category} className="budget">
              <div className="trow">
                <div><strong>{b.category}</strong>
                  <small>{masuk
                    ? `Diterima ${rupiah(s)} dari target ${rupiah(b.limit)}${s >= b.limit ? ' · target tercapai' : ` · kurang ${rupiah(b.limit - s)}`}`
                    : `Terpakai ${rupiah(s)} dari ${rupiah(b.limit)}${s > b.limit ? ` · lebih ${rupiah(s - b.limit)}` : ''}`}</small></div>
                <button className="btn" onClick={() => setEd(b)}>Ubah</button>
              </div>
              <Progress value={s} max={b.limit} warn={!masuk && s > b.limit * 0.9} />
            </div>
          )
        })}
      </Panel>
      {belum.length > 0 && (
        <Panel title={masuk ? 'Belum punya target' : 'Belum punya anggaran'} sub={masuk ? 'Pemasukan bulan ini tanpa target' : 'Pengeluaran bulan ini tanpa batas'}>
          {belum.map((c) => (
            <div key={c} className="budget"><div className="trow"><div><strong>{c}</strong><small>{masuk ? 'Diterima ' : 'Terpakai '}{rupiah(total(c))}</small></div><button className="btn" onClick={() => setF({ category: c, limit: '' })}>{masuk ? 'Beri target' : 'Beri batas'}</button></div></div>
          ))}
        </Panel>
      )}
      <Panel title={masuk ? 'Tambah target pemasukan' : 'Tambah anggaran'}>
        <form className="inline" onSubmit={tambah}>
          <input list="kat-anggaran" placeholder="Kategori (pilih atau ketik baru)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Kategori" maxLength={40} />
          <datalist id="kat-anggaran">{kenal.map((c) => <option key={c} value={c} />)}</datalist>
          <input type="number" inputMode="numeric" placeholder={masuk ? 'Target (Rp)' : 'Batas (Rp)'} value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} aria-label={masuk ? 'Target' : 'Batas'} />
          <button className="btn primary">Simpan</button>
        </form>
        {err && <em role="alert">{err}</em>}
      </Panel>
      <EditDialog item={ed} title={masuk ? 'Ubah target pemasukan' : 'Ubah anggaran'} onClose={() => setEd(null)}
        fields={[{ k: 'category', label: 'Nama kategori', type: 'text' }, { k: 'limit', label: (masuk ? 'Target' : 'Batas') + ' per bulan (Rp)', type: 'number', min: 1 }]}
        onSave={(patch) => dispatch({ type: 'updateBudget', tipe, category: ed.category, patch })}
        onDelete={() => dispatch({ type: 'deleteBudget', tipe, category: ed.category })} />
    </>
  )
}
