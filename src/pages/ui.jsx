import { rupiah } from '../lib/format'
export const Panel = ({ title, action, children }) => (
  <section className="panel">
    {(title || action) && <div className="panel-head"><h2>{title}</h2>{action}</div>}
    {children}
  </section>
)
export const Amount = ({ value, type }) => (
  <span className={type === 'in' ? 'amt in' : type === 'out' ? 'amt out' : 'amt'}>
    {type === 'in' ? '+' : type === 'out' ? '−' : ''}{rupiah(value)}
  </span>
)
export const Progress = ({ value, max, warn }) => {
  const pct = Math.min(100, max ? (value / max) * 100 : 0)
  return <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} className={warn ? 'warn' : ''} /></div>
}
export const Empty = ({ children }) => <p className="empty">{children}</p>
