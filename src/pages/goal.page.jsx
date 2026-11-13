import { useState } from 'react'
import { Panel, Progress, Empty } from './ui'
import { rupiah, tanggal } from '../lib/format'

export default function Goal({ state, dispatch }) {
  const [f, setF] = useState({ name: '', target: '', deadline: '' })
  const [fund, setFund] = useState({})
  const add = (e) => {
    e.preventDefault()
    if (!f.name.trim() || !(Number(f.target) > 0)) return
    dispatch({ type: 'addGoal', payload: { name: f.name.trim(), target: Number(f.target), deadline: f.deadline } })
    setF({ name: '', target: '', deadline: '' })
  }
  return (
    <>
      <div className="cards">
        {state.goals.length === 0 && <Empty>Belum ada goal.</Empty>}
        {state.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100))
          return (
            <Panel key={g.id} title={g.name}>
              <Progress value={g.saved} max={g.target} />
              <p className="goalnum"><b>{rupiah(g.saved)}</b> dari {rupiah(g.target)} · {pct}%</p>
              {g.deadline && <small>Target: {tanggal(g.deadline)}</small>}
              <form className="inline" onSubmit={(e) => { e.preventDefault(); const n = Number(fund[g.id]); if (n > 0) { dispatch({ type: 'fundGoal', id: g.id, amount: n }); setFund({ ...fund, [g.id]: '' }) } }}>
                <input type="number" placeholder="Tambah tabungan" value={fund[g.id] || ''} onChange={(e) => setFund({ ...fund, [g.id]: e.target.value })} aria-label={'Tambah dana ' + g.name} />
                <button className="btn">Setor</button>
              </form>
            </Panel>
          )
        })}
      </div>
      <Panel title="Buat goal baru">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama goal" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nama goal" />
          <input type="number" placeholder="Target (Rp)" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} aria-label="Target" />
          <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} aria-label="Tenggat" />
          <button className="btn primary">Buat</button>
        </form>
      </Panel>
    </>
  )
}
