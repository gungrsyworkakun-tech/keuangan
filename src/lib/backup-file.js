// Backup ke file (.json): disimpan lewat menu Bagikan HP (Drive, WhatsApp, Files, dll) dan dipulihkan dari file itu.
import { keBaris, dariBaris, hitung } from './sheets-backup.js'

const MAKS_BYTE = 5 * 1024 * 1024

export function buatBerkas(state, sekarang = new Date()) {
  const data = dariBaris(keBaris(state)) // dibersihkan: hanya kolom dikenal, teks dipotong
  return JSON.stringify({ app: 'duitku', versi: 1, waktu: sekarang.toISOString(), data })
}

export function namaBerkas(sekarang = new Date()) {
  return 'duitku-backup-' + sekarang.toISOString().slice(0, 10) + '.json'
}

// teks file -> { state, jumlah }. Melempar Error berbahasa sederhana kalau file tidak cocok.
export function bacaBerkas(teks) {
  if (typeof teks !== 'string' || teks.length > MAKS_BYTE) throw new Error('File terlalu besar atau tidak terbaca')
  let j
  try { j = JSON.parse(teks) } catch { throw new Error('Ini bukan file backup Duitku') }
  if (!j || j.app !== 'duitku' || !j.data || typeof j.data !== 'object') throw new Error('Ini bukan file backup Duitku')
  const state = dariBaris(keBaris(j.data))
  return { state, jumlah: hitung(state), waktu: j.waktu || '' }
}

export async function simpanBerkas(teks, nama) {
  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const r = await Filesystem.writeFile({ path: nama, data: teks, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'Backup Duitku', files: [r.uri], dialogTitle: 'Simpan backup Duitku ke…' })
    return 'dibagikan'
  }
  const url = URL.createObjectURL(new Blob([teks], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'diunduh'
}
