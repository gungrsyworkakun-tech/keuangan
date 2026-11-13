import { useEffect, useRef, useState } from 'react'

// Dialog edit serba guna. fields: [{k,label,type:'text'|'number'|'date'|'select',options:[[nilai,label]]}]
export default function EditDialog({ item, title, fields, onSave, onDelete, onClose, locked }) {
  const ref = useRef(null)
  const [f, setF] = useState({})
  const [err, setErr] = useState('')
  const [hapus, setHapus] = useState(false)
  useEffect(() => {
    const d = ref.current
    if (item) { setF({ ...item }); setErr(''); setHapus(false); if (!d.open) d.showModal() }
    else if (d.open) d.close()
  }, [item])
  const submit = (e) => {
    e.preventDefault()
    const patch = {}
    for (const fl of fields) {
      let v = f[fl.k]
      if (fl.type === 'number') {
        if (v === '' || v == null || Number.isNaN(Number(v))) return setErr(fl.label + ' harus berupa angka')
        v = Number(v)
        if (fl.min != null && v < fl.min) return setErr(fl.label + ' tidak boleh kurang dari ' + fl.min)
      } else if (fl.type !== 'date' && !String(v || '').trim()) return setErr(fl.label + ' wajib diisi')
      patch[fl.k] = typeof v === 'string' ? v.trim() : v
    }
    onSave(patch); onClose()
  }
  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head"><h2>{title}</h2><button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>✕</button></div>
        {fields.map((fl) => (
          <label key={fl.k}>{fl.label}
            {fl.type === 'select'
              ? <select value={f[fl.k] ?? ''} onChange={(e) => setF({ ...f, [fl.k]: e.target.value })}>{fl.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <input type={fl.type} inputMode={fl.type === 'number' ? 'numeric' : undefined} value={f[fl.k] ?? ''} onChange={(e) => setF({ ...f, [fl.k]: e.target.value })} />}
          </label>
        ))}
        {err && <em>{err}</em>}
        <div className="actions">
          {onDelete && (hapus
            ? <button type="button" className="btn danger" disabled={locked} onClick={() => { onDelete(); onClose() }}>Ya, hapus</button>
            : <button type="button" className="btn danger-o" onClick={() => setHapus(true)}>Hapus</button>)}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={locked}>{locked ? 'Menyinkronkan…' : 'Simpan'}</button>
        </div>
      </form>
    </dialog>
  )
}
