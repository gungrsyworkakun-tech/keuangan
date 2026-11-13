import { useMemo, useState } from 'react'
import { Panel, Amount, Empty } from './ui'
import { tanggal, rupiah } from '../lib/format'

const HALAMAN = 40

export default function Transaksi({ state, onAdd }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [banyak, setBanyak] = useState(HALAMAN)
  const acc = (id) => state.accounts.find((a) => a.id === id)?.name || '-'
  const list = useMemo(() => state.transactions
    .filter((t) => (filter === 'all' || t.type === filter) && t.desc.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [state.transactions, filter, q])
  const jml = list.reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0)
  return (
    <Panel title="Semua transaksi" sub={`${list.length} transaksi · selisih ${rupiah(jml)}`} action={<button className="btn primary sm-hide" onClick={onAdd}>+ Tambah</button>}>
      <div className="toolbar">
        <div className="seg">{[['all', 'Semua'], ['in', 'Masuk'], ['out', 'Keluar']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => { setFilter(k); setBanyak(HALAMAN) }}>{l}</button>)}</div>
        <input placeholder="Cari keterangan…" value={q} onChange={(e) => { setQ(e.target.value); setBanyak(HALAMAN) }} aria-label="Cari transaksi" />
      </div>
      {list.length === 0 ? <Empty>Tidak ada transaksi yang cocok.</Empty> : list.slice(0, banyak).map((t) => (
        <div key={t.id}>
          <button className="trow btnrow" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
            <div><strong>{t.desc}</strong><small>{tanggal(t.date)} · {t.category}</small></div><Amount value={t.amount} type={t.type} />
          </button>
          {open === t.id && <div className="detail">Rekening: {acc(t.accountId)} · Kategori: {t.category}</div>}
        </div>
      ))}
      {list.length > banyak && <button className="btn more" onClick={() => setBanyak(banyak + HALAMAN)}>Tampilkan lebih banyak ({list.length - banyak})</button>}
    </Panel>
  )
}
