import { useEffect, useState } from 'react'
import { dengarProgres } from '../lib/api'
import { rupiah } from '../lib/format'
export const Panel = ({ title, sub, action, children, className = '' }) => (
  <section className={'panel ' + className}>
    {(title || action) && (
      <div className="panel-head">
        <div><h2>{title}</h2>{sub && <small>{sub}</small>}</div>
        {action}
      </div>
    )}
    {children}
  </section>
)
export const Amount = ({ value, type }) => (
  <span className={type === 'in' ? 'amt in' : type === 'out' ? 'amt out' : type === 'tin' || type === 'tout' ? 'amt tf' : 'amt'}>
    {type === 'in' || type === 'tin' ? '+' : type === 'out' || type === 'tout' ? '−' : ''}{rupiah(value)}
  </span>
)
export const Progress = ({ value, max, warn }) => {
  const pct = Math.min(100, max ? (value / max) * 100 : 0)
  return <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} className={warn ? 'warn' : ''} /></div>
}
export const Empty = ({ children }) => <p className="empty">{children}</p>
export const Skeleton = () => (
  <div className="skeleton" aria-busy="true" aria-label="Memuat data">
    <div className="skel s-hero" />
    <div className="skel-row"><div className="skel" /><div className="skel" /><div className="skel" /></div>
    <div className="skel s-chart" />
  </div>
)

// Bilah persen muat. Persen mengikuti tahap permintaan yang sebenarnya (menghubungi, menerima, selesai).
export function useProgres(aksiList, aktif) {
  const [p, setP] = useState({ persen: 15, label: 'Menghubungi server…' })
  const [detik, setDetik] = useState(0)
  useEffect(() => {
    if (!aktif) return
    setP({ persen: 15, label: 'Menghubungi server…' }); setDetik(0)
    const mulai = Date.now()
    const off = dengarProgres((e) => { if (aksiList.includes(e.aksi)) setP((o) => ({ persen: Math.max(e.persen >= 100 ? 100 : o.persen, e.persen), label: e.label })) })
    const tik = setInterval(() => setDetik(Math.round((Date.now() - mulai) / 1000)), 1000)
    return () => { off(); clearInterval(tik) }
  }, [aktif])
  return { ...p, detik }
}
export function Progres({ persen, label, detik }) {
  return (
    <div className="progres" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={persen} aria-label={label}>
      <div className="progres-bar"><i style={{ width: persen + '%' }} /></div>
      <div className="progres-row"><span>{label}</span><strong>{persen}%</strong><small>{detik} dtk</small></div>
      {detik >= 8 && <p className="progres-lambat">Koneksi sedang lambat, mohon tunggu sebentar…</p>}
    </div>
  )
}
