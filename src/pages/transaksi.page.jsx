import { useState } from 'react'
import { Panel, Amount, Empty } from './ui'
import { tanggal } from '../lib/format'

export default function Transaksi({ state, onAdd }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const acc = (id) => state.accounts.find((a) => a.id === id)?.name || '-'
  const list = state.transactions
    .filter((t) => (filter === 'all' || t.type === filter) && t.desc.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Panel title="Semua transaksi" action={<button className="btn primary" onClick={onAdd}>+ Tambah</button>}>
      <div className="toolbar">
        <div className="seg">{[['all', 'Semua'], ['in', 'Pemasukan'], ['out', 'Pengeluaran']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div>
        <input placeholder="Cari keterangan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari transaksi" />
      </div>
      {list.length === 0 ? <Empty>Tidak ada transaksi yang cocok.</Empty> : list.map((t) => (
        <div key={t.id}>
          <button className="trow btnrow" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
            <div><strong>{t.desc}</strong><small>{tanggal(t.date)} · {t.category}</small></div><Amount value={t.amount} type={t.type} />
          </button>
          {open === t.id && <div className="detail">Rekening: {acc(t.accountId)} · Kategori: {t.category}</div>}
        </div>
      ))}
    </Panel>
  )
}
