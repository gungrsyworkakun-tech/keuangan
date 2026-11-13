import { useMemo, useState } from 'react'
import { Panel, Amount, Empty } from './ui'
import { tanggal, rupiah } from '../lib/format'
import { KATEGORI_KELUAR, KATEGORI_MASUK } from '../lib/store'
import EditDialog from './edit-dialog'

const HALAMAN = 40

export default function Transaksi({ state, dispatch, onAdd }) {
  const [ed, setEd] = useState(null)
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
          {open === t.id && <div className="detail">Rekening: {acc(t.accountId)} · Kategori: {t.category} <button className="linkbtn" onClick={() => setEd(t)}>Ubah / hapus</button></div>}
        </div>
      ))}
      <EditDialog item={ed} title="Ubah transaksi" onClose={() => setEd(null)}
        fields={[
          { k: 'type', label: 'Jenis', type: 'select', options: [['out', 'Pengeluaran'], ['in', 'Pemasukan']] },
          { k: 'amount', label: 'Nominal (Rp)', type: 'number', min: 1 },
          { k: 'desc', label: 'Keterangan', type: 'text' },
          { k: 'category', label: 'Kategori', type: 'select', options: [...new Set([...KATEGORI_KELUAR, ...KATEGORI_MASUK, ed?.category].filter(Boolean))].map((c) => [c, c]) },
          { k: 'accountId', label: 'Rekening', type: 'select', options: state.accounts.map((a) => [a.id, a.name]) },
          { k: 'date', label: 'Tanggal', type: 'date' },
        ]}
        onSave={(patch) => dispatch({ type: 'updateTransaction', id: ed.id, patch })}
        onDelete={() => dispatch({ type: 'deleteTransaction', id: ed.id })} />
      {list.length > banyak && <button className="btn more" onClick={() => setBanyak(banyak + HALAMAN)}>Tampilkan lebih banyak ({list.length - banyak})</button>}
    </Panel>
  )
}
