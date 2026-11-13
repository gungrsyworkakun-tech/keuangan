import { useState } from 'react'
import { Panel, Progress, Empty } from './ui'
import { BarChart } from '../components/charts'
import { rupiah, bulanKey, bulanLabel } from '../lib/format'
import { KATEGORI_KELUAR, adalahTransfer } from '../lib/store'
import EditDialog from './edit-dialog'

export default function Anggaran({ state, dispatch }) {
  const [ed, setEd] = useState(null)
  const [f, setF] = useState({ category: '', limit: '' })
  const [err, setErr] = useState('')
  const months = [...new Set(state.transactions.filter((t) => !adalahTransfer(t)).map((t) => bulanKey(t.date)))].sort()
  const key = months[months.length - 1] || new Date().toISOString().slice(0, 7)
  const spent = (c) => state.transactions.filter((t) => t.type === 'out' && t.category === c && bulanKey(t.date) === key).reduce((a, t) => a + t.amount, 0)
  const kenal = [...new Set([...KATEGORI_KELUAR, ...state.transactions.filter((t) => t.type === 'out' && !adalahTransfer(t)).map((t) => t.category)])]
  const belum = kenal.filter((c) => !state.budgets.some((b) => b.category === c) && spent(c) > 0)
  const batang = state.budgets.map((b) => ({ label: b.category.split(' ')[0], batas: b.limit, pakai: spent(b.category) }))
  const tambah = (e) => {
    e.preventDefault()
    const c = f.category.trim(), l = Number(f.limit)
    if (!c) return setErr('Nama kategori wajib diisi')
    if (!(l > 0)) return setErr('Batas harus lebih dari 0')
    const ada = state.budgets.some((b) => b.category.toLowerCase() === c.toLowerCase())
    dispatch({ type: 'setBudget', category: ada ? state.budgets.find((b) => b.category.toLowerCase() === c.toLowerCase()).category : c, limit: l })
    setErr(''); setF({ category: '', limit: '' })
  }
  return (
    <>
      {batang.length > 0 && (
        <Panel title="Terpakai vs batas" sub={bulanLabel(key)}>
          <BarChart data={batang} series={[{ key: 'batas', label: 'Batas', color: 'var(--data-2)' }, { key: 'pakai', label: 'Terpakai', color: 'var(--data-3)' }]} />
        </Panel>
      )}
      <Panel title={'Anggaran ' + bulanLabel(key)} sub="Ubah nama, batas, atau hapus anggaran">
        {state.budgets.length === 0 && <Empty>Belum ada anggaran. Tambahkan di bawah.</Empty>}
        {state.budgets.map((b) => {
          const s = spent(b.category)
          return (
            <div key={b.category} className="budget">
              <div className="trow">
                <div><strong>{b.category}</strong><small>Terpakai {rupiah(s)} dari {rupiah(b.limit)}{s > b.limit ? ` · lebih ${rupiah(s - b.limit)}` : ''}</small></div>
                <button className="btn" onClick={() => setEd(b)}>Ubah</button>
              </div>
              <Progress value={s} max={b.limit} warn={s > b.limit * 0.9} />
            </div>
          )
        })}
      </Panel>
      {belum.length > 0 && (
        <Panel title="Belum punya anggaran" sub="Pengeluaran bulan ini tanpa batas">
          {belum.map((c) => (
            <div key={c} className="budget"><div className="trow"><div><strong>{c}</strong><small>Terpakai {rupiah(spent(c))}</small></div><button className="btn" onClick={() => setF({ category: c, limit: '' })}>Beri batas</button></div></div>
          ))}
        </Panel>
      )}
      <Panel title="Tambah anggaran">
        <form className="inline" onSubmit={tambah}>
          <input list="kat-anggaran" placeholder="Kategori (pilih atau ketik baru)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Kategori" maxLength={40} />
          <datalist id="kat-anggaran">{kenal.map((c) => <option key={c} value={c} />)}</datalist>
          <input type="number" inputMode="numeric" placeholder="Batas (Rp)" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} aria-label="Batas" />
          <button className="btn primary">Simpan</button>
        </form>
        {err && <em role="alert">{err}</em>}
      </Panel>
      <EditDialog item={ed} title="Ubah anggaran" onClose={() => setEd(null)}
        fields={[{ k: 'category', label: 'Nama kategori', type: 'text' }, { k: 'limit', label: 'Batas per bulan (Rp)', type: 'number', min: 1 }]}
        onSave={(patch) => dispatch({ type: 'updateBudget', category: ed.category, patch })}
        onDelete={() => dispatch({ type: 'deleteBudget', category: ed.category })} />
    </>
  )
}
