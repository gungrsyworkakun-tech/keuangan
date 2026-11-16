// Uji modul backup dengan "Google Sheets" tiruan di memori (tanpa internet)
import assert from 'node:assert/strict'
import { buatKlien, keBaris, dariBaris, kosong, TABEL, NAMA_FILE } from '../src/lib/sheets-backup.js'

const data = {
  transactions: [{ id: 't1', date: '2026-11-01', desc: '=HYPERLINK("http://x","klik")', amount: 15000, type: 'out', category: 'Makan', accountId: 'a1' }],
  accounts: [{ id: 'a1', name: 'BCA', balance: 1000000 }, { id: 'a2', name: 'GoPay', balance: 5000, jenis: 'ewallet' }],
  investments: [{ id: 'i1', name: 'Emas', type: 'Emas', invested: 1000000, value: 1100000, sumber: 'emasid', kode: 'antam', qty: 1.5 }, { id: 'i2', name: 'RD', type: 'Reksa dana', invested: 5, value: 6 }],
  goals: [{ id: 'g1', name: 'Liburan', target: 8000000, saved: 3000000, deadline: '2027-01-01' }],
  budgets: [{ category: 'Makan', limit: 500000 }],
  savings: [{ id: 's1', month: '2026-11', amount: 100000, note: '', pos: 'darurat' }, { id: 's2', month: 'target', amount: 5000000, note: '', pos: 'kesehatan' }],
}

// round trip murni
const bal = dariBaris(keBaris(data))
assert.deepEqual(bal.transactions, data.transactions)
assert.deepEqual(bal.accounts, data.accounts)           // kolom jenis kosong tidak muncul
assert.deepEqual(bal.investments, data.investments)     // qty kosong tidak muncul, 1.5 tetap
assert.deepEqual(bal.savings, data.savings)
assert.ok(kosong({}) && kosong({ accounts: [] }) && !kosong(data))

// Google tiruan
const files = new Map(); const sheetsData = new Map(); let panggilan = []; let token401Sekali = true
function respon(status, body) { return { ok: status < 300, status, json: async () => body } }
const fetcher = async (url, opsi = {}) => {
  panggilan.push((opsi.method || 'GET') + ' ' + url.split('?')[0].replace('https://', ''))
  assert.ok(opsi.headers.Authorization.startsWith('Bearer '))
  if (token401Sekali && url.includes('drive/v3/files')) { token401Sekali = false; return respon(401, { error: { message: 'expired' } }) }
  if (url.includes('drive/v3/files')) return respon(200, { files: [...files.keys()].map((id) => ({ id })).slice(0, 1) })
  if (url === 'https://sheets.googleapis.com/v4/spreadsheets' && opsi.method === 'POST') {
    const b = JSON.parse(opsi.body); assert.equal(b.properties.title, NAMA_FILE)
    const id = 'SHEET1'; files.set(id, b); sheetsData.set(id, {}); return respon(200, { spreadsheetId: id })
  }
  if (url.includes(':batchClear')) { const id = url.split('/spreadsheets/')[1].split('/')[0]; sheetsData.set(id, {}); return respon(200, {}) }
  if (url.includes(':batchUpdate') && url.includes('values')) {
    const id = url.split('/spreadsheets/')[1].split('/')[0]; const b = JSON.parse(opsi.body)
    assert.equal(b.valueInputOption, 'RAW')
    for (const d of b.data) sheetsData.get(id)[d.range.split('!')[0]] = d.values
    return respon(200, {})
  }
  if (url.includes('values:batchGet')) {
    const id = url.split('/spreadsheets/')[1].split('/')[0]; const nama = decodeURIComponent(url).match(/ranges=([^!&]+)!A:Z/g).map((x) => x.slice(7, -4))
    return respon(200, { valueRanges: nama.map((n) => ({ values: sheetsData.get(id)[n] || [] })) })
  }
  throw new Error('url tak dikenal ' + url)
}
const klien = buatKlien({ ambilToken: async () => 'tok', fetcher })

let id = await klien.cari(); assert.equal(id, '')              // belum ada (dan 401 diulang sekali)
assert.ok(!token401Sekali)
id = await klien.buat(); assert.equal(id, 'SHEET1')
await klien.tulis(id, data)
assert.equal(await klien.cari(), 'SHEET1')
const tersimpan = sheetsData.get(id)
assert.equal(tersimpan.Transaksi[1][2], '=HYPERLINK("http://x","klik")') // disimpan sebagai teks, bukan rumus (RAW)
assert.deepEqual(tersimpan.Transaksi[0], TABEL.transactions[1])
const pulih = await klien.baca(id)
assert.deepEqual(pulih, bal)

// tulis ulang setelah data berkurang: baris lama tidak tersisa
await klien.tulis(id, { ...data, transactions: [] })
assert.equal((await klien.baca(id)).transactions.length, 0)

// tab terhapus (400) -> dibuat ulang otomatis
let gagalSekali = true
const fetcher2 = async (url, opsi = {}) => {
  if (url.includes(':batchClear') && gagalSekali) { gagalSekali = false; return respon(400, { error: { message: 'Unable to parse range' } }) }
  if (url.includes('fields=sheets.properties.title')) return respon(200, { sheets: [{ properties: { title: 'Transaksi' } }] })
  if (url.includes(':batchUpdate') && !url.includes('values')) { assert.ok(JSON.parse(opsi.body).requests.length >= 5); return respon(200, {}) }
  return fetcher(url, opsi)
}
await buatKlien({ ambilToken: async () => 't', fetcher: fetcher2 }).tulis(id, data)
assert.ok(!gagalSekali)

// error Google dilaporkan jelas
await assert.rejects(buatKlien({ ambilToken: async () => 't', fetcher: async () => respon(403, { error: { message: 'API belum diaktifkan' } }) }).cari(), /API belum diaktifkan/)
console.log('SEMUA UJI LULUS (' + panggilan.length + ' panggilan Google tiruan)')
