import { useEffect, useReducer, useRef, useState } from 'react'
import { uid } from './format'
import { MODE_SHEETS, call } from './api'

export const KATEGORI_KELUAR = ['Makan & minum', 'Transport', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya']
export const KATEGORI_MASUK = ['Gaji', 'Bonus', 'Usaha', 'Lainnya']
export const JENIS_INVESTASI = ['Reksa dana', 'Saham', 'Emas', 'Obligasi', 'Kripto', 'Deposito']

const initial = {
  accounts: [
    { id: 'a1', name: 'BCA Tahapan', balance: 12500000 },
    { id: 'a2', name: 'Mandiri', balance: 4200000 },
    { id: 'a3', name: 'GoPay', balance: 350000 },
  ],
  transactions: [
    { id: 't1', date: '2025-10-25', desc: 'Gaji Oktober', amount: 9000000, type: 'in', category: 'Gaji', accountId: 'a1' },
    { id: 't2', date: '2025-10-22', desc: 'Belanja bulanan', amount: 850000, type: 'out', category: 'Belanja', accountId: 'a1' },
    { id: 't3', date: '2025-10-18', desc: 'Listrik & air', amount: 420000, type: 'out', category: 'Tagihan', accountId: 'a2' },
    { id: 't4', date: '2025-10-12', desc: 'Makan siang tim', amount: 180000, type: 'out', category: 'Makan & minum', accountId: 'a3' },
    { id: 't5', date: '2025-09-25', desc: 'Gaji September', amount: 9000000, type: 'in', category: 'Gaji', accountId: 'a1' },
    { id: 't6', date: '2025-09-14', desc: 'Servis motor', amount: 650000, type: 'out', category: 'Transport', accountId: 'a2' },
    { id: 't7', date: '2025-08-25', desc: 'Gaji Agustus', amount: 9000000, type: 'in', category: 'Gaji', accountId: 'a1' },
    { id: 't8', date: '2025-08-09', desc: 'Nonton & jajan', amount: 320000, type: 'out', category: 'Hiburan', accountId: 'a3' },
  ],
  investments: [
    { id: 'i1', name: 'Reksa Dana Pasar Uang', type: 'Reksa dana', invested: 5000000, value: 5240000 },
    { id: 'i2', name: 'Emas Batangan', type: 'Emas', invested: 3000000, value: 3410000 },
    { id: 'i3', name: 'Saham BBCA', type: 'Saham', invested: 2000000, value: 1890000 },
  ],
  goals: [
    { id: 'g1', name: 'Dana darurat 6 bulan', target: 30000000, saved: 12000000, deadline: '2026-06-30' },
    { id: 'g2', name: 'Liburan Bali', target: 8000000, saved: 3500000, deadline: '2026-03-15' },
  ],
  budgets: [
    { category: 'Makan & minum', limit: 1500000 },
    { category: 'Transport', limit: 800000 },
    { category: 'Tagihan', limit: 1200000 },
    { category: 'Belanja', limit: 1500000 },
    { category: 'Hiburan', limit: 500000 },
  ],
}

const empty = { accounts: [], transactions: [], investments: [], goals: [], budgets: [] }

function reducer(s, a) {
  switch (a.type) {
    case 'replace':
      return { ...empty, ...a.state }
    case 'addTransaction': {
      const t = { ...a.payload, id: uid() }
      const delta = t.type === 'in' ? t.amount : -t.amount
      return {
        ...s,
        transactions: [t, ...s.transactions],
        accounts: s.accounts.map((x) => (x.id === t.accountId ? { ...x, balance: x.balance + delta } : x)),
      }
    }
    case 'addAccount':
      return { ...s, accounts: [...s.accounts, { id: uid(), ...a.payload }] }
    case 'addInvestment':
      return { ...s, investments: [...s.investments, { id: uid(), ...a.payload }] }
    case 'updateInvestmentValue':
      return { ...s, investments: s.investments.map((i) => (i.id === a.id ? { ...i, value: a.value } : i)) }
    case 'addGoal':
      return { ...s, goals: [...s.goals, { id: uid(), saved: 0, ...a.payload }] }
    case 'fundGoal':
      return { ...s, goals: s.goals.map((g) => (g.id === a.id ? { ...g, saved: g.saved + a.amount } : g)) }
    case 'setBudget': {
      const rest = s.budgets.filter((b) => b.category !== a.category)
      return { ...s, budgets: a.limit > 0 ? [...rest, { category: a.category, limit: a.limit }] : rest }
    }
    default:
      return s
  }
}

export function useStore(onAuthError) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    if (MODE_SHEETS) return empty
    try {
      const raw = localStorage.getItem('duitku-state')
      return raw ? { ...initial, ...JSON.parse(raw) } : initial
    } catch { return initial }
  })
  const [status, setStatus] = useState(MODE_SHEETS ? 'loading' : 'ready') // loading | ready | error
  const [saveStatus, setSaveStatus] = useState('saved') // saved | saving | error
  const [pesan, setPesan] = useState('')
  const skip = useRef(true)

  // muat data dari Sheets
  useEffect(() => {
    if (!MODE_SHEETS) return
    let batal = false
    call('load').then((r) => {
      if (batal) return
      if (r.auth === false) return onAuthError()
      if (!r.ok) { setStatus('error'); setPesan(r.error || 'Gagal memuat data'); return }
      skip.current = true
      dispatch({ type: 'replace', state: r.state })
      setStatus('ready')
    }).catch(() => { if (!batal) { setStatus('error'); setPesan('Tidak bisa terhubung ke server') } })
    return () => { batal = true }
  }, [])

  // simpan ke Sheets (setelah berhenti mengubah 0,8 detik)
  useEffect(() => {
    if (!MODE_SHEETS || status !== 'ready') return
    if (skip.current) { skip.current = false; return }
    setSaveStatus('saving')
    const t = setTimeout(() => {
      call('save', { state }).then((r) => {
        if (r.auth === false) return onAuthError()
        setSaveStatus(r.ok ? 'saved' : 'error'); if (!r.ok) setPesan(r.error || 'Gagal menyimpan')
      }).catch(() => { setSaveStatus('error'); setPesan('Gagal menyimpan, cek koneksi') })
    }, 800)
    return () => clearTimeout(t)
  }, [state, status])

  // mode lokal
  useEffect(() => {
    if (MODE_SHEETS) return
    try { localStorage.setItem('duitku-state', JSON.stringify(state)) } catch {}
  }, [state])

  return [state, dispatch, { status, saveStatus, pesan }]
}
