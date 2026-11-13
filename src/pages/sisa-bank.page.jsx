import { useState } from 'react'
import { Panel, Empty } from './ui'
import { rupiah } from '../lib/format'

export default function SisaBank({ state, dispatch }) {
  const [name, setName] = useState(''), [bal, setBal] = useState('')
  const total = state.accounts.reduce((a, x) => a + x.balance, 0)
  const add = (e) => {
    e.preventDefault()
    if (!name.trim() || bal === '') return
    dispatch({ type: 'addAccount', payload: { name: name.trim(), balance: Number(bal) } })
    setName(''); setBal('')
  }
  return (
    <>
      <div className="metric wide"><small>Total sisa saldo semua rekening</small><div className="big">{rupiah(total)}</div></div>
      <Panel title="Rekening & dompet">
        {state.accounts.length === 0 ? <Empty>Belum ada rekening.</Empty> : state.accounts.map((a) => (
          <div key={a.id} className="trow"><div><strong>{a.name}</strong><small>{total ? Math.round((a.balance / total) * 100) : 0}% dari total</small></div><b>{rupiah(a.balance)}</b></div>
        ))}
      </Panel>
      <Panel title="Tambah rekening">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama bank / dompet" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama rekening" />
          <input type="number" placeholder="Saldo awal" value={bal} onChange={(e) => setBal(e.target.value)} aria-label="Saldo awal" />
          <button className="btn primary">Tambah</button>
        </form>
        <small className="hint">Saldo otomatis berubah setiap kamu mencatat transaksi di rekening ini.</small>
      </Panel>
    </>
  )
}
