// Logika murni (tanpa tampilan) supaya bisa diuji di Node.
export const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
export const PAKET_RE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/
const TAG_RE = /^[A-Za-z0-9_.-]{1,60}$/
const BERKAS_RE = /^[A-Za-z0-9_.-]{1,80}\.apk$/
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/

const teks = (v, maks, cadangan = '') => (typeof v === 'string' ? v.trim().slice(0, maks) : cadangan)

// Hanya entri yang lengkap dan bentuknya benar yang dipakai; yang aneh dibuang.
export function validasiKatalog(data) {
  if (!Array.isArray(data)) return []
  const lihat = new Set()
  const hasil = []
  for (const a of data) {
    if (!a || typeof a !== 'object') continue
    if (!ID_RE.test(a.id || '') || lihat.has(a.id)) continue
    if (!REPO_RE.test(a.repo || '') || !PAKET_RE.test(a.paket || '')) continue
    if (!TAG_RE.test(a.tag || '') || !BERKAS_RE.test(a.berkas || '')) continue
    lihat.add(a.id)
    hasil.push({ id: a.id, nama: teks(a.nama, 60, a.id) || a.id, deskripsi: teks(a.deskripsi, 200), repo: a.repo, tag: a.tag, berkas: a.berkas, paket: a.paket })
  }
  return hasil
}

// Nomor build dibaca dari catatan rilis: "... build #15 ..." (sama dengan versionCode aplikasinya)
export function bacaBuild(catatan) {
  const m = /build\s*#\s*(\d{1,9})/i.exec(String(catatan || ''))
  return m ? Number(m[1]) : null
}

export function cariBerkas(rilis, nama) {
  const a = ((rilis && rilis.assets) || []).find((x) => x && x.name === nama)
  const url = a && a.browser_download_url
  return typeof url === 'string' && /^https:\/\/github\.com\/[^\s]+$/.test(url) ? url : ''
}

// baru | update | terbaru | tidak-tahu
export function statusApp(pasang, build) {
  if (!pasang || !pasang.terpasang) return 'baru'
  if (build == null) return 'tidak-tahu'
  return build > Number(pasang.kode || 0) ? 'update' : 'terbaru'
}

export function pesanGagal(kode, pesan) {
  switch (Number(kode)) {
    case 3: return 'Pemasangan dibatalkan.'
    case 5:
    case 7: return 'Tidak cocok dengan aplikasi yang sudah terpasang (biasanya tanda tangannya beda). Hapus aplikasi lama dulu, lalu pasang lagi. Data aplikasi lama ikut terhapus.'
    case 6: return 'Ruang penyimpanan HP kurang.'
    case 2: return 'Pemasangan diblokir oleh HP. Cek pengaturan keamanan atau Play Protect.'
    case 4: return 'Berkas aplikasi tidak valid.'
    default: return 'Pemasangan gagal' + (pesan ? ' (' + String(pesan).slice(0, 120) + ')' : '') + '.'
  }
}
