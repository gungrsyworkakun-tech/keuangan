import assert from 'node:assert/strict'
import fs from 'node:fs'
import { validasiKatalog, bacaBuild, cariBerkas, statusApp, pesanGagal } from '../www/logika.js'

// katalog bawaan harus valid semua
const bawaan = JSON.parse(fs.readFileSync(new URL('../www/apps.json', import.meta.url), 'utf8'))
assert.equal(validasiKatalog(bawaan).length, bawaan.length, 'semua entri apps.json harus valid')

// entri aneh dibuang
const ok = { id: 'a', nama: 'A', repo: 'o/r', tag: 't', berkas: 'A.apk', paket: 'x.y' }
assert.equal(validasiKatalog([ok, { ...ok, id: 'b', repo: 'bukan repo' }, { ...ok, id: 'c', paket: 'x' }, { ...ok, id: 'd', berkas: '../A.apk' }, { ...ok, id: 'e', tag: 'a b' }, { ...ok }, null, 5]).length, 1)
assert.deepEqual(validasiKatalog('x'), [])

// nomor build
assert.equal(bacaBuild('APK rilis (...), build #15. Unduh Duitku.apk'), 15)
assert.equal(bacaBuild('Build # 7'), 7)
assert.equal(bacaBuild('tanpa nomor'), null)
assert.equal(bacaBuild(null), null)

// berkas rilis: hanya alamat github.com
const rilis = { assets: [{ name: 'Duitku.apk', browser_download_url: 'https://github.com/o/r/releases/download/t/Duitku.apk' }, { name: 'X.apk', browser_download_url: 'http://evil.com/X.apk' }] }
assert.equal(cariBerkas(rilis, 'Duitku.apk'), 'https://github.com/o/r/releases/download/t/Duitku.apk')
assert.equal(cariBerkas(rilis, 'X.apk'), '')
assert.equal(cariBerkas(rilis, 'Y.apk'), '')
assert.equal(cariBerkas(null, 'Y.apk'), '')

// perbandingan versi
assert.equal(statusApp({ terpasang: false }, 10), 'baru')
assert.equal(statusApp({ terpasang: true, kode: 9 }, 10), 'update')
assert.equal(statusApp({ terpasang: true, kode: 10 }, 10), 'terbaru')
assert.equal(statusApp({ terpasang: true, kode: 11 }, 10), 'terbaru')
assert.equal(statusApp({ terpasang: true, kode: 3 }, null), 'tidak-tahu')

assert.match(pesanGagal(7), /Hapus aplikasi lama/)
assert.match(pesanGagal(3), /dibatalkan/)
assert.match(pesanGagal(1, 'oops'), /oops/)
console.log('uji logika toko lulus')
