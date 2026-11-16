// Backup ke Google Sheets lewat skrip kecil (Apps Script) milik pengguna sendiri.
// Pengguna menempel Link + Kunci; tidak perlu login Google atau Google Cloud.
import { keBaris, dariBaris } from './sheets-backup.js'

const URL_SKRIP = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
const KUNCI_CONFIG = 'duitku-sheet'

export const cekLink = (u) => URL_SKRIP.test(String(u || '').trim())

export function bacaConfig(simpan = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { const c = JSON.parse(simpan.getItem(KUNCI_CONFIG) || 'null'); return c && cekLink(c.url) && c.kunci ? c : null } catch { return null }
}
export function simpanConfig(c, simpan = localStorage) {
  try { c ? simpan.setItem(KUNCI_CONFIG, JSON.stringify({ url: c.url.trim(), kunci: c.kunci })) : simpan.removeItem(KUNCI_CONFIG) } catch {}
}

// ambil(): { url, kunci }. fetcher boleh diganti saat uji.
export function buatKlienScript({ ambil = () => bacaConfig(), fetcher = (...a) => fetch(...a) } = {}) {
  async function kirim(aksi, data) {
    const c = ambil()
    if (!c) throw new Error('Link dan kunci Sheet belum diisi')
    let res
    try {
      res = await fetcher(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ kunci: c.kunci, aksi, data }), redirect: 'follow', credentials: 'omit' })
    } catch { throw new Error('Tidak bisa terhubung. Periksa internet dan link-nya') }
    let j
    try { j = await res.json() } catch { throw new Error('Link tidak benar, atau skrip belum di-deploy dengan akses "Siapa saja"') }
    if (!j || !j.ok) throw new Error((j && j.error) || 'Sheet menolak permintaan')
    return j
  }
  return {
    cari: async () => { await kirim('tes'); return 'script' }, // gagal = link/kunci salah
    buat: async () => 'script',
    tulis: async (_id, state) => { await kirim('tulis', keBaris(state)) },
    baca: async () => dariBaris((await kirim('baca')).data || {}),
  }
}
