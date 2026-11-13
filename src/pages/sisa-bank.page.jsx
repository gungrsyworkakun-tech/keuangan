import { useState } from 'react'
import { Panel, Empty } from './ui'
import { Donut } from '../components/charts'
import { rupiah } from '../lib/format'
import { JENIS_REKENING, jenisRek } from '../lib/store'
import EditDialog from './edit-dialog'
import TransferDialog from './transfer-dialog'

const NAMA_JENIS = Object.fromEntries(JENIS_REKENING)

export default function SisaBank({ state, dispatch }) {
  const [name, setName] = useState(''), [bal, setBal] = useState(''), [jenis, setJenis] = useState('bank'), [ed, setEd] = useState(null)
  const [tf, setTf] = useState(null), [info, setInfo] = useState('')
  const total = state.accounts.reduce((a, x) => a + x.balance, 0)
  const tunai = state.accounts.filter((a) => jenisRek(a) === 'tunai').reduce((a, x) => a + x.balance, 0)
  const add = (e) => {
    e.preventDefault()
    if (!name.trim() || bal === '') return
    dispatch({ type: 'addAccount', payload: { name: name.trim(), balance: Number(bal), jenis } })
    setName(''); setBal('')
  }
  const pilihJenis = (j) => { setJenis(j); if (j === 'tunai' && !name.trim()) setName('Uang Tunai') }
  const bukaTf = (m) => setTf(m)
  const toast = (t) => { setInfo(t); setTimeout(() => setInfo(''), 3500) }
  const items = state.accounts.filter((a) => a.balance > 0).map((a) => ({ label: a.name, value: a.balance }))
  return (
    <>
      <section className="hero">
        <small>Total sisa saldo semua rekening</small>
        <div className="hero-amt">{rupiah(total)}</div>
        <div className="hero-sub">
          <div><small>Bank & e-wallet</small><b>{rupiah(total - tunai)}</b></div>
          <div><small>Uang tunai</small><b>{rupiah(tunai)}</b></div>
        </div>
      </section>
      <div className="quick">
        <button className="btn" onClick={() => bukaTf('tarik')}>Tarik tunai</button>
        <button className="btn" onClick={() => bukaTf('setor')}>Setor tunai</button>
        <button className="btn" onClick={() => bukaTf('pindah')}>Pindah saldo</button>
      </div>
      <div className="grid-main">
        <Panel title="Rekening & dompet" sub="Ketuk rekening untuk mengubah saldo">
          {state.accounts.length === 0 ? <Empty>Belum ada rekening.</Empty> : state.accounts.map((a) => (
            <button key={a.id} className="trow btnrow" onClick={() => setEd({ ...a, jenis: jenisRek(a) })} aria-label={'Ubah ' + a.name}><div><strong>{a.name}<span className="tag">{NAMA_JENIS[jenisRek(a)]}</span></strong><small>{total ? Math.round((a.balance / total) * 100) : 0}% dari total</small></div><b className="num">{rupiah(a.balance)}</b></button>
          ))}
        </Panel>
        <Panel title="Sebaran saldo">
          {items.length === 0 ? <Empty>Belum ada saldo.</Empty> : <Donut items={items} />}
        </Panel>
      </div>
      <EditDialog item={ed} title="Ubah rekening" onClose={() => setEd(null)}
        fields={[{ k: 'name', label: 'Nama rekening', type: 'text' }, { k: 'jenis', label: 'Jenis', type: 'select', options: JENIS_REKENING }, { k: 'balance', label: 'Saldo sekarang (Rp)', type: 'number' }]}
        onSave={(patch) => dispatch({ type: 'updateAccount', id: ed.id, patch })}
        onDelete={() => dispatch({ type: 'deleteAccount', id: ed.id })} />
      <TransferDialog open={Boolean(tf)} awal={tf || 'tarik'} onClose={() => setTf(null)} state={state} dispatch={dispatch} onSaved={toast} />
      <Panel title="Tambah rekening">
        <form className="stack" onSubmit={add}>
          <div className="inline">
            <select value={jenis} onChange={(e) => pilihJenis(e.target.value)} aria-label="Jenis rekening">{JENIS_REKENING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input placeholder={jenis === 'tunai' ? 'Mis. Uang Tunai / Dompet' : 'Nama bank / dompet'} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama rekening" />
          </div>
          <div className="inline">
            <input type="number" inputMode="numeric" placeholder="Saldo awal" value={bal} onChange={(e) => setBal(e.target.value)} aria-label="Saldo awal" />
            <button className="btn primary">Tambah</button>
          </div>
        </form>
        <small className="hint">Saldo berubah otomatis saat mencatat transaksi. Pilih “Uang tunai” untuk mencatat cash di dompet. Tarik/setor tunai memindahkan saldo tanpa dihitung sebagai pengeluaran.</small>
      </Panel>
      {info && <div className="toast" role="status">{info}</div>}
    </>
  )
}
