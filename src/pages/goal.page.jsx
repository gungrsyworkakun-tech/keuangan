import { useState } from 'react'
import { Panel, Empty } from './ui'
import { Ring } from '../components/charts'
import { rupiah, tanggal } from '../lib/format'
import EditDialog from './edit-dialog'

export default function Goal({ state, dispatch }) {
  const [f, setF] = useState({ name: '', target: '', deadline: '' })
  const [fund, setFund] = useState({}), [ed, setEd] = useState(null)
  const add = (e) => {
    e.preventDefault()
    if (!f.name.trim() || !(Number(f.target) > 0)) return
    dispatch({ type: 'addGoal', payload: { name: f.name.trim(), target: Number(f.target), deadline: f.deadline } })
    setF({ name: '', target: '', deadline: '' })
  }
  const totalT = state.goals.reduce((a, g) => a + g.target, 0), totalS = state.goals.reduce((a, g) => a + g.saved, 0)
  return (
    <>
      <section className="hero">
        <small>Total tabungan goal</small>
        <div className="hero-amt">{rupiah(totalS)}</div>
        <div className="hero-sub"><div><small>Total target</small><b>{rupiah(totalT)}</b></div><div><small>Jumlah goal</small><b>{state.goals.length}</b></div></div>
      </section>
      <div className="cards">
        {state.goals.length === 0 && <Empty>Belum ada goal.</Empty>}
        {state.goals.map((g) => {
          const sisa = Math.max(0, g.target - g.saved)
          return (
            <Panel key={g.id}>
              <div className="goalhead">
                <Ring value={g.saved} max={g.target} />
                <div><strong>{g.name}</strong><small>{g.deadline ? `Target ${tanggal(g.deadline)}` : 'Tanpa tenggat'}</small><button className="linkbtn" onClick={() => setEd(g)}>Ubah / hapus</button></div>
              </div>
              <p className="goalnum"><b>{rupiah(g.saved)}</b> dari {rupiah(g.target)}<small>{sisa ? `Kurang ${rupiah(sisa)}` : 'Target tercapai 🎉'}</small></p>
              <form className="inline" onSubmit={(e) => { e.preventDefault(); const n = Number(fund[g.id]); if (n > 0) { dispatch({ type: 'fundGoal', id: g.id, amount: n }); setFund({ ...fund, [g.id]: '' }) } }}>
                <input type="number" inputMode="numeric" placeholder="Tambah tabungan" value={fund[g.id] || ''} onChange={(e) => setFund({ ...fund, [g.id]: e.target.value })} aria-label={'Tambah dana ' + g.name} />
                <button className="btn">Setor</button>
              </form>
            </Panel>
          )
        })}
      </div>
      <EditDialog item={ed} title="Ubah goal" onClose={() => setEd(null)}
        fields={[{ k: 'name', label: 'Nama goal', type: 'text' }, { k: 'target', label: 'Target (Rp)', type: 'number', min: 1 }, { k: 'saved', label: 'Sudah terkumpul (Rp)', type: 'number', min: 0 }, { k: 'deadline', label: 'Tenggat', type: 'date' }]}
        onSave={(patch) => dispatch({ type: 'updateGoal', id: ed.id, patch })}
        onDelete={() => dispatch({ type: 'deleteGoal', id: ed.id })} />
      <Panel title="Buat goal baru">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama goal" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nama goal" />
          <input type="number" inputMode="numeric" placeholder="Target (Rp)" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} aria-label="Target" />
          <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} aria-label="Tenggat" />
          <button className="btn primary">Buat</button>
        </form>
      </Panel>
    </>
  )
}
