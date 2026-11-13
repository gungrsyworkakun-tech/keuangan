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
