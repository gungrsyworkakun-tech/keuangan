// Uji logika store (tabungan otomatis, anggaran pemasukan): store.js dibundel dulu dengan esbuild karena memakai import.meta.env
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
const masuk = fileURLToPath(new URL('../src/lib/store.js', import.meta.url))
const keluar = fileURLToPath(new URL('./.store-bundel.mjs', import.meta.url))
await build({ entryPoints: [masuk], bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' }, outfile: keluar, external: ['react'], logLevel: 'error' })
const { reducer, daftarKategori } = await import(keluar)
fs.rmSync(keluar, { force: true })
const base = { accounts: [], transactions: [], investments: [], goals: [], budgets: [], savings: [] }
// bulan yang sudah diisi tidak ditimpa
let s = { ...base, savings: [{ id: 'x', month: '2026-09', amount: 111, note: '', pos: 'darurat' }, { id: 'y', month: '2026-10', amount: -50, note: 'pakai', pos: 'darurat' }] }
s = reducer(s, { type: 'addOtomatis', pos: 'darurat', name: 'BCA ATM', amount: 500000, from: '2026-08', sekarang: '2026-11' })
const bulan = s.savings.filter((x) => /^\d{4}/.test(x.month) && x.amount > 0).map((x) => x.month + ':' + x.amount).sort()
assert.deepEqual(bulan, ['2026-08:500000', '2026-09:111', '2026-10:500000', '2026-11:500000'])
// jalan lagi di bulan yang sama: tidak berubah
assert.equal(reducer(s, { type: 'jalankanOtomatis', sekarang: '2026-11' }), s)
// bulan depan terisi; bulan yang sengaja dihapus sebelumnya tidak diisi ulang
s = reducer(s, { type: 'deleteSaving', id: s.savings.find((x) => x.month === '2026-10' && x.amount > 0).id })
s = reducer(s, { type: 'jalankanOtomatis', sekarang: '2027-01' })
const b2 = s.savings.filter((x) => /^\d{4}/.test(x.month) && x.amount > 0).map((x) => x.month).sort()
assert.deepEqual(b2, ['2026-08', '2026-09', '2026-11', '2026-12', '2027-01'])
// mulai di masa depan: belum mengisi apa pun, nanti terisi
let f = reducer({ ...base }, { type: 'addOtomatis', pos: 'kesehatan', name: 'X|Y', amount: 100, from: '2026-12', sekarang: '2026-11' })
assert.equal(f.savings.filter((x) => /^\d{4}/.test(x.month)).length, 0)
f = reducer(f, { type: 'jalankanOtomatis', sekarang: '2026-12' })
assert.deepEqual(f.savings.filter((x) => /^\d{4}/.test(x.month)).map((x) => x.month), ['2026-12'])
// satu aturan per jenis
const dua = reducer(s, { type: 'addOtomatis', pos: 'darurat', name: 'Mandiri', amount: 1, from: '2027-02', sekarang: '2027-01' })
assert.equal(dua.savings.filter((x) => x.month === 'otomatis').length, 1)
// anggaran: pemasukan dan pengeluaran dengan nama sama tidak bentrok
let g = reducer(base, { type: 'setBudget', category: 'Gaji', limit: 100 })
g = reducer(g, { type: 'setBudget', tipe: 'in', category: 'Gaji', limit: 5000 })
assert.deepEqual(g.budgets, [{ category: 'Gaji', limit: 100 }, { category: 'Gaji', limit: 5000, tipe: 'in' }])
g = reducer(g, { type: 'updateBudget', tipe: 'in', category: 'Gaji', patch: { category: 'Gaji pokok', limit: 6000 } })
assert.deepEqual(g.budgets.find((b) => b.tipe === 'in'), { category: 'Gaji pokok', limit: 6000, tipe: 'in' })
assert.equal(g.budgets.find((b) => !b.tipe).limit, 100)
assert.ok(daftarKategori(g, 'in').includes('Gaji pokok')); assert.ok(!daftarKategori(g, 'out').includes('Gaji pokok'))
g = reducer(g, { type: 'deleteBudget', tipe: 'in', category: 'Gaji pokok' })
assert.deepEqual(g.budgets, [{ category: 'Gaji', limit: 100 }])
console.log('uji reducer lulus')
