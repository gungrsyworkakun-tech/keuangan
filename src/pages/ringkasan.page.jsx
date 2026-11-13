import { useMemo, useState } from 'react'
import { Panel, Amount, Empty } from './ui'
import { rupiah, tanggal, bulanKey, bulanLabel, bulanPendek } from '../lib/format'

export default function Ringkasan({ state, onAdd }) {
  const { transactions, accounts, investments, goals } = state
  const months = useMemo(() => [...new Set(transactions.map((t) => bulanKey(t.date)))].sort().reverse(), [transactions])
  const [period, setPeriod] = useState(months[0])
  const sum = (key, type) => transactions.filter((t) => bulanKey(t.date) === key && t.type === type).reduce((a, t) => a + t.amount, 0)
  const masuk = sum(period, 'in'), keluar = sum(period, 'out')
  const saldo = accounts.reduce((a, x) => a + x.balance, 0)
  const invest = investments.reduce((a, i) => a + i.value, 0)

  const hist = [...months].reverse().slice(-6).map((k) => ({ k, in: sum(k, 'in'), out: sum(k, 'out') }))
  const maxH = Math.max(1, ...hist.flatMap((h) => [h.in, h.out]))
  const cat = {}
  transactions.filter((t) => bulanKey(t.date) === period && t.type === 'out').forEach((t) => (cat[t.category] = (cat[t.category] || 0) + t.amount))
  const catList = Object.entries(cat).sort((a, b) => b[1] - a[1])
  const top = catList.slice(0, 4), rest = catList.slice(4).reduce((a, [, v]) => a + v, 0)
  if (rest) top.push(['Kategori lain', rest])
  const recent = transactions.filter((t) => bulanKey(t.date) === period).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <>
      <div className="page-head">
        <div><small>Total saldo</small><div className="big">{rupiah(saldo)}</div></div>
        {months.length > 0 && <select aria-label="Periode" value={period} onChange={(e) => setPeriod(e.target.value)}>{months.map((m) => <option key={m} value={m}>{bulanLabel(m)}</option>)}</select>}
      </div>
      <div className="grid4">
        <div className="metric"><small>Pemasukan</small><Amount value={masuk} type="in" /></div>
        <div className="metric"><small>Pengeluaran</small><Amount value={keluar} type="out" /></div>
        <div className="metric"><small>Selisih</small><strong>{rupiah(masuk - keluar)}</strong></div>
        <div className="metric"><small>Nilai investasi</small><strong>{rupiah(invest)}</strong></div>
      </div>
      <div className="grid2">
        <Panel title="Arus kas 6 bulan">
          {hist.length === 0 ? <Empty>Belum ada data.</Empty> : (
            <div className="chart" role="img" aria-label="Grafik batang pemasukan dan pengeluaran per bulan">
              {hist.map((h) => (
                <div key={h.k} className="col">
                  <div className="pair"><i style={{ height: (h.in / maxH) * 100 + '%', background: 'var(--data-1)' }} /><i style={{ height: (h.out / maxH) * 100 + '%', background: 'var(--data-3)' }} /></div>
                  <small>{bulanPendek(h.k)}</small>
                </div>
              ))}
            </div>
          )}
          <p className="legend"><span style={{ background: 'var(--data-1)' }} />Pemasukan <span style={{ background: 'var(--data-3)' }} />Pengeluaran</p>
        </Panel>
        <Panel title="Pengeluaran per kategori">
          {top.length === 0 ? <Empty>Belum ada pengeluaran.</Empty> : top.map(([c, v], i) => (
            <div key={c} className="catrow"><span className="dot" style={{ background: `var(--data-${(i % 4) + 1})` }} />{c}<b>{rupiah(v)}</b></div>
          ))}
        </Panel>
      </div>
      <Panel title="Transaksi terbaru" action={<a href="#/transaksi">Lihat semua</a>}>
        {recent.length === 0 ? <Empty>Belum ada transaksi. <button className="link" onClick={onAdd}>Catat sekarang</button></Empty> : recent.map((t) => (
          <div key={t.id} className="trow"><div><strong>{t.desc}</strong><small>{tanggal(t.date)} · {t.category}</small></div><Amount value={t.amount} type={t.type} /></div>
        ))}
      </Panel>
    </>
  )
}
