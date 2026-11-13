import { useEffect, useState } from 'react'
import { I } from '../components/icons'
import { inisial } from '../lib/format'

export const MENU = [
  { id: 'ringkasan', label: 'Ringkasan', short: 'Ringkasan', icon: 'home' },
  { id: 'transaksi', label: 'Transaksi', short: 'Transaksi', icon: 'swap' },
  { id: 'bank', label: 'Sisa di Bank', short: 'Bank', icon: 'bank' },
  { id: 'investasi', label: 'Investasi', short: 'Investasi', icon: 'trend' },
  { id: 'goal', label: 'Goal', short: 'Goal', icon: 'target' },
  { id: 'anggaran', label: 'Anggaran', short: 'Anggaran', icon: 'pie' },
  { id: 'profil', label: 'Profil', short: 'Profil', icon: 'user' },
]
const BAWAH = MENU.slice(0, 5)

export default function FinanceShell({ route, title, nama, username, onAdd, locked, saveStatus, statusText, onRetry, onLogout, onBackup, info, children }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  const tampil = nama || username || 'Pengguna'
  return (
    <div className="shell">
      <aside className={'sidebar' + (open ? ' is-open' : '')} aria-label="Navigasi utama">
        <div className="brand-row">
          <div className="brand"><span className="logo">D</span>Duitku</div>
          <button className="icon-btn only-mobile" aria-label="Tutup menu" onClick={() => setOpen(false)}><I n="close" /></button>
        </div>
        <nav>
          <ul>
            {MENU.map((m) => (
              <li key={m.id}>
                <a href={'#/' + m.id} className={route === m.id ? 'is-active' : ''} aria-current={route === m.id ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <I n={m.icon} />{m.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="side-foot">
          <div className={'sync ' + saveStatus} role="status"><span className="dotst" />{info || statusText}{saveStatus === 'error' && onRetry && <button className="link" onClick={onRetry}>Coba lagi</button>}</div>
          {onBackup && <button className="btn" onClick={onBackup}><I n="backup" size={18} /> Backup ke Drive</button>}
          {onLogout && <button className="btn" onClick={onLogout}><I n="logout" size={18} /> Keluar</button>}
          <a className="user" href="#/profil" onClick={() => setOpen(false)}>
            <span className="avatar">{inisial(tampil)}</span>
            <div><strong>{tampil}</strong><small>Lihat & edit profil</small></div>
          </a>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <div className="brand only-mobile"><span className="logo">D</span></div>
          <h1>{title}</h1>
          <span className={'sync-mini ' + saveStatus} title={statusText} aria-label={statusText}><span className="dotst" /><span className="sm-hide">{statusText}</span></span>
          <button className="btn primary sm-hide" onClick={onAdd} disabled={locked}>+ Catat transaksi</button>
        </header>
        <main className="content">
          {saveStatus === 'error' && <div className="banner" role="alert">{statusText} {onRetry && <button className="link" onClick={onRetry}>Coba lagi</button>}</div>}
          {children}
        </main>
      </div>

      <button className="fab only-mobile" aria-label="Catat transaksi" onClick={onAdd} disabled={locked}><I n="plus" size={26} /></button>
      <nav className="bottomnav only-mobile" aria-label="Menu cepat">
        {BAWAH.map((m) => (
          <a key={m.id} href={'#/' + m.id} className={route === m.id ? 'is-active' : ''} aria-current={route === m.id ? 'page' : undefined}><I n={m.icon} size={22} /><span>{m.short}</span></a>
        ))}
        <button className={['anggaran', 'profil'].includes(route) ? 'is-active' : ''} onClick={() => setOpen(true)}><I n="more" size={22} /><span>Lainnya</span></button>
      </nav>
    </div>
  )
}
