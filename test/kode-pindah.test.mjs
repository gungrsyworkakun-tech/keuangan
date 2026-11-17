import assert from 'node:assert/strict'
import { buatKode, bacaKode } from '../src/lib/kode-pindah.js'
const c = { url: 'https://script.google.com/macros/s/AKfycbxABC_def-123/exec', kunci: 'kunciRahasia234Panjang' }
const k = buatKode(c)
assert.ok(k.startsWith('DUITKU1:')); assert.ok(!/[+/=\s]/.test(k.slice(8)))
assert.deepEqual(bacaKode(k), c)
assert.deepEqual(bacaKode('  Kode saya:\n' + k.slice(0, 20) + '\n' + k.slice(20) + ' \n'), c) // spasi/baris baru hasil salin-tempel
assert.throws(() => bacaKode('halo'), /bukan kode/)
assert.throws(() => bacaKode(k.slice(0, 30)), /rusak|tidak valid/)
assert.throws(() => buatKode({ url: 'https://evil.com/x', kunci: c.kunci }), /tidak valid/)
assert.throws(() => buatKode({ url: c.url, kunci: 'pendek' }), /tidak valid/)
const jahat = 'DUITKU1:' + Buffer.from(JSON.stringify({ u: 'https://evil.com/macros/s/a/exec', k: c.kunci })).toString('base64url')
assert.throws(() => bacaKode(jahat), /tidak valid/) // kode buatan orang lain tidak boleh mengarah ke server selain Apps Script
console.log('uji kode pindah lulus')
