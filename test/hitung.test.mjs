import assert from 'node:assert/strict'
import { periodeGajian, sisaHarian, kalenderBulan, setoranDiperlukan, bulanTercapai, proyeksi, ringkasRiwayat, geserBulanKey } from '../src/lib/hitung.js'

// periode anggaran
assert.deepEqual(periodeGajian('2026-11-18', 1), { mulai: '2026-11-01', akhir: '2026-11-30' })
assert.deepEqual(periodeGajian('2026-11-18', 25), { mulai: '2026-10-25', akhir: '2026-11-24' })
assert.deepEqual(periodeGajian('2026-11-25', 25), { mulai: '2026-11-25', akhir: '2026-12-24' })
assert.deepEqual(periodeGajian('2026-01-10', 25), { mulai: '2025-12-25', akhir: '2026-01-24' }) // lintas tahun
assert.deepEqual(periodeGajian('2026-12-30', 1), { mulai: '2026-12-01', akhir: '2026-12-31' })
assert.deepEqual(periodeGajian('2026-02-10', 99), { mulai: '2026-01-28', akhir: '2026-02-27' }) // tanggal dibatasi 28

// sisa uang harian
const budgets = [{ category: 'Makan', limit: 900000 }, { category: 'Transport', limit: 300000 }, { category: 'Gaji', limit: 5000000, tipe: 'in' }]
const tx = [
  { date: '2026-11-02', type: 'out', category: 'Makan', amount: 200000 },
  { date: '2026-11-10', type: 'out', category: 'Transport', amount: 100000 },
  { date: '2026-11-18', type: 'out', category: 'Makan', amount: 20000 }, // hari ini
  { date: '2026-11-05', type: 'out', category: 'Hiburan', amount: 999999 }, // tanpa anggaran: tidak dihitung
  { date: '2026-11-06', type: 'out', category: 'Transfer', amount: 999999 },
  { date: '2026-11-07', type: 'in', category: 'Gaji', amount: 5000000 },
  { date: '2026-10-30', type: 'out', category: 'Makan', amount: 999999 }, // periode lalu
]
const s = sisaHarian({ budgets, transactions: tx, hari: '2026-11-18', gajian: 1 })
assert.equal(s.total, 1200000); assert.equal(s.terpakai, 320000); assert.equal(s.sisa, 880000)
assert.equal(s.sisaHari, 13) // 18..30 November
assert.equal(s.batas, Math.floor((1200000 - 300000) / 13)) // sisa sebelum pengeluaran hari ini / 13
assert.equal(s.pakaiHariIni, 20000); assert.equal(s.sisaHariIni, s.batas - 20000)
assert.equal(sisaHarian({ budgets: [{ category: 'Gaji', limit: 1, tipe: 'in' }], transactions: [], hari: '2026-11-18' }).ada, false)
const lewat = sisaHarian({ budgets: [{ category: 'Makan', limit: 100000 }], transactions: [{ date: '2026-11-18', type: 'out', category: 'Makan', amount: 500000 }], hari: '2026-11-30' })
assert.equal(lewat.batas, 0); assert.equal(lewat.sisa, -400000); assert.equal(lewat.sisaHari, 1)

// kalender
const k = kalenderBulan([...tx, { date: '2026-11-18', type: 'in', category: 'Gaji', amount: 10 }], '2026-11')
assert.equal(k.jumlah, 30); assert.equal(k.mulaiHari, 6) // 1 Nov 2026 hari Minggu -> kolom ke-7
assert.equal(k.hari[17].keluar, 20000); assert.equal(k.hari[17].masuk, 10); assert.equal(k.hari[5].n, 1); assert.equal(k.hari[5].keluar, 0) // transfer terhitung n tapi bukan keluar
assert.equal(k.totalMasuk, 5000010); assert.equal(k.maksKeluar, 999999)
assert.equal(kalenderBulan([], '2028-02').jumlah, 29)
assert.equal(geserBulanKey('2026-12', 1), '2027-01'); assert.equal(geserBulanKey('2026-01', -1), '2025-12')

// simulasi target
assert.equal(setoranDiperlukan({ target: 12000000, bulan: 12 }), 1000000)
assert.equal(setoranDiperlukan({ target: 12000000, awal: 2000000, bulan: 10 }), 1000000)
const dgBunga = setoranDiperlukan({ target: 12000000, bulan: 12, bungaTahun: 12 })
assert.ok(dgBunga > 900000 && dgBunga < 1000000, String(dgBunga))
assert.ok(Math.abs(proyeksi({ setoran: dgBunga, bungaTahun: 12, bulan: 12 }).pop() - 12000000) < 1) // konsisten dengan proyeksi
assert.equal(setoranDiperlukan({ target: 1000, awal: 5000, bulan: 6, bungaTahun: 5 }), 0) // sudah cukup
assert.equal(bulanTercapai({ target: 12000000, setoran: 1000000 }), 12)
assert.equal(bulanTercapai({ target: 12000000, awal: 12000000, setoran: 0 }), 0)
assert.equal(bulanTercapai({ target: 12000000, setoran: 0 }), null)
assert.equal(bulanTercapai({ target: 1e12, setoran: 1000 }), null)
assert.ok(bulanTercapai({ target: 12000000, setoran: 900000, bungaTahun: 12 }) < 14)

// riwayat harga
const r = ringkasRiwayat([{ t: '2026-11-10', p: 2000000 }, { t: '2026-11-01', p: 1900000 }, { t: '2026-10-01', p: 1800000 }, { t: 'rusak', p: 5 }, { t: '2026-11-15', p: 0 }], 30, '2026-11-18')
assert.deepEqual(r.data.map((x) => x.t), ['2026-10-19'.slice(0, 0) + '2026-11-01', '2026-11-10'])
assert.equal(r.awal, 1900000); assert.equal(r.akhir, 2000000); assert.equal(r.tertinggi, 2000000); assert.ok(Math.abs(r.persen - 5.263) < 0.01)
assert.equal(ringkasRiwayat([{ t: '2026-10-01', p: 1 }], 0, '2026-11-18').data.length, 1)
assert.equal(ringkasRiwayat([], 30, '2026-11-18').ada, false)
console.log('uji hitungan lulus')
