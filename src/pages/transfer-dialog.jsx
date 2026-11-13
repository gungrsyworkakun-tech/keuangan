import { useEffect, useRef, useState } from 'react'
import { jenisRek } from '../lib/store'
import { hariIni, rupiah } from '../lib/format'

const MODE = [['tarik', 'Tarik tunai'], ['setor', 'Setor tunai'], ['pindah', 'Pindah saldo']]
const LABEL = { tarik: 'Tarik tunai', setor: 'Setor tunai', pindah: 'Pindah saldo' }

export default function TransferDialog({ open, onClose, state, dispatch, locked, awal = 'tarik', onSaved }) {
  const ref = useRef(null), nominalRef = useRef(null)
  const [mode, setMode] = useState(awal)
  const [f, setF] = useState({ from: '', to: '', amount: '', date: hariIni() })
  const [err, setErr] = useState('')
  const tunai = state.accounts.filter((a) => jenisRek(a) === 'tunai')
  const bukanTunai = state.accounts.filter((a) => jenisRek(a) !== 'tunai')

  // isi otomatis rekening asal/tujuan sesuai jenis
  const isi = (m, aksi = state.accounts) => {
    const t = aksi.filter((a) => jenisRek(a) === 'tunai'), b = aksi.filter((a) => jenisRek(a) !== 'tunai')
    const terbesar = (l) => [...l].sort((x, y) => y.balance - x.balance)[0]?.id || ''
    if (m === 'tarik') return { from: terbesar(b), to: t[0]?.id || '' }
    if (m === 'setor') return { from: t[0]?.id || '', to: terbesar(b) }
    return { from: aksi[0]?.id || '', to: aksi[1]?.id || '' }
  }
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) { setMode(awal); setF({ ...isi(awal), amount: '', date: hariIni() }); setErr(''); d.showModal(); setTimeout(() => nominalRef.current?.focus(), 60) }
    if (!open && d.open) d.close()
  }, [open])
  // dompet tunai baru dibuat -> isi ulang pilihan
  useEffect(() => { if (open) setF((p) => ({ ...p, ...(p.from && p.to ? {} : isi(mode)) })) }, [state.accounts.length])

  const ganti = (m) => { setMode(m); setErr(''); setF((p) => ({ ...p, ...isi(m) })) }
  const dari = state.accounts.find((a) => a.id === f.from)
  const butuhTunai = mode !== 'pindah' && tunai.length === 0
  const submit = (e) => {
    e.preventDefault()
    if (butuhTunai) return setErr('Buat dulu dompet Tunai')
    if (!f.from || !f.to) return setErr('Pilih rekening asal dan tujuan')
    if (f.from === f.to) return setErr('Rekening asal dan tujuan tidak boleh sama')
    if (!(Number(f.amount) > 0)) return setErr('Nominal harus lebih dari 0')
    dispatch({ type: 'transfer', payload: { from: f.from, to: f.to, amount: Number(f.amount), date: f.date, label: LABEL[mode] } })
    onSaved?.(`${LABEL[mode]} ${rupiah(Number(f.amount))} tersimpan`)
    onClose()
  }
  const buatTunai = () => dispatch({ type: 'addAccount', payload: { name: 'Uang Tunai', balance: 0, jenis: 'tunai' } })
  const opsi = (l) => l.map((a) => <option key={a.id} value={a.id}>{a.name} · {rupiah(a.balance)}</option>)
  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head"><h2>Pindah saldo</h2><button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <div className="seg seg-full seg-3" role="radiogroup" aria-label="Jenis perpindahan">
          {MODE.map(([k, l]) => <button type="button" key={k} className={mode === k ? 'on' : ''} onClick={() => ganti(k)}>{l}</button>)}
        </div>
        {butuhTunai ? (
          <div className="panel-soft">
            <p>Kamu belum punya dompet <b>Tunai</b>. Buat dulu supaya uang cash bisa dicatat.</p>
            <button type="button" className="btn primary" disabled={locked} onClick={buatTunai}>Buat dompet “Uang Tunai”</button>
          </div>
        ) : (<>
          <label>Dari<select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>{opsi(mode === 'setor' ? tunai : mode === 'tarik' ? bukanTunai : state.accounts)}</select></label>
          <label>Ke<select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{opsi(mode === 'setor' ? bukanTunai : mode === 'tarik' ? tunai : state.accounts)}</select></label>
          <label>Nominal (Rp)<input ref={nominalRef} className="nominal" type="number" inputMode="numeric" min="0" placeholder="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
          {dari && Number(f.amount) > dari.balance && <small className="warn-txt">Nominal lebih besar dari saldo {dari.name} ({rupiah(dari.balance)}). Saldo akan minus.</small>}
          <label>Tanggal<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        </>)}
        {err && <em>{err}</em>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={locked || butuhTunai}>{locked ? 'Menyinkronkan…' : 'Simpan'}</button>
        </div>
      </form>
    </dialog>
  )
}
