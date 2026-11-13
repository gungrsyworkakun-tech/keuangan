import { useState } from 'react'
import { Panel, Empty } from './ui'
import { rupiah } from '../lib/format'
import { JENIS_INVESTASI } from '../lib/store'

export default function Investasi({ state, dispatch }) {
  const [f, setF] = useState({ name: '', type: JENIS_INVESTASI[0], invested: '' })
  const tot = state.investments.reduce((a, i) => ({ inv: a.inv + i.invested, val: a.val + i.value }), { inv: 0, val: 0 })
  const gain = tot.val - tot.inv
  const add = (e) => {
    e.preventDefault()
    if (!f.name.trim() || !(Number(f.invested) > 0)) return
    dispatch({ type: 'addInvestment', payload: { name: f.name.trim(), type: f.type, invested: Number(f.invested), value: Number(f.invested) } })
    setF({ ...f, name: '', invested: '' })
  }
  return (
    <>
      <div className="grid4">
        <div className="metric"><small>Modal</small><strong>{rupiah(tot.inv)}</strong></div>
        <div className="metric"><small>Nilai sekarang</small><strong>{rupiah(tot.val)}</strong></div>
        <div className="metric"><small>Untung / rugi</small><strong className={gain >= 0 ? 'in' : 'out'}>{gain >= 0 ? '+' : '−'}{rupiah(Math.abs(gain))}{tot.inv ? ` (${((gain / tot.inv) * 100).toFixed(1)}%)` : ''}</strong></div>
      </div>
      <Panel title="Portofolio">
        {state.investments.length === 0 ? <Empty>Belum ada investasi.</Empty> : state.investments.map((i) => {
          const g = i.value - i.invested
          return (
            <div key={i.id} className="trow">
              <div><strong>{i.name}</strong><small>{i.type} · modal {rupiah(i.invested)}</small></div>
              <div className="right">
                <label className="mini">Nilai<input type="number" defaultValue={i.value} onBlur={(e) => Number(e.target.value) >= 0 && dispatch({ type: 'updateInvestmentValue', id: i.id, value: Number(e.target.value) })} /></label>
                <small className={g >= 0 ? 'in' : 'out'}>{g >= 0 ? '+' : '−'}{rupiah(Math.abs(g))}</small>
              </div>
            </div>
          )
        })}
      </Panel>
      <Panel title="Tambah investasi">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama (mis. Reksa Dana X)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nama investasi" />
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Jenis">{JENIS_INVESTASI.map((j) => <option key={j}>{j}</option>)}</select>
          <input type="number" placeholder="Modal (Rp)" value={f.invested} onChange={(e) => setF({ ...f, invested: e.target.value })} aria-label="Modal" />
          <button className="btn primary">Tambah</button>
        </form>
        <small className="hint">Ubah kolom “Nilai” untuk memperbarui nilai terkini investasimu.</small>
      </Panel>
    </>
  )
}
