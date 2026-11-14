import { useEffect, useMemo, useRef, useState } from 'react'
import { daftarKategori } from '../lib/store'
import { hariIni, rupiah } from '../lib/format'

const KUNCI_REK = 'duitku-rekening-terakhir'
const ingatRek = () => { try { return localStorage.getItem(KUNCI_REK) || '' } catch { return '' } }

export default function TransactionDialog({ open, onClose, state, dispatch, locked, awalTipe = 'out', onSaved }) {
  const ref = useRef(null), nominalRef = useRef(null)
  const rekAwal = () => {
    const id = ingatRek()
    return state.accounts.some((a) => a.id === id) ? id : state.accounts[0]?.id || ''
  }
  const kosong = (tipe) => ({ type: tipe, desc: '', amount: '', date: hariIni(), category: daftarKategori(state, tipe)[0], accountId: rekAwal() })
  const [f, setF] = useState(kosong(awalTipe))
  const [err, setErr] = useState({})
  const [baru, setBaru] = useState(false) // sedang mengetik kategori baru

  // transaksi yang sering dicatat -> satu ketukan mengisi keterangan + kategori
  const sering = useMemo(() => {
    const lihat = new Set(), hasil = []
    for (const t of state.transactions) {
      if (t.type !== f.type) continue
      const k = t.desc.toLowerCase()
      if (lihat.has(k)) continue
      lihat.add(k); hasil.push(t)
      if (hasil.length === 5) break
    }
    return hasil
  }, [state.transactions, f.type])

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) {
      setF(kosong(awalTipe)); setErr({}); d.showModal()
      setTimeout(() => nominalRef.current?.focus(), 60)
    }
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => { if (open) setBaru(false) }, [open])
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const ganti = (tipe) => { setBaru(false); setF((p) => ({ ...p, type: tipe, category: daftarKategori(state, tipe)[0] })) }
  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!(Number(f.amount) > 0)) er.amount = 'Nominal harus lebih dari 0'
    if (!f.desc.trim()) er.desc = 'Keterangan wajib diisi'
    if (!f.date) er.date = 'Tanggal wajib diisi'
    if (baru && !f.category.trim()) er.cat = 'Tulis nama kategori baru'
    if (!f.accountId) er.account = 'Tambah rekening dulu di menu Sisa di Bank'
    setErr(er)
    if (Object.keys(er).length) return
    dispatch({ type: 'addTransaction', payload: { ...f, category: f.category.trim() || 'Lainnya', desc: f.desc.trim(), amount: Number(f.amount) } })
    try { localStorage.setItem(KUNCI_REK, f.accountId) } catch {}
    onSaved?.(`${f.type === 'in' ? 'Pemasukan' : 'Pengeluaran'} ${rupiah(Number(f.amount))} tersimpan`)
    setBaru(false)
    onClose()
  }
  const cats = daftarKategori(state, f.type)
  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head"><h2>Catat transaksi</h2><button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <div className="seg seg-full" role="radiogroup" aria-label="Jenis transaksi">
          <button type="button" className={f.type === 'out' ? 'on out-on' : ''} onClick={() => ganti('out')}>Pengeluaran</button>
          <button type="button" className={f.type === 'in' ? 'on in-on' : ''} onClick={() => ganti('in')}>Pemasukan</button>
        </div>
        <label>Nominal (Rp)
          <input ref={nominalRef} className="nominal" type="number" inputMode="numeric" min="0" placeholder="0" value={f.amount} onChange={(e) => set('amount', e.target.value)} />
          {err.amount && <em>{err.amount}</em>}
        </label>
        {sering.length > 0 && (
          <div className="chips" aria-label="Isi cepat">
            {sering.map((t) => (
              <button type="button" key={t.id} className="chip" onClick={() => setF((p) => ({ ...p, desc: t.desc, category: t.category }))}>{t.desc}</button>
            ))}
          </div>
        )}
        <label>Keterangan<input value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Mis. makan siang" />{err.desc && <em>{err.desc}</em>}</label>
        <div className="chips wrap" role="radiogroup" aria-label="Kategori">
          {cats.map((c) => <button type="button" key={c} role="radio" aria-checked={!baru && f.category === c} className={'chip' + (!baru && f.category === c ? ' on' : '')} onClick={() => { setBaru(false); set('category', c) }}>{c}</button>)}
          {f.type === 'in' && <button type="button" role="radio" aria-checked={baru} className={'chip' + (baru ? ' on' : '')} onClick={() => { setBaru(true); set('category', '') }}>+ Kategori baru</button>}
        </div>
        {f.type === 'out' && <small className="hint">Kategori diambil dari menu Anggaran. <a href="#/anggaran" onClick={onClose}>Tambah / ubah kategori</a></small>}
        {baru && <label>Nama kategori baru<input value={f.category} maxLength={30} autoFocus placeholder={f.type === 'in' ? 'Mis. Freelance' : 'Mis. Pulsa & data'} onChange={(e) => set('category', e.target.value)} />{err.cat && <em>{err.cat}</em>}</label>}
        <div className="row2">
          <label>Rekening<select value={f.accountId} onChange={(e) => set('accountId', e.target.value)}>{state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>{err.account && <em>{err.account}</em>}</label>
          <label>Tanggal<input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />{err.date && <em>{err.date}</em>}</label>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={locked}>{locked ? 'Menyinkronkan…' : 'Simpan'}</button>
        </div>
      </form>
    </dialog>
  )
}
