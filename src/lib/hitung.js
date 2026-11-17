// Hitungan murni (tanpa tampilan) untuk: sisa uang harian, kalender, simulasi target, riwayat harga.
const HARI_MS = 86400000
const nomorHari = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / HARI_MS
const tglDariNomor = (n) => new Date(n * HARI_MS).toISOString().slice(0, 10)
const bukanTransfer = (t) => t.category !== 'Transfer'

export const geserBulanKey = (key, n) => {
  const [y, m] = key.split('-').map(Number)
  const i = y * 12 + m - 1 + n
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
}

/** Periode anggaran yang berlaku di tanggal `hari`. gajian = tanggal mulai (1 = awal bulan). */
export function periodeGajian(hari, gajian = 1) {
  const g = Math.min(28, Math.max(1, Math.floor(Number(gajian)) || 1))
  const y = +hari.slice(0, 4), m = +hari.slice(5, 7), d = +hari.slice(8, 10)
  const pada = (yy, mm) => new Date(Date.UTC(yy, mm - 1, g)).toISOString().slice(0, 10)
  const mulai = d >= g ? pada(y, m) : pada(y, m - 1)
  const berikut = d >= g ? pada(y, m + 1) : pada(y, m)
  return { mulai, akhir: tglDariNomor(nomorHari(berikut) - 1) }
}

/** Uang yang boleh dipakai per hari = sisa anggaran pengeluaran / jumlah hari tersisa (termasuk hari ini). */
export function sisaHarian({ budgets = [], transactions = [], hari, gajian = 1 }) {
  const { mulai, akhir } = periodeGajian(hari, gajian)
  const out = budgets.filter((b) => b.tipe !== 'in' && b.limit > 0)
  if (!out.length) return { ada: false, mulai, akhir }
  const kat = new Set(out.map((b) => b.category))
  const total = out.reduce((a, b) => a + b.limit, 0)
  const tx = transactions.filter((t) => t.type === 'out' && bukanTransfer(t) && kat.has(t.category) && t.date >= mulai && t.date <= akhir)
  const terpakai = tx.reduce((a, t) => a + t.amount, 0)
  const pakaiHariIni = tx.filter((t) => t.date === hari).reduce((a, t) => a + t.amount, 0)
  const sisaHari = Math.max(1, nomorHari(akhir) - nomorHari(hari) + 1)
  const awalHariIni = total - (terpakai - pakaiHariIni) // sisa sebelum pengeluaran hari ini
  const batas = Math.max(0, Math.floor(awalHariIni / sisaHari))
  return { ada: true, total, terpakai, sisa: total - terpakai, sisaHari, batas, pakaiHariIni, sisaHariIni: batas - pakaiHariIni, mulai, akhir }
}

/** Data kalender satu bulan. Senin = kolom pertama. Transfer tidak dihitung sebagai masuk/keluar. */
export function kalenderBulan(transactions, key) {
  const [y, m] = key.split('-').map(Number)
  const jumlah = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mulaiHari = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const hari = Array.from({ length: jumlah }, (_, i) => ({ tgl: `${key}-${String(i + 1).padStart(2, '0')}`, masuk: 0, keluar: 0, n: 0 }))
  for (const t of transactions) {
    if (t.date.slice(0, 7) !== key) continue
    const h = hari[+t.date.slice(8, 10) - 1]
    if (!h) continue
    h.n++
    if (!bukanTransfer(t)) continue
    if (t.type === 'in') h.masuk += t.amount; else h.keluar += t.amount
  }
  return {
    hari, mulaiHari, jumlah,
    totalMasuk: hari.reduce((a, h) => a + h.masuk, 0),
    totalKeluar: hari.reduce((a, h) => a + h.keluar, 0),
    maksKeluar: Math.max(0, ...hari.map((h) => h.keluar)),
  }
}

const bungaBulanan = (bungaTahun) => Math.pow(1 + Math.max(0, Number(bungaTahun) || 0) / 100, 1 / 12) - 1

/** Setoran per bulan supaya mencapai target dalam `bulan` bulan (setoran di akhir tiap bulan). */
export function setoranDiperlukan({ target, awal = 0, bulan, bungaTahun = 0 }) {
  const n = Math.max(1, Math.round(bulan)), r = bungaBulanan(bungaTahun)
  const tumbuh = awal * Math.pow(1 + r, n)
  if (target <= tumbuh) return 0
  if (r === 0) return (target - awal) / n
  return ((target - tumbuh) * r) / (Math.pow(1 + r, n) - 1)
}

/** Jumlah bulan sampai target tercapai dengan setoran tetap; null kalau tidak akan tercapai dalam 100 tahun. */
export function bulanTercapai({ target, awal = 0, setoran, bungaTahun = 0 }) {
  if (awal >= target) return 0
  const r = bungaBulanan(bungaTahun)
  let saldo = awal
  for (let n = 1; n <= 1200; n++) {
    saldo = saldo * (1 + r) + Math.max(0, setoran || 0)
    if (saldo >= target) return n
  }
  return null
}

/** Saldo di akhir tiap bulan (indeks 0 = sekarang). */
export function proyeksi({ awal = 0, setoran = 0, bungaTahun = 0, bulan }) {
  const r = bungaBulanan(bungaTahun), hasil = [awal]
  let saldo = awal
  for (let n = 1; n <= bulan; n++) { saldo = saldo * (1 + r) + Math.max(0, setoran); hasil.push(saldo) }
  return hasil
}

/** Ringkasan deret harga [{t:'YYYY-MM-DD', p}] untuk periode terakhir `hari` hari (0 = semua). */
export function ringkasRiwayat(titik, hari, sekarang) {
  const ok = (titik || []).filter((x) => x && x.p > 0 && /^\d{4}-\d{2}-\d{2}$/.test(x.t)).sort((a, b) => a.t.localeCompare(b.t))
  const batas = hari > 0 ? tglDariNomor(nomorHari(sekarang) - hari) : ''
  const data = ok.filter((x) => x.t >= batas)
  if (!data.length) return { data: [], ada: false }
  const harga = data.map((x) => x.p)
  const awal = data[0].p, akhir = data[data.length - 1].p
  return { ada: true, data, awal, akhir, tertinggi: Math.max(...harga), terendah: Math.min(...harga), ubah: akhir - awal, persen: awal ? ((akhir - awal) / awal) * 100 : 0 }
}
