// Uji jalur "Link + Kunci": menjalankan skrip Apps Script asli (apps-script/Backup.gs) dengan Google tiruan
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
import { buatKlienScript, cekLink, bacaConfig, simpanConfig } from '../src/lib/sheets-script.js'

const KUNCI = 'kunci-rahasia-panjang-123'
function jalankan(kodeAwal) {
  const lembar = {}, rumus = []
  const buat = () => {
    let nilai = [], fmt = {}
    return {
      clearContents() { nilai = [] }, getLastRow: () => nilai.length,
      getRange(r, c, nr, nc) {
        return {
          setNumberFormat(f) { for (let i = 0; i < nr; i++) fmt[(r + i) + ',' + c] = f },
          setValues(v) { v.forEach((baris, i) => { nilai[r - 1 + i] = baris.map((x, j) => { if (typeof x === 'string' && x.startsWith('=') && fmt[(r + i) + ',' + (c + j)] !== '@') { rumus.push(x) } return x }) }) },
          setFontWeight() { return this },
          getValues: () => nilai.slice(r - 1, r - 1 + nr).map((b) => b.slice(c - 1, c - 1 + nc)),
        }
      },
    }
  }
  const ctx = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => lembar[n], insertSheet: (n) => (lembar[n] = buat()) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    JSON, Date, Array, Object, Number, String, Math,
  })
  vm.runInContext(kodeAwal, ctx)
  const doPost = vm.runInContext('doPost', ctx)
  const fetcher = async (_u, o) => { const out = doPost({ postData: { contents: o.body } }); return { json: async () => JSON.parse(out.s) } }
  return { fetcher, rumus }
}
const asli = fs.readFileSync(new URL('../apps-script/Backup.gs', import.meta.url), 'utf8')
const { fetcher, rumus } = jalankan(asli.replace("'GANTI-INI-DENGAN-KATA-RAHASIA-PANJANG'", `'${KUNCI}'`))
const URL_OK = 'https://script.google.com/macros/s/AKfycbxABC_def-123/exec'
const klien = (kunci) => buatKlienScript({ ambil: () => ({ url: URL_OK, kunci }), fetcher })

// tautan hanya boleh ke Apps Script milik Google
assert.equal(cekLink(URL_OK), true)
for (const x of ['https://evil.com/macros/s/abc/exec', 'http://script.google.com/macros/s/abc/exec', 'https://script.google.com.evil.com/macros/s/abc/exec', '', 'https://script.google.com/macros/s/abc/dev']) assert.equal(cekLink(x), false, x)

assert.equal(await klien(KUNCI).cari(), 'script')
await assert.rejects(() => klien('kunci-salah-salah-1234').cari(), /Kunci salah/)

const state = { accounts: [{ id: 'a1', name: 'BCA', balance: 1500000, jenis: 'bank' }], transactions: [{ id: 't1', date: '2026-11-01', desc: '=HYPERLINK("http://x","klik")', amount: 25000, type: 'out', category: 'Makan', accountId: 'a1' }], investments: [], goals: [], budgets: [{ category: 'Makan', limit: 900000 }], savings: [] }
await klien(KUNCI).tulis('script', state)
assert.deepEqual(rumus, [], 'isi yang diawali = tidak boleh jadi rumus')
const balik = await klien(KUNCI).baca('script')
assert.deepEqual(balik.transactions, state.transactions)
assert.deepEqual(balik.accounts, state.accounts)
assert.deepEqual(balik.budgets, state.budgets)

// skrip dengan kunci bawaan yang belum diganti menolak bekerja
const belum = jalankan(asli)
await assert.rejects(() => buatKlienScript({ ambil: () => ({ url: URL_OK, kunci: 'GANTI-INI-DENGAN-KATA-RAHASIA-PANJANG' }), fetcher: belum.fetcher }).cari(), /belum diganti/)

// config tersimpan hanya kalau link benar
const peti = {}; const mem = { getItem: (k) => peti[k] ?? null, setItem: (k, v) => { peti[k] = v }, removeItem: (k) => { delete peti[k] } }
simpanConfig({ url: URL_OK, kunci: KUNCI }, mem)
assert.equal(bacaConfig(mem).kunci, KUNCI)
peti['duitku-sheet'] = JSON.stringify({ url: 'https://evil.com/x', kunci: KUNCI })
assert.equal(bacaConfig(mem), null)
console.log('uji Link+Kunci lulus (skrip Backup.gs dijalankan dengan Sheets tiruan)')

// --- akun lokal ---
const simpan = {}
globalThis.localStorage = { getItem: (k) => simpan[k] ?? null, setItem: (k, v) => { simpan[k] = String(v) }, removeItem: (k) => { delete simpan[k] }, key: (i) => Object.keys(simpan)[i], get length() { return Object.keys(simpan).length } }
Object.defineProperty(globalThis.localStorage, 'keys', { value: () => Object.keys(simpan) })
const al = await import('../src/lib/akun-lokal.js')
assert.equal(al.adaAkun(), false)
await assert.rejects(() => al.buatAkun('ab', 'password1'), /minimal 3/)
await assert.rejects(() => al.buatAkun('budi', '123'), /minimal 6/)
await al.buatAkun('Budi', 'rahasia123')
assert.equal(JSON.stringify(simpan).includes('rahasia123'), false, 'password asli tidak boleh tersimpan')
assert.equal(await al.cekAkun('budi', 'rahasia123'), true)
assert.equal(await al.cekAkun('budi', 'salah-salah'), false)
assert.equal(await al.cekAkun('orang', 'rahasia123'), false)
console.log('uji akun lokal lulus')
