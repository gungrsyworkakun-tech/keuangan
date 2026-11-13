import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { uid } from './format'
import { MODE_SHEETS, call, bacaCache, tulisCache, bacaProfil, tulisProfil } from './api'

export const KATEGORI_KELUAR = ['Makan & minum', 'Transport', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya']
export const KATEGORI_MASUK = ['Gaji', 'Bonus', 'Usaha', 'Lainnya']
export const JENIS_REKENING = [['bank', 'Bank'], ['tunai', 'Uang tunai'], ['ewallet', 'E-wallet']]
// jenis rekening: dari data; kalau belum ada, ditebak dari nama
export const jenisRek = (a) => a.jenis || (/tunai|cash|dompet/i.test(a.name) ? 'tunai' : /gopay|ovo|dana|shopee|linkaja|e-?wallet/i.test(a.name) ? 'ewallet' : 'bank')
export const adalahTransfer = (t) => t.category === 'Transfer'
// tipe untuk tampilan: perpindahan saldo tidak dihitung pemasukan/pengeluaran
export const tipeTampil = (t) => (adalahTransfer(t) ? (t.type === 'in' ? 'tin' : 'tout') : t.type)
export const JENIS_INVESTASI = ['Reksa dana', 'Saham', 'Emas', 'Obligasi', 'Kripto', 'Deposito']

const initial = {
  accounts: [
    { id: 'a1', name: 'BCA Tahapan', balance: 12500000 },
    { id: 'a2', name: 'Mandiri', balance: 4200000 },
    { id: 'a3', name: 'GoPay', balance: 350000, jenis: 'ewallet' },
    { id: 'a4', name: 'Uang Tunai', balance: 500000, jenis: 'tunai' },
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
  savings: [],
  budgets: [
    { category: 'Makan & minum', limit: 1500000 },
    { category: 'Transport', limit: 800000 },
    { category: 'Tagihan', limit: 1200000 },
    { category: 'Belanja', limit: 1500000 },
    { category: 'Hiburan', limit: 500000 },
  ],
}

const empty = { accounts: [], transactions: [], investments: [], goals: [], budgets: [], savings: [] }

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
    case 'updateTransaction': {
      const lama = s.transactions.find((t) => t.id === a.id)
      if (!lama) return s
      const baru = { ...lama, ...a.patch }
      const efek = (t) => (t.type === 'in' ? t.amount : -t.amount)
      return {
        ...s,
        transactions: s.transactions.map((t) => (t.id === a.id ? baru : t)),
        accounts: s.accounts.map((x) => {
          let b = x.balance
          if (x.id === lama.accountId) b -= efek(lama)
          if (x.id === baru.accountId) b += efek(baru)
          return b === x.balance ? x : { ...x, balance: b }
        }),
      }
    }
    case 'deleteTransaction': {
      const lama = s.transactions.find((t) => t.id === a.id)
      if (!lama) return s
      // transfer = dua catatan berpasangan (id tf-xxx-a / tf-xxx-b), dihapus bersama
      const ids = a.id.startsWith('tf-') ? [a.id.slice(0, -2) + '-a', a.id.slice(0, -2) + '-b'] : [a.id]
      const hapus = s.transactions.filter((t) => ids.includes(t.id))
      return {
        ...s,
        transactions: s.transactions.filter((t) => !ids.includes(t.id)),
        accounts: s.accounts.map((x) => hapus.reduce((acc, t) => (t.accountId === x.id ? { ...acc, balance: acc.balance - (t.type === 'in' ? t.amount : -t.amount) } : acc), x)),
      }
    }
    case 'transfer': {
      const { from, to, amount, date, label } = a.payload
      const f = s.accounts.find((x) => x.id === from), t = s.accounts.find((x) => x.id === to)
      if (!f || !t || from === to || !(amount > 0)) return s
      const k = uid()
      const kaki = [
        { id: `tf-${k}-a`, date, desc: `${label} ke ${t.name}`, amount, type: 'out', category: 'Transfer', accountId: from },
        { id: `tf-${k}-b`, date, desc: `${label} dari ${f.name}`, amount, type: 'in', category: 'Transfer', accountId: to },
      ]
      return {
        ...s,
        transactions: [...kaki, ...s.transactions],
        accounts: s.accounts.map((x) => (x.id === from ? { ...x, balance: x.balance - amount } : x.id === to ? { ...x, balance: x.balance + amount } : x)),
      }
    }
    case 'updateAccount':
      return { ...s, accounts: s.accounts.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) }
    case 'deleteAccount':
      return { ...s, accounts: s.accounts.filter((x) => x.id !== a.id) }
    case 'updateInvestment':
      return { ...s, investments: s.investments.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) }
    case 'deleteInvestment':
      return { ...s, investments: s.investments.filter((x) => x.id !== a.id) }
    case 'updateGoal':
      return { ...s, goals: s.goals.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) }
    case 'deleteGoal':
      return { ...s, goals: s.goals.filter((x) => x.id !== a.id) }
    case 'addAccount':
      return { ...s, accounts: [...s.accounts, { id: uid(), ...a.payload }] }
    case 'addInvestment':
      return { ...s, investments: [...s.investments, { id: uid(), ...a.payload }] }
    case 'investTambah': // tambah dana ke investasi yang sudah ada: modal dan nilai naik
      return { ...s, investments: s.investments.map((i) => (i.id === a.id ? { ...i, invested: i.invested + a.amount, value: (a.nilai ?? i.value) + a.amount, qty: (i.qty || 0) + (a.qty || 0) } : i)) }
    case 'investTarik': { // tarik sebagian/semua: modal berkurang sebanding, kalau habis dihapus dari portofolio
      const i = s.investments.find((x) => x.id === a.id)
      if (!i) return s
      const nilai = a.nilai ?? i.value
      const rasio = nilai > 0 ? Math.min(1, a.amount / nilai) : 1
      if (rasio >= 1) return { ...s, investments: s.investments.filter((x) => x.id !== a.id) }
      const qty = a.qty > 0 ? Math.max(0, (i.qty || 0) - a.qty) : (i.qty || 0) * (1 - rasio)
      return { ...s, investments: s.investments.map((x) => (x.id === a.id ? { ...x, invested: Math.round(x.invested * (1 - rasio)), value: Math.round(nilai - a.amount), qty } : x)) }
    }
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
    case 'updateBudget': { // ubah nama kategori dan/atau batas; kalau nama baru sudah ada, digabung (yang baru menang)
      const baru = { ...(s.budgets.find((b) => b.category === a.category) || { category: a.category, limit: 0 }), ...a.patch }
      if (!(baru.limit > 0)) return { ...s, budgets: s.budgets.filter((b) => b.category !== a.category) }
      const idx = s.budgets.findIndex((b) => b.category === a.category)
      const rest = s.budgets.filter((b) => b.category !== baru.category && b.category !== a.category)
      const urut = [...rest]; urut.splice(Math.min(Math.max(idx, 0), urut.length), 0, baru)
      return { ...s, budgets: urut }
    }
    case 'deleteBudget':
      return { ...s, budgets: s.budgets.filter((b) => b.category !== a.category) }
    case 'setSaving': { // satu bulan = satu setoran; jumlah <= 0 menghapus
      const rest = s.savings.filter((x) => x.month !== a.month)
      const lama = s.savings.find((x) => x.month === a.month)
      const note = a.note !== undefined ? a.note : lama?.note || ''
      return { ...s, savings: a.amount > 0 ? [...rest, { id: lama?.id || uid(), month: a.month, amount: a.amount, note }] : rest }
    }
    case 'fillSavings': { // isi banyak bulan sekaligus (hanya bulan yang masih kosong, kecuali timpa)
      const ada = new Set(s.savings.map((x) => x.month))
      const baru = []
      const [y0, m0] = a.from.split('-').map(Number), [y1, m1] = a.to.split('-').map(Number)
      for (let i = y0 * 12 + m0 - 1; i <= y1 * 12 + m1 - 1 && baru.length < 600; i++) {
        const key = `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
        if (!ada.has(key) || a.timpa) baru.push({ id: uid(), month: key, amount: a.amount, note: '' })
      }
      const ganti = new Set(baru.map((x) => x.month))
      return { ...s, savings: [...s.savings.filter((x) => !ganti.has(x.month)), ...baru] }
    }
    default:
      return s
  }
}

export function useStore(onAuthError) {
  const cache = MODE_SHEETS ? bacaCache() : null
  const adaCache = Boolean(cache && cache.state)
  const [state, dispatch] = useReducer(reducer, null, () => {
    if (MODE_SHEETS) return adaCache ? { ...empty, ...cache.state } : empty
    try {
      const raw = localStorage.getItem('duitku-state')
      return raw ? { ...initial, ...JSON.parse(raw) } : initial
    } catch { return initial }
  })
  const [profil, setProfil] = useState(() => bacaProfil() || { nama: '', username: '' })
  const [status, setStatus] = useState(MODE_SHEETS && !adaCache ? 'loading' : 'ready') // loading | ready | error
  const [segar, setSegar] = useState(!MODE_SHEETS)        // data sudah dicocokkan dengan server
  const [saveStatus, setSaveStatus] = useState('saved')   // saved | saving | error
  const [pesan, setPesan] = useState('')

  const stateRef = useRef(state); stateRef.current = state
  const skip = useRef(true)
  const sibuk = useRef(false), antre = useRef(false), belumTersimpan = useRef(false)

  // Hanya boleh mengubah data setelah data cocok dengan server (mencegah menimpa data yang lebih baru).
  const act = useCallback((a) => {
    if (MODE_SHEETS && !segar) return
    belumTersimpan.current = true
    dispatch(a)
  }, [segar])

  // 1) muat dari Sheets (data lama di perangkat tampil dulu agar terasa cepat)
  const muat = useCallback(() => {
    if (!MODE_SHEETS) return
    setPesan('')
    call('load').then((r) => {
      if (r.auth === false) return onAuthError()
      if (!r.ok) { setPesan(r.error || 'Gagal memuat data'); setStatus(adaCache ? 'ready' : 'error'); return }
      if (r.profil) { setProfil(r.profil); tulisProfil(r.profil) }
      skip.current = true
      dispatch({ type: 'replace', state: r.state })
      tulisCache(r.state)
      setStatus('ready'); setSegar(true)
    }).catch(() => {
      setPesan('Tidak bisa terhubung ke server')
      setStatus(adaCache ? 'ready' : 'error')
    })
  }, [])
  useEffect(() => { muat() }, [])

  // 2) simpan ke Sheets, satu per satu (tidak bertabrakan)
  const simpan = useCallback(async () => {
    if (sibuk.current) { antre.current = true; return }
    sibuk.current = true
    setSaveStatus('saving')
    try {
      const potret = stateRef.current
      const r = await call('save', { state: potret })
      if (r.auth === false) { onAuthError(); return }
      if (r.ok) {
        tulisCache(potret)
        if (!antre.current) { belumTersimpan.current = false; setSaveStatus('saved') }
      } else { setSaveStatus('error'); setPesan(r.error || 'Gagal menyimpan') }
    } catch { setSaveStatus('error'); setPesan('Gagal menyimpan, cek koneksi') }
    finally {
      sibuk.current = false
      if (antre.current) { antre.current = false; simpan() }
    }
  }, [])

  useEffect(() => {
    if (!MODE_SHEETS || status !== 'ready') return
    if (skip.current) { skip.current = false; return }
    setSaveStatus('saving')
    const t = setTimeout(simpan, 800)
    return () => clearTimeout(t)
  }, [state, status])

  // 3) jangan sampai data hilang saat tab ditutup / pindah aplikasi
  useEffect(() => {
    if (!MODE_SHEETS) return
    const keluar = (e) => { if (belumTersimpan.current) { e.preventDefault(); e.returnValue = '' } }
    const sembunyi = () => {
      if (document.visibilityState === 'hidden' && belumTersimpan.current && !sibuk.current) {
        call('save', { state: stateRef.current }, { keepalive: true }).catch(() => {})
      }
    }
    window.addEventListener('beforeunload', keluar)
    document.addEventListener('visibilitychange', sembunyi)
    return () => { window.removeEventListener('beforeunload', keluar); document.removeEventListener('visibilitychange', sembunyi) }
  }, [])

  // mode lokal
  useEffect(() => {
    if (MODE_SHEETS) return
    try { localStorage.setItem('duitku-state', JSON.stringify(state)) } catch {}
  }, [state])

  // profil & password
  const simpanProfil = async (nama) => {
    const bersih = String(nama || '').trim().slice(0, 40)
    if (!bersih) throw new Error('Nama tidak boleh kosong')
    if (!MODE_SHEETS) { const p = { ...profil, nama: bersih }; setProfil(p); tulisProfil(p); return }
    const r = await call('saveProfile', { nama: bersih })
    if (r.auth === false) { onAuthError(); throw new Error('Sesi habis, silakan login lagi') }
    if (!r.ok) throw new Error(r.error || 'Gagal menyimpan profil')
    setProfil(r.profil); tulisProfil(r.profil)
  }
  const gantiPassword = async (lama, baru) => {
    const r = await call('changePassword', { oldPassword: lama, newPassword: baru })
    if (r.auth === false) { onAuthError(); throw new Error('Sesi habis, silakan login lagi') }
    if (!r.ok) throw new Error(r.error || 'Gagal mengganti password')
  }

  return [state, act, { status, segar, saveStatus, pesan, profil, simpan, muat, simpanProfil, gantiPassword }]
}
