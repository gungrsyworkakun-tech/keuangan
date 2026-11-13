import { useState } from 'react'
import { Panel, Empty } from './ui'
import { Donut } from '../components/charts'
import { rupiah } from '../lib/format'
import EditDialog from './edit-dialog'

export default function SisaBank({ state, dispatch }) {
  const [name, setName] = useState(''), [bal, setBal] = useState(''), [ed, setEd] = useState(null)
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
            <button key={a.id} className="trow btnrow" onClick={() => setEd(a)} aria-label={'Ubah ' + a.name}><div><strong>{a.name}</strong><small>{total ? Math.round((a.balance / total) * 100) : 0}% dari total · ketuk untuk ubah</small></div><b className="num">{rupiah(a.balance)}</b></button>
          ))}
        </Panel>
        <Panel title="Sebaran saldo">
          {items.length === 0 ? <Empty>Belum ada saldo.</Empty> : <Donut items={items} />}
        </Panel>
      </div>
      <EditDialog item={ed} title="Ubah rekening" onClose={() => setEd(null)}
        fields={[{ k: 'name', label: 'Nama rekening', type: 'text' }, { k: 'balance', label: 'Saldo sekarang (Rp)', type: 'number' }]}
        onSave={(patch) => dispatch({ type: 'updateAccount', id: ed.id, patch })}
        onDelete={() => dispatch({ type: 'deleteAccount', id: ed.id })} />
      <Panel title="Tambah rekening">
        <form className="inline" onSubmit={add}>
          <input placeholder="Nama bank / dompet" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama rekening" />
          <input type="number" inputMode="numeric" placeholder="Saldo awal" value={bal} onChange={(e) => setBal(e.target.value)} aria-label="Saldo awal" />
          <button className="btn primary">Tambah</button>
        </form>
        <small className="hint">Saldo berubah otomatis saat mencatat transaksi. Ketuk rekening untuk mengoreksi saldo atau menghapusnya.</small>
      </Panel>
    </>
  )
}
