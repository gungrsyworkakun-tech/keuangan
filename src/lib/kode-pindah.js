// Kode pindah HP: membungkus Link + Kunci Sheet jadi satu teks, supaya di HP baru cukup ditempel.
// Isinya RAHASIA (ada kuncinya). Data keuangan tidak ada di dalam kode; data diambil dari Sheet.
import { cekLink } from './sheets-script.js'

const AWAL = 'DUITKU1:'
const b64 = (s) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const dariB64 = (t) => {
  const bin = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function buatKode({ url, kunci }) {
  if (!cekLink(url) || !/^[A-Za-z0-9_-]{16,}$/.test(String(kunci || ''))) throw new Error('Link atau kunci tidak valid')
  return AWAL + b64(JSON.stringify({ u: url.trim(), k: kunci }))
}

export function bacaKode(teks) {
  const t = String(teks || '').replace(/\s+/g, '')
  const i = t.indexOf(AWAL)
  if (i < 0) throw new Error('Ini bukan kode pindah Duitku')
  let o
  try { o = JSON.parse(dariB64(t.slice(i + AWAL.length))) } catch { throw new Error('Kode rusak atau terpotong. Salin ulang dari HP lama') }
  if (!o || !cekLink(o.u) || !/^[A-Za-z0-9_-]{16,}$/.test(String(o.k || ''))) throw new Error('Isi kode tidak valid')
  return { url: o.u, kunci: o.k }
}
