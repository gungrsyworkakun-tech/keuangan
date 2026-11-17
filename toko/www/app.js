import { validasiKatalog, bacaBuild, cariBerkas, statusApp, pesanGagal } from './logika.js'

// Daftar aplikasi bisa diubah tanpa membangun ulang toko: file ini di GitHub dibaca dulu, kalau gagal dipakai yang ada di dalam aplikasi.
const KATALOG_JARAK_JAUH = 'https://raw.githubusercontent.com/gungrsyworkakun-tech/keuangan/main/toko/www/apps.json'
const Cap = window.Capacitor || {}
const Pemasang = (Cap.Plugins && Cap.Plugins.Pemasang) || (Cap.registerPlugin ? Cap.registerPlugin('Pemasang') : null)
const $ = (s) => document.querySelector(s)

const S = { apps: [], auto: false, menunggu: new Map(), sibuk: new Set(), progres: {}, info: {}, dicoba: new Set() }
try { S.auto = localStorage.getItem('gudang-auto') === '1' } catch {}

function el(tag, attr = {}, ...anak) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attr)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v) }
  for (const a of anak.flat()) if (a != null && a !== false) e.append(a.nodeType ? a : document.createTextNode(String(a)))
  return e
}

async function ambilJson(url, ms = 8000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms)
  try {
    const r = await fetch(url, { signal: c.signal, cache: 'no-store' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.json()
  } finally { clearTimeout(t) }
}

function pesan(teks, galat = false) {
  const p = $('#pesan'); p.textContent = teks || ''; p.hidden = !teks; p.className = galat ? 'galat' : ''
}

async function muatKatalog() {
  try { const k = validasiKatalog(await ambilJson(KATALOG_JARAK_JAUH, 6000)); if (k.length) return k } catch {}
  return validasiKatalog(await ambilJson('apps.json'))
}

async function periksa(app) {
  const h = { ...app, pasang: { terpasang: false, kode: 0, nama: '' }, build: null, url: '', galat: '' }
  try { if (Pemasang) h.pasang = await Pemasang.cekPaket({ paket: app.paket }) } catch {}
  try {
    const r = await ambilJson(`https://api.github.com/repos/${app.repo}/releases/tags/${app.tag}`)
    h.build = bacaBuild(r.body); h.url = cariBerkas(r, app.berkas)
  } catch { h.galat = 'Tidak bisa mengecek versi terbaru. Periksa internet.' }
  h.status = h.galat ? 'galat' : !h.url ? 'kosong' : statusApp(h.pasang, h.build)
  return h
}

async function segarkan() {
  const katalog = S.apps.length ? S.apps : (S.apps = await muatKatalog())
  const hasil = await Promise.all(katalog.map(periksa))
  S.hasil = hasil
  gambar()
  if (S.auto) await perbaruiSemua(true)
}

function lencana(a) {
  if (a.status === 'update') return el('span', { class: 'lencana update' }, 'Ada update')
  if (a.status === 'terbaru') return el('span', { class: 'lencana terbaru' }, 'Terbaru')
  if (a.status === 'baru') return el('span', { class: 'lencana' }, 'Belum dipasang')
  return null
}

// warna ikon dibuat dari id aplikasi supaya tiap aplikasi punya warna sendiri yang tetap
function warna(id) {
  const palet = [212, 262, 330, 18, 150, 190, 42, 285]
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const x = palet[h % palet.length]
  return `linear-gradient(135deg, hsl(${x} 72% 58%), hsl(${(x + 40) % 360} 72% 44%))`
}

function versi(a) {
  const potong = []
  potong.push(el('span', {}, a.pasang.terpasang ? ['Terpasang ', el('b', {}, 'build ' + a.pasang.kode)] : 'Belum terpasang'))
  if (a.build != null) potong.push(el('span', {}, ['Terbaru ', el('b', {}, 'build ' + a.build)]))
  return el('div', { class: 'versi' }, ...potong)
}

function kartu(a, i) {
  const sibuk = S.sibuk.has(a.id)
  const aksi = []
  if (sibuk) aksi.push(el('button', { class: 'tombol utama', disabled: true }, 'Sedang diproses…'))
  else {
    if (a.status === 'baru') aksi.push(el('button', { class: 'tombol utama', onclick: () => pasang(a) }, 'Pasang'))
    if (a.status === 'update') aksi.push(el('button', { class: 'tombol utama', onclick: () => pasang(a) }, 'Perbarui'))
    if (a.status === 'tidak-tahu') aksi.push(el('button', { class: 'tombol utama', onclick: () => pasang(a) }, 'Pasang ulang'))
    if (a.pasang.terpasang) aksi.push(el('button', { class: 'tombol', onclick: () => buka(a) }, 'Buka'))
    if (a.status === 'galat' || a.status === 'kosong') aksi.push(el('button', { class: 'tombol', onclick: () => segarkan() }, 'Coba lagi'))
  }
  const p = S.progres[a.id]
  return el('li', { class: 'kartu', style: `--i:${i}` },
    el('div', { class: 'kepala' },
      el('div', { class: 'ikon-app', style: `background:${warna(a.id)}`, 'aria-hidden': 'true' }, (a.nama[0] || '?').toUpperCase()),
      el('div', { class: 'judul' }, el('h2', {}, a.nama, lencana(a)), a.deskripsi ? el('p', { class: 'desk' }, a.deskripsi) : null)),
    versi(a),
    a.galat ? el('p', { class: 'info galat' }, a.galat) : null,
    a.status === 'kosong' ? el('p', { class: 'info galat' }, 'Berkas aplikasi belum ada di halaman rilis.') : null,
    p != null ? el('div', { class: 'progres' }, el('div', { style: `width:${p}%` })) : null,
    S.info[a.id] ? el('p', { class: 'info' + (S.info[a.id].galat ? ' galat' : '') }, S.info[a.id].teks) : null,
    aksi.length ? el('div', { class: 'aksi' }, ...aksi) : null)
}

function rangka() {
  return el('li', { class: 'kartu rangka', 'aria-hidden': 'true' },
    el('div', { class: 'kepala' }, el('div', { class: 'ikon-app blok', style: 'box-shadow:none' }), el('div', { class: 'judul', style: 'flex:1' }, el('div', { class: 'blok', style: 'height:16px;width:55%' }), el('div', { class: 'blok', style: 'height:12px;width:85%;margin-top:8px' }))),
    el('div', { class: 'blok', style: 'height:30px;width:70%;margin-top:14px' }))
}

function gambar() {
  const hasil = S.hasil || []
  $('#daftar').replaceChildren(...hasil.map(kartu))
  $('#auto').checked = S.auto
  const upd = hasil.filter((x) => x.status === 'update').length
  $('#ringkas').textContent = !hasil.length ? 'Memuat daftar…' : upd ? `${hasil.length} aplikasi · ${upd} punya versi baru` : `${hasil.length} aplikasi · semua sudah terbaru`
  $('#banner').hidden = S.auto || upd === 0
  $('#banner-teks').textContent = `${upd} aplikasi punya versi baru`
}

async function izinAda() {
  if (!Pemasang) return false
  try { return (await Pemasang.izinPasang()).diizinkan } catch { return false }
}

function selesaiApp(a, teks, galat) {
  S.sibuk.delete(a.id); delete S.progres[a.id]; S.info[a.id] = { teks, galat }
  const tunggu = S.menunggu.get(a.paket); if (tunggu) { S.menunggu.delete(a.paket); tunggu(!galat) }
  gambar()
}

async function pasang(a) {
  if (!Pemasang) return pesan('Fitur ini hanya jalan di aplikasi Android.', true)
  if (S.sibuk.has(a.id)) return false
  if (!(await izinAda())) { $('#izin').hidden = false; return false }
  $('#izin').hidden = true; pesan('')
  S.sibuk.add(a.id); S.progres[a.id] = 0; S.info[a.id] = { teks: 'Mengunduh…' }; gambar()
  const selesai = new Promise((res) => { S.menunggu.set(a.paket, res); setTimeout(() => { if (S.menunggu.get(a.paket) === res) selesaiApp(a, 'Tidak ada kabar dari pemasang. Tekan "Cek lagi".', true) }, 10 * 60 * 1000) })
  try { await Pemasang.unduhDanPasang({ paket: a.paket, url: a.url }) }
  catch (e) {
    if (String(e && e.message) === 'izin') $('#izin').hidden = false
    selesaiApp(a, String(e && e.message) === 'izin' ? 'Izin memasang belum dinyalakan.' : 'Gagal: ' + ((e && e.message) || 'tidak diketahui'), true)
  }
  return selesai
}

async function perbaruiSemua(otomatis = false) {
  if (S.lari) return // satu proses perbarui pada satu waktu
  S.lari = true
  try {
    for (const a of (S.hasil || []).filter((x) => x.status === 'update')) {
      const kunci = a.id + '#' + a.build
      if (otomatis && S.dicoba.has(kunci)) continue // satu kali per versi supaya tidak mengulang terus
      S.dicoba.add(kunci)
      if (!(await pasang(a))) break
    }
  } finally { S.lari = false }
}

async function buka(a) {
  try { await Pemasang.bukaAplikasi({ paket: a.paket }) } catch { pesan('Aplikasi tidak bisa dibuka.', true) }
}

function pasangEvent() {
  if (!Pemasang || !Pemasang.addListener) return
  Pemasang.addListener('progres', (e) => {
    const a = (S.hasil || []).find((x) => x.paket === e.paket); if (!a) return
    S.progres[a.id] = e.persen; S.info[a.id] = { teks: e.persen < 100 ? `Mengunduh ${e.persen}%` : 'Memasang…' }; gambar()
  })
  Pemasang.addListener('status', (e) => {
    const a = (S.hasil || []).find((x) => x.paket === e.paket); if (!a) return
    if (e.status === 'menunggu') { S.info[a.id] = { teks: 'Tekan "Pasang" di layar yang muncul.' }; delete S.progres[a.id]; gambar() }
    else if (e.status === 'sukses') { selesaiApp(a, 'Berhasil dipasang.', false); segarkan() }
    else selesaiApp(a, pesanGagal(e.kode, e.pesan), true)
  })
}

async function mulai() {
  $('#auto').addEventListener('change', (e) => { S.auto = e.target.checked; try { localStorage.setItem('gudang-auto', S.auto ? '1' : '0') } catch {}; segarkan() })
  $('#btn-segarkan').addEventListener('click', () => { pesan(''); segarkan() })
  $('#btn-semua').addEventListener('click', () => perbaruiSemua(false))
  $('#btn-izin').addEventListener('click', () => Pemasang && Pemasang.mintaIzin())
  document.addEventListener('visibilitychange', async () => { if (!document.hidden) { if (await izinAda()) $('#izin').hidden = true; if (S.sibuk.size === 0) segarkan() } })
  $('#catatan').textContent = Pemasang ? '' : 'Mode contoh: dibuka di browser, pemasangan tidak aktif.'
  $('#btn-nanti').addEventListener('click', () => { $('#izin').hidden = true })
  $('#izin').addEventListener('click', (e) => { if (e.target.id === 'izin') $('#izin').hidden = true })
  $('#daftar').replaceChildren(rangka(), rangka())
  pasangEvent()
  try { await segarkan() } catch { $('#daftar').replaceChildren(); $('#ringkas').textContent = 'Daftar tidak termuat'; pesan('Daftar aplikasi tidak bisa dimuat. Periksa internet lalu tekan "Cek lagi".', true) }
}
mulai()
