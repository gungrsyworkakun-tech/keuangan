import { Panel, Progress } from './ui'
import { BarChart } from '../components/charts'
import { rupiah, bulanKey, bulanLabel } from '../lib/format'
import { KATEGORI_KELUAR, adalahTransfer } from '../lib/store'

export default function Anggaran({ state, dispatch }) {
  const months = [...new Set(state.transactions.filter((t) => !adalahTransfer(t)).map((t) => bulanKey(t.date)))].sort()
  const key = months[months.length - 1] || new Date().toISOString().slice(0, 7)
  const spent = (c) => state.transactions.filter((t) => t.type === 'out' && t.category === c && bulanKey(t.date) === key).reduce((a, t) => a + t.amount, 0)
  const lim = (c) => state.budgets.find((b) => b.category === c)?.limit || ''
  const batang = KATEGORI_KELUAR.filter((c) => lim(c)).map((c) => ({ label: c.split(' ')[0], batas: lim(c), pakai: spent(c) }))
  return (
    <>
      {batang.length > 0 && (
        <Panel title="Terpakai vs batas" sub={bulanLabel(key)}>
          <BarChart data={batang} series={[{ key: 'batas', label: 'Batas', color: 'var(--data-2)' }, { key: 'pakai', label: 'Terpakai', color: 'var(--data-3)' }]} />
        </Panel>
      )}
      <Panel title={'Anggaran ' + bulanLabel(key)} sub="Isi batas per kategori, kosongkan untuk menghapus">
        {KATEGORI_KELUAR.map((c) => {
          const s = spent(c), l = lim(c)
          return (
            <div key={c} className="budget">
              <div className="trow"><div><strong>{c}</strong><small>Terpakai {rupiah(s)}{l ? ` dari ${rupiah(l)}` : ''}</small></div>
                <label className="mini">Batas<input type="number" inputMode="numeric" defaultValue={l} placeholder="0" onBlur={(e) => Number(e.target.value) !== Number(l || 0) && dispatch({ type: 'setBudget', category: c, limit: Number(e.target.value) })} /></label></div>
              {l ? <Progress value={s} max={l} warn={s > l * 0.9} /> : null}
            </div>
          )
        })}
      </Panel>
    </>
  )
}
