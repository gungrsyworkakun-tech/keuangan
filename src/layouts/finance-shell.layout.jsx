import { useState } from 'react'

export const MENU = [
  { id: 'ringkasan', label: 'Ringkasan', icon: '◧' },
  { id: 'transaksi', label: 'Transaksi', icon: '⇄' },
  { id: 'bank', label: 'Sisa di Bank', icon: '▤' },
  { id: 'investasi', label: 'Investasi', icon: '↗' },
  { id: 'goal', label: 'Goal', icon: '◎' },
  { id: 'anggaran', label: 'Anggaran', icon: '◔' },
]

export default function FinanceShell({ route, title, onAdd, onLogout, onBackup, status, statusError, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="shell">
      <aside className={'sidebar' + (open ? ' is-open' : '')} aria-label="Navigasi utama">
        <div className="brand">Duitku</div>
        <nav>
          <ul>
            {MENU.map((m) => (
              <li key={m.id}>
                <a href={'#/' + m.id} className={route === m.id ? 'is-active' : ''} aria-current={route === m.id ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <span aria-hidden="true" className="nav-icon">{m.icon}</span>{m.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sync" role="status"><small className={statusError ? 'out' : ''}>{status}</small>
          {onBackup && <button className="btn" onClick={onBackup}>Backup ke Drive</button>}
          {onLogout && <button className="btn" onClick={onLogout}>Keluar</button>}
        </div>
        <div className="user"><span className="avatar">RA</span><div><strong>Rani Astuti</strong><small>Akun pribadi</small></div></div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Buka menu" onClick={() => setOpen(true)}>☰</button>
          <h1>{title}</h1>
          <button className="btn primary" onClick={onAdd}>+ Catat transaksi</button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
