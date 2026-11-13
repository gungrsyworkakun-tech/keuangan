import { useState } from 'react'
import { Panel, Empty } from './ui'
import { BarChart, Donut } from '../components/charts'
import { rupiah } from '../lib/format'
import { JENIS_INVESTASI } from '../lib/store'
import EditDialog from './edit-dialog'

export default function Investasi({ state, dispatch }) {
  const [f, setF] = useState({ name: '', type: JENIS_INVESTASI[0], invested: '' }), [ed, setEd] = useState(null)
  const tot = state.investments.reduce((a, i) => ({ inv: a.inv + i.invested, val: a.val + i.value }), { inv: 0, val: 0 })
  const gain = tot.val - tot.inv
  const add = (e) => {
    e.preventDefault()
    if (!f.name.trim() || !(Number(f.invested) > 0)) return
    dispatch({ type: 'addInvestment', payload: { name: f.name.trim(), type: f.type, invested: Number(f.invested), value: Number(f.invested) } })
    setF({ ...f, name: '', invested: '' })
  }
  const perJenis = {}
  state.investments.forEach((i) => (perJenis[i.type] = (perJenis[i.type] || 0) + i.value))
  const alok = Object.entries(perJenis).map(([label, value]) => ({ label, value })).filter((x) => x.value > 0)
  const batang = state.investments.map((i) => ({ label: i.name.length > 9 ? i.name.slice(0, 8) + '…' : i.name, modal: i.invested, nilai: i.value }))
  return (
    <>
      <section className="hero">
        <small>Nilai investasi sekarang</small>
        <div className="hero-amt">{rupiah(tot.val)}</div>
        <div className="hero-sub">
          <div><small>Modal</small><b>{rupiah(tot.inv)}</b></div>
          <div><small>Untung / rugi</small><b className={gain >= 0 ? 'pos' : 'neg'}>{gain >= 0 ? '+' : '−'}{rupiah(Math.abs(gain))}{tot.inv ? ` (${((gain / tot.inv) * 100).toFixed(1)}%)` : ''}</b></div>
        </div>
      </section>
      <div className="grid-main">
        <Panel title="Modal vs nilai sekarang" sub="Per aset">
          {batang.length === 0 ? <Empty>Belum ada investasi.</Empty> : <BarChart data={batang} series={[{ key: 'modal', label: 'Modal', color: 'var(--data-2)' }, { key: 'nilai', label: 'Nilai sekarang', color: 'var(--data-1)' }]} />}
        </Panel>
        <Panel title="Alokasi aset" sub="Berdasarkan nilai sekarang">
          {alok.length === 0 ? <Empty>Belum ada investasi.</Empty> : <Donut items={alok} />}
        </Panel>
      </div>
      <Panel title="Portofolio">
        {state.investments.length === 0 ? <Empty>Belum ada investasi.</Empty> : state.investments.map((i) => {
          const g = i.value - i.invested
          return (
            <div key={i.id} className="trow">
              <div><strong>{i.name}</strong><small>{i.type} · modal {rupiah(i.invested)}</small><button className="linkbtn" onClick={() => setEd(i)}>Ubah / hapus</button></div>
              <div className="right">
                <label className="mini">Nilai<input type="number" inputMode="numeric" defaultValue={i.value} onBlur={(e) => Number(e.target.value) >= 0 && Number(e.target.value) !== i.value && dispatch({ type: 'updateInvestmentValue', id: i.id, value: Number(e.target.value) })} /></label>
                <small className={g >= 0 ? 'in' : 'out'}>{g >= 0 ? '+' : '−'}{rupiah(Math.abs(g))}</small>
              </div>
            </div>
          )
        })}
      </Panel>
      <EditDialog item={ed} title="Ubah investasi" onClose={() => setEd(null)}
        fields={[{ k: 'name', label: 'Nama', type: 'text' }, { k: 'type', label: 'Jenis', type: 'select', options: JENIS_INVESTASI.map((j) => [j, j]) }, { k: 'invested', label: 'Modal (Rp)', type: 'number', min: 0 }, { k: 'value', label: 'Nilai sekarang (Rp)', type: 'number', min: 0 }]}
        onSave={(patch) => dispatch({ type: 'updateInvestment', id: ed.id, patch })}
        onDelete={() => dispatch({ type: 'deleteInvestment', id: ed.id })} />
      <Panel title="Tambah investasi">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama (mis. Reksa Dana X)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nama investasi" />
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Jenis">{JENIS_INVESTASI.map((j) => <option key={j}>{j}</option>)}</select>
          <input type="number" inputMode="numeric" placeholder="Modal (Rp)" value={f.invested} onChange={(e) => setF({ ...f, invested: e.target.value })} aria-label="Modal" />
          <button className="btn primary">Tambah</button>
        </form>
        <small className="hint">Ubah kolom “Nilai” untuk memperbarui nilai terkini investasimu.</small>
      </Panel>
    </>
  )
}
