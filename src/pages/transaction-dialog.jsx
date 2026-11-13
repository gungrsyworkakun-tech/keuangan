import { useEffect, useRef, useState } from 'react'
import { KATEGORI_KELUAR, KATEGORI_MASUK } from '../lib/store'
import { hariIni } from '../lib/format'

export default function TransactionDialog({ open, onClose, state, dispatch }) {
  const ref = useRef(null)
  const blank = { type: 'out', desc: '', amount: '', date: hariIni(), category: KATEGORI_KELUAR[0], accountId: state.accounts[0]?.id }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState({})

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) { setF({ ...blank, accountId: state.accounts[0]?.id }); setErr({}); d.showModal() }
    if (!open && d.open) d.close()
  }, [open])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v, ...(k === 'type' ? { category: (v === 'in' ? KATEGORI_MASUK : KATEGORI_KELUAR)[0] } : {}) }))
  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!f.desc.trim()) er.desc = 'Keterangan wajib diisi'
    if (!(Number(f.amount) > 0)) er.amount = 'Nominal harus lebih dari 0'
    if (!f.date) er.date = 'Tanggal wajib diisi'
    setErr(er)
    if (Object.keys(er).length) return
    dispatch({ type: 'addTransaction', payload: { ...f, desc: f.desc.trim(), amount: Number(f.amount) } })
    onClose()
  }
  const cats = f.type === 'in' ? KATEGORI_MASUK : KATEGORI_KELUAR
  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <h2>Catat transaksi</h2>
        <div className="seg" role="radiogroup">
          <button type="button" className={f.type === 'out' ? 'on' : ''} onClick={() => set('type', 'out')}>Pengeluaran</button>
          <button type="button" className={f.type === 'in' ? 'on' : ''} onClick={() => set('type', 'in')}>Pemasukan</button>
        </div>
        <label>Keterangan<input value={f.desc} onChange={(e) => set('desc', e.target.value)} />{err.desc && <em>{err.desc}</em>}</label>
        <label>Nominal (Rp)<input type="number" min="0" value={f.amount} onChange={(e) => set('amount', e.target.value)} />{err.amount && <em>{err.amount}</em>}</label>
        <div className="row2">
          <label>Tanggal<input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />{err.date && <em>{err.date}</em>}</label>
          <label>Kategori<select value={f.category} onChange={(e) => set('category', e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <label>Rekening<select value={f.accountId} onChange={(e) => set('accountId', e.target.value)}>{state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <div className="actions"><button type="button" className="btn" onClick={onClose}>Batal</button><button className="btn primary">Simpan</button></div>
      </form>
    </dialog>
  )
}
