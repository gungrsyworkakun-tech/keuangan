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
  async function kirim(aksi, data, tambahan = {}) {
    const c = ambil()
    if (!c) throw new Error('Link dan kunci Sheet belum diisi')
    let res
    try {
      res = await fetcher(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ kunci: c.kunci, aksi, data, ...tambahan }), redirect: 'follow', credentials: 'omit' })
    } catch { throw new Error('Tidak bisa terhubung. Periksa internet dan link-nya') }
    let j
    try { j = await res.json() } catch { throw new Error('Link tidak benar, atau skrip belum di-deploy dengan akses "Siapa saja"') }
    if (!j || !j.ok) throw new Error((j && j.error) || 'Sheet menolak permintaan')
    return j
  }
  let versi = 0
  return {
    cari: async () => { versi = (await kirim('tes')).versi || 1; return 'script' }, // gagal = link/kunci salah
    buat: async () => 'script',
    tulis: async (_id, state) => {
      // skrip versi lama tidak menyimpan target pemasukan; jangan menimpa Sheet dengan data yang kurang
      if ((state.budgets || []).some((b) => b.tipe === 'in')) {
        if (!versi) versi = (await kirim('tes')).versi || 1
        if (versi < 2) throw new Error('Skrip di Sheet kamu masih versi lama. Salin skrip baru dari menu Profil, tempel ulang, lalu Deploy > Kelola deployment > Versi baru.')
      }
      await kirim('tulis', keBaris(state))
    },
    baca: async () => dariBaris((await kirim('baca')).data || {}),
    harga: async (daftar, segar = false) => (await kirim('harga', daftar, segar ? { segar: true } : {})).harga || {},
    // riwayat harga untuk grafik; skrip versi lama tidak mengenalnya -> pesan khusus
    riwayat: async (jenis, hari = 90) => {
      try { return (await kirim('riwayat', { jenis, hari })).titik || [] }
      catch (e) { throw new Error(/tidak dikenal/i.test(e.message) ? 'SKRIP_LAMA' : e.message) }
    },
  }
}

const PENANDA = "'GANTI-INI-DENGAN-KATA-RAHASIA-PANJANG'"
const DRAF = 'duitku-kunci-draf'
// Kunci acak 24 karakter (huruf besar+kecil+angka, tanpa yang mirip: 0/O, 1/l/I)
export function kunciBaru(rand = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from(rand(24), (b) => abc[b % abc.length]).join('')
}
// Kunci draf bertahan sampai berhasil terhubung, supaya skrip yang sudah ditempel tetap cocok
export function kunciDraf(simpan = localStorage) {
  try { let k = simpan.getItem(DRAF); if (!k || k.length < 16) { k = kunciBaru(); simpan.setItem(DRAF, k) } return k } catch { return kunciBaru() }
}
export function hapusKunciDraf(simpan = localStorage) { try { simpan.removeItem(DRAF) } catch {} }
// Skrip siap tempel: kunci sudah terisi
export function skripDenganKunci(skrip, kunci) {
  if (!skrip.includes(PENANDA)) throw new Error('Penanda kunci tidak ditemukan di skrip')
  if (!/^[A-Za-z0-9_-]{16,}$/.test(kunci)) throw new Error('Kunci tidak valid')
  return skrip.replace(PENANDA, `'${kunci}'`)
}
