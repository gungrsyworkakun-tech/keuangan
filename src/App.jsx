import { Component, Suspense, lazy, useEffect, useState } from 'react'
import { useStore } from './lib/store'
import { MODE_SHEETS, call, getToken, setToken, hapusCache } from './lib/api'
import FinanceShell, { MENU } from './layouts/finance-shell.layout.jsx'
import TransactionDialog from './pages/transaction-dialog.jsx'
import Login from './pages/login.page.jsx'
import { Skeleton } from './pages/ui.jsx'

// Tiap halaman dimuat saat dibuka, jadi buka pertama kali lebih cepat
const PAGES = {
  ringkasan: lazy(() => import('./pages/ringkasan.page.jsx')),
  transaksi: lazy(() => import('./pages/transaksi.page.jsx')),
  bank: lazy(() => import('./pages/sisa-bank.page.jsx')),
  investasi: lazy(() => import('./pages/investasi.page.jsx')),
  goal: lazy(() => import('./pages/goal.page.jsx')),
  anggaran: lazy(() => import('./pages/anggaran.page.jsx')),
  profil: lazy(() => import('./pages/profil.page.jsx')),
}
const currentRoute = () => {
  const r = location.hash.replace('#/', '')
  return PAGES[r] ? r : 'ringkasan'
}

class Penjaga extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="login-wrap"><div className="panel login">
        <h2>Ups, ada yang tidak beres</h2>
        <p className="hint">Datamu aman. Muat ulang halaman untuk melanjutkan.</p>
        <button className="btn primary" onClick={() => location.reload()}>Muat ulang</button>
      </div></div>
    )
  }
}

export default function App() {
  const [masuk, setMasuk] = useState(!MODE_SHEETS || Boolean(getToken()))
  const keluar = () => { setToken(''); hapusCache(); setMasuk(false) }
  return (
    <Penjaga>
      {masuk ? <Main onKeluar={keluar} /> : <Login onLogin={() => setMasuk(true)} />}
    </Penjaga>
  )
}

function Main({ onKeluar }) {
  const [state, dispatch, meta] = useStore(onKeluar)
  const [route, setRoute] = useState(currentRoute())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [info, setInfo] = useState('')

  useEffect(() => {
    const on = () => { setRoute(currentRoute()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const logout = async () => { try { await call('logout') } catch {} ; onKeluar() }
  const backup = async () => {
    setInfo('Membuat backup…')
    try { const r = await call('backup'); setInfo(r.ok ? 'Backup tersimpan di Drive' : r.error) } catch { setInfo('Backup gagal') }
    setTimeout(() => setInfo(''), 4000)
  }

  const Page = PAGES[route]
  const title = MENU.find((m) => m.id === route).label
  const terkunci = MODE_SHEETS && !meta.segar
  const statusText = !MODE_SHEETS ? 'Mode lokal'
    : terkunci ? (meta.pesan ? meta.pesan + ' · baca saja' : 'Menyinkronkan…')
    : meta.saveStatus === 'saving' ? 'Menyimpan…'
    : meta.saveStatus === 'error' ? 'Gagal menyimpan: ' + meta.pesan
    : 'Tersimpan di Sheets'
  const akun = { profil: meta.profil, simpanProfil: meta.simpanProfil, gantiPassword: meta.gantiPassword, sheets: MODE_SHEETS, onLogout: logout, onBackup: backup }

  return (
    <FinanceShell route={route} title={title} nama={meta.profil.nama} username={meta.profil.username}
      onAdd={() => setDialogOpen(true)} locked={terkunci}
      saveStatus={terkunci ? (meta.pesan ? 'error' : 'saving') : meta.saveStatus} statusText={statusText} info={info}
      onRetry={terkunci ? meta.muat : meta.simpan}
      onLogout={MODE_SHEETS ? logout : null} onBackup={MODE_SHEETS ? backup : null}>
      {meta.status === 'loading' ? <Skeleton />
        : meta.status === 'error' ? <div className="panel"><p role="alert" className="out">{meta.pesan}</p><button className="btn primary" onClick={() => location.reload()}>Coba lagi</button></div>
        : (
          <Suspense fallback={<Skeleton />}>
            <fieldset className="lock" disabled={terkunci}>
              <Page state={state} dispatch={dispatch} onAdd={() => setDialogOpen(true)} profil={meta.profil} akun={akun} />
            </fieldset>
            <TransactionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} state={state} dispatch={dispatch} />
          </Suspense>
        )}
    </FinanceShell>
  )
}
