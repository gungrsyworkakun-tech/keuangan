import { useEffect, useState } from 'react'
import { useStore } from './lib/store'
import { MODE_SHEETS, call, getToken, setToken } from './lib/api'
import FinanceShell, { MENU } from './layouts/finance-shell.layout.jsx'
import TransactionDialog from './pages/transaction-dialog.jsx'
import Login from './pages/login.page.jsx'
import Ringkasan from './pages/ringkasan.page.jsx'
import Transaksi from './pages/transaksi.page.jsx'
import SisaBank from './pages/sisa-bank.page.jsx'
import Investasi from './pages/investasi.page.jsx'
import Goal from './pages/goal.page.jsx'
import Anggaran from './pages/anggaran.page.jsx'

const PAGES = { ringkasan: Ringkasan, transaksi: Transaksi, bank: SisaBank, investasi: Investasi, goal: Goal, anggaran: Anggaran }
const currentRoute = () => {
  const r = location.hash.replace('#/', '')
  return PAGES[r] ? r : 'ringkasan'
}

export default function App() {
  const [masuk, setMasuk] = useState(!MODE_SHEETS || Boolean(getToken()))
  if (!masuk) return <Login onLogin={() => setMasuk(true)} />
  return <Main onKeluar={() => { setToken(''); setMasuk(false) }} />
}

function Main({ onKeluar }) {
  const [state, dispatch, meta] = useStore(onKeluar)
  const [route, setRoute] = useState(currentRoute())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [info, setInfo] = useState('')

  useEffect(() => {
    const on = () => setRoute(currentRoute())
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
  const statusText = !MODE_SHEETS ? 'Mode lokal (belum terhubung Sheets)'
    : meta.saveStatus === 'saving' ? 'Menyimpan…' : meta.saveStatus === 'error' ? 'Gagal menyimpan: ' + meta.pesan : 'Tersimpan di Google Sheets'

  return (
    <FinanceShell route={route} title={title} onAdd={() => setDialogOpen(true)}
      onLogout={MODE_SHEETS ? logout : null} onBackup={MODE_SHEETS ? backup : null} status={info || statusText} statusError={meta.saveStatus === 'error'}>
      {meta.status === 'loading' ? <p className="empty">Memuat data…</p>
        : meta.status === 'error' ? <p role="alert" className="out">{meta.pesan}</p>
        : <>
            <Page state={state} dispatch={dispatch} onAdd={() => setDialogOpen(true)} />
            <TransactionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} state={state} dispatch={dispatch} />
          </>}
    </FinanceShell>
  )
}
