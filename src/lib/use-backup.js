import { useCallback, useEffect, useRef, useState } from 'react'
import { kosong, hitung } from './sheets-backup'
import { sumberAktif } from './sumber'

const META = 'duitku-backup'
const bacaMeta = () => { try { return JSON.parse(localStorage.getItem(META) || 'null') } catch { return null } }
const tulisMeta = (m) => { try { m ? localStorage.setItem(META, JSON.stringify(m)) : localStorage.removeItem(META) } catch {} }
const JEDA = 8000 // cadangkan 8 detik setelah perubahan terakhir (beberapa ubahan jadi satu kali kirim)

// status: mati | menghubungkan | pilih | siap | menyimpan | gagal
export function useBackup(state, dispatch, aktif, sumber = sumberAktif) {
  const awal = aktif ? bacaMeta() : null
  const [meta, setMeta] = useState(awal)               // { id, email, terakhir }
  const [status, setStatus] = useState(awal ? 'siap' : 'mati')
  const [pesan, setPesan] = useState('')
  const [pilihan, setPilihan] = useState(null)         // { id, data, jumlahSheet, jumlahHp } saat data HP dan Sheets sama-sama ada
  const klien = sumber.klien
  const stateRef = useRef(state); stateRef.current = state
  const metaRef = useRef(meta); metaRef.current = meta
  const sibuk = useRef(false), antre = useRef(false), kotor = useRef(false), lewat = useRef(true)

  const simpanMeta = (m) => { tulisMeta(m); setMeta(m) }

  const kirim = useCallback(async () => {
    const m = metaRef.current
    if (!m || !m.id) return
    if (sibuk.current) { antre.current = true; return }
    sibuk.current = true; setStatus('menyimpan'); setPesan('')
    try {
      await klien.tulis(m.id, stateRef.current)
      kotor.current = false
      simpanMeta({ ...m, terakhir: new Date().toISOString() })
      setStatus('siap')
    } catch (e) { setStatus('gagal'); setPesan(e.message || 'Backup gagal') }
    finally { sibuk.current = false; if (antre.current) { antre.current = false; kirim() } }
  }, [])

  // setiap ada data baru -> cadangkan otomatis
  useEffect(() => {
    if (!aktif) return
    if (lewat.current) { lewat.current = false; return }
    if (!metaRef.current || status === 'mati' || status === 'pilih' || status === 'menghubungkan') return
    kotor.current = true
    const t = setTimeout(kirim, JEDA)
    return () => clearTimeout(t)
  }, [state])

  // kalau tadi gagal (mis. tidak ada internet), coba lagi saat internet kembali
  useEffect(() => {
    if (!aktif) return
    const on = () => { if (kotor.current && metaRef.current) kirim() }
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [])

  const hubungkan = useCallback(async (input) => {
    setStatus('menghubungkan'); setPesan('')
    try {
      const akun = await sumber.masuk(input)
      const id = await klien.cari()
      if (!id) {
        const baru = await klien.buat()
        simpanMeta({ id: baru, email: akun.email })
        await klien.tulis(baru, stateRef.current)
        simpanMeta({ id: baru, email: akun.email, terakhir: new Date().toISOString() })
        return setStatus('siap')
      }
      const data = await klien.baca(id)
      if (kosong(data)) {
        simpanMeta({ id, email: akun.email }); setStatus('siap'); metaRef.current = { id, email: akun.email }
        await kirim(); return
      }
      if (kosong(stateRef.current)) { // HP baru/kosong: langsung pulihkan dari Sheets
        dispatch({ type: 'replace', state: { ...stateRef.current, ...data } })
        simpanMeta({ id, email: akun.email, terakhir: new Date().toISOString() })
        return setStatus('siap')
      }
      // dua-duanya ada isinya: biarkan pengguna memilih, jangan menimpa diam-diam
      simpanMeta({ id, email: akun.email })
      setPilihan({ id, data, jumlahSheet: hitung(data), jumlahHp: hitung(stateRef.current) })
      setStatus('pilih')
    } catch (e) { if (!metaRef.current) { try { await sumber.keluar() } catch {} } setStatus(metaRef.current ? 'gagal' : 'mati'); setPesan(e.message || 'Gagal terhubung') }
  }, [dispatch])

  const putuskan = useCallback(async () => {
    await sumber.keluar(); tulisMeta(null); setMeta(null); setPilihan(null); setStatus('mati'); setPesan('')
  }, [])

  const pakaiSheets = useCallback(() => {
    if (!pilihan) return
    dispatch({ type: 'replace', state: { ...stateRef.current, ...pilihan.data } })
    simpanMeta({ id: pilihan.id, email: (metaRef.current || {}).email, terakhir: new Date().toISOString() })
    setPilihan(null); setStatus('siap')
  }, [pilihan, dispatch])
  const pakaiHp = useCallback(async () => {
    setPilihan(null); setStatus('siap'); await kirim()
  }, [])

  const pulihkan = useCallback(async () => {
    const m = metaRef.current; if (!m) return
    setStatus('menghubungkan'); setPesan('')
    try {
      const data = await klien.baca(m.id)
      dispatch({ type: 'replace', state: { ...stateRef.current, ...data } })
      setStatus('siap')
    } catch (e) { setStatus('gagal'); setPesan(e.message || 'Gagal memulihkan') }
  }, [dispatch])

  return { aktif, jenis: sumber.jenis, status, pesan, meta, pilihan, hubungkan, putuskan, pakaiSheets, pakaiHp, pulihkan, cadangkanSekarang: kirim }
}
