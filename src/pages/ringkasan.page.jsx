import { useMemo, useState } from 'react'
import { Panel, Amount, Empty } from './ui'
import { BarChart, Donut, LineChart } from '../components/charts'
import { rupiah, tanggal, bulanKey, bulanLabel, bulanPendek } from '../lib/format'

export default function Ringkasan({ state, onAdd, profil }) {
  const { transactions, accounts, investments } = state
  const months = useMemo(() => [...new Set(transactions.map((t) => bulanKey(t.date)))].sort().reverse(), [transactions])
  const [period, setPeriod] = useState(months[0])
  const aktif = months.includes(period) ? period : months[0]

  const sum = (key, type) => transactions.filter((t) => bulanKey(t.date) === key && t.type === type).reduce((a, t) => a + t.amount, 0)
  const masuk = aktif ? sum(aktif, 'in') : 0, keluar = aktif ? sum(aktif, 'out') : 0
  const saldo = accounts.reduce((a, x) => a + x.balance, 0)
  const invest = investments.reduce((a, i) => a + i.value, 0)

  const hist = months.slice(0, 6).reverse().map((k) => {
    const i = sum(k, 'in'), o = sum(k, 'out')
    return { label: bulanPendek(k), in: i, out: o, net: i - o }
  })

  const cat = {}
  transactions.filter((t) => bulanKey(t.date) === aktif && t.type === 'out').forEach((t) => (cat[t.category] = (cat[t.category] || 0) + t.amount))
  const catList = Object.entries(cat).sort((a, b) => b[1] - a[1])
  const top = catList.slice(0, 4).map(([label, value]) => ({ label, value }))
  const rest = catList.slice(4).reduce((a, [, v]) => a + v, 0)
  if (rest) top.push({ label: 'Kategori lain', value: rest })

  const harta = [{ label: 'Saldo bank', value: saldo }, { label: 'Investasi', value: invest }].filter((x) => x.value > 0)
  const recent = transactions.filter((t) => bulanKey(t.date) === aktif).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const nama = (profil?.nama || '').split(' ')[0]

  return (
    <>
      <section className="hero">
        <div className="hero-top">
          <div>
            <small>{nama ? `Halo, ${nama}` : 'Halo'} · Total saldo bank</small>
            <div className="hero-amt">{rupiah(saldo)}</div>
          </div>
          {months.length > 0 && (
            <select aria-label="Periode" value={aktif} onChange={(e) => setPeriod(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{bulanLabel(m)}</option>)}
            </select>
          )}
        </div>
        <div className="hero-sub">
          <div><small>Investasi</small><b>{rupiah(invest)}</b></div>
          <div><small>Total harta</small><b>{rupiah(saldo + invest)}</b></div>
        </div>
      </section>

      <div className="grid3">
        <div className="metric m-in"><small>Pemasukan</small><Amount value={masuk} type="in" /></div>
        <div className="metric m-out"><small>Pengeluaran</small><Amount value={keluar} type="out" /></div>
        <div className="metric m-net"><small>Selisih</small><strong className={masuk - keluar >= 0 ? 'in' : 'out'}>{rupiah(masuk - keluar)}</strong></div>
      </div>

      <div className="grid-main">
        <Panel title="Arus kas" sub="Pemasukan dan pengeluaran per bulan">
          {hist.length === 0 ? <Empty>Belum ada data. <button className="link" onClick={onAdd}>Catat transaksi pertama</button></Empty> : (
            <BarChart data={hist} series={[{ key: 'in', label: 'Pemasukan', color: 'var(--data-1)' }, { key: 'out', label: 'Pengeluaran', color: 'var(--data-3)' }]} />
          )}
        </Panel>
        <Panel title="Pengeluaran per kategori" sub={aktif ? bulanLabel(aktif) : ''}>
          {top.length === 0 ? <Empty>Belum ada pengeluaran bulan ini.</Empty> : <Donut items={top} tengah={rupiah(keluar).replace('Rp', '').trim()} sub="total" />}
        </Panel>
      </div>

      <div className="grid-main">
        <Panel title="Selisih per bulan" sub="Pemasukan dikurangi pengeluaran">
          {hist.length === 0 ? <Empty>Belum ada data.</Empty> : <LineChart data={hist.map((h) => ({ label: h.label, value: h.net }))} />}
        </Panel>
        <Panel title="Komposisi harta" sub="Bank dan investasi">
          {harta.length === 0 ? <Empty>Belum ada saldo atau investasi.</Empty> : <Donut items={harta} />}
        </Panel>
      </div>

      <Panel title="Transaksi terbaru" action={<a href="#/transaksi">Lihat semua</a>}>
        {recent.length === 0 ? <Empty>Belum ada transaksi.</Empty> : recent.map((t) => (
          <div key={t.id} className="trow"><div><strong>{t.desc}</strong><small>{tanggal(t.date)} · {t.category}</small></div><Amount value={t.amount} type={t.type} /></div>
        ))}
      </Panel>
    </>
  )
}
