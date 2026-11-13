import { useState } from 'react'
import { Panel, Empty } from './ui'
import { Donut } from '../components/charts'
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
  const items = state.accounts.filter((a) => a.balance > 0).map((a) => ({ label: a.name, value: a.balance }))
  return (
    <>
      <section className="hero">
        <small>Total sisa saldo semua rekening</small>
        <div className="hero-amt">{rupiah(total)}</div>
        <div className="hero-sub"><div><small>Jumlah rekening</small><b>{state.accounts.length}</b></div></div>
      </section>
      <div className="grid-main">
        <Panel title="Rekening & dompet">
          {state.accounts.length === 0 ? <Empty>Belum ada rekening.</Empty> : state.accounts.map((a) => (
            <div key={a.id} className="trow"><div><strong>{a.name}</strong><small>{total ? Math.round((a.balance / total) * 100) : 0}% dari total</small></div><b className="num">{rupiah(a.balance)}</b></div>
          ))}
        </Panel>
        <Panel title="Sebaran saldo">
          {items.length === 0 ? <Empty>Belum ada saldo.</Empty> : <Donut items={items} />}
        </Panel>
      </div>
      <Panel title="Tambah rekening">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama bank / dompet" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama rekening" />
          <input type="number" inputMode="numeric" placeholder="Saldo awal" value={bal} onChange={(e) => setBal(e.target.value)} aria-label="Saldo awal" />
          <button className="btn primary">Tambah</button>
        </form>
        <small className="hint">Saldo otomatis berubah setiap kamu mencatat transaksi di rekening ini.</small>
      </Panel>
    </>
  )
}
