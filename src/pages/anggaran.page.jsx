import { Panel, Progress } from './ui'
import { rupiah, bulanKey, bulanLabel } from '../lib/format'
import { KATEGORI_KELUAR } from '../lib/store'

export default function Anggaran({ state, dispatch }) {
  const months = [...new Set(state.transactions.map((t) => bulanKey(t.date)))].sort()
  const key = months[months.length - 1] || new Date().toISOString().slice(0, 7)
  const spent = (c) => state.transactions.filter((t) => t.type === 'out' && t.category === c && bulanKey(t.date) === key).reduce((a, t) => a + t.amount, 0)
  const lim = (c) => state.budgets.find((b) => b.category === c)?.limit || ''
  return (
    <Panel title={'Anggaran ' + bulanLabel(key)}>
      {KATEGORI_KELUAR.map((c) => {
        const s = spent(c), l = lim(c)
        return (
          <div key={c} className="budget">
            <div className="trow"><div><strong>{c}</strong><small>Terpakai {rupiah(s)}{l ? ` dari ${rupiah(l)}` : ''}</small></div>
              <label className="mini">Batas<input type="number" defaultValue={l} placeholder="0" onBlur={(e) => dispatch({ type: 'setBudget', category: c, limit: Number(e.target.value) })} /></label></div>
            {l ? <Progress value={s} max={l} warn={s > l * 0.9} /> : null}
          </div>
        )
      })}
    </Panel>
  )
}
