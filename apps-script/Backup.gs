/**
 * DUITKU - Penampung backup di Google Sheets milikmu.
 * Cara pasang (sekitar 5 menit): lihat bagian "Sheet" di PANDUAN-ANDROID.md atau panduan di dalam aplikasi.
 *
 * Kalau skrip ini disalin dari aplikasi Duitku (tombol "Salin skrip"), kuncinya sudah terisi otomatis.
 * Kalau disalin dari tempat lain, ganti KUNCI_RAHASIA di bawah dengan kata rahasia panjang (minimal 16 huruf/angka).
 *
 * Fungsi: menyimpan salinan data (Transaksi, Rekening, dst.) dan mengambil harga emas/kripto/saham.
 *
 * 1) Deploy > Deployment baru > Aplikasi web: Jalankan sebagai "Saya", akses "Siapa saja".
 * 2) Tempel link /exec (dan kunci, kalau diganti manual) di aplikasi Duitku, menu Profil.
 */
const KUNCI_RAHASIA = 'GANTI-INI-DENGAN-KATA-RAHASIA-PANJANG';

const TABEL = {
  Transaksi: ['id', 'date', 'desc', 'amount', 'type', 'category', 'accountId'],
  Rekening:  ['id', 'name', 'balance', 'jenis'],
  Investasi: ['id', 'name', 'type', 'invested', 'value', 'sumber', 'kode', 'qty'],
  Goal:      ['id', 'name', 'target', 'saved', 'deadline'],
  Anggaran:  ['category', 'limit', 'tipe'],
  Tabungan:  ['id', 'month', 'amount', 'note', 'pos'],
};
const KOLOM_ANGKA = { amount: 1, balance: 1, invested: 1, value: 1, target: 1, saved: 1, limit: 1, qty: 1 };
const VERSI = 2; // 2 = Anggaran punya kolom 'tipe' (pemasukan/pengeluaran)
const MAKS_BARIS = 5000;
const MAKS_BYTE = 2000000;

function doGet() { return keluar_({ ok: true, app: 'duitku-backup' }); }

function doPost(e) {
  let kunci = null;
  try {
    if (KUNCI_RAHASIA.length < 16 || KUNCI_RAHASIA.indexOf('GANTI-INI') === 0) {
      return keluar_({ ok: false, error: 'Kunci di skrip belum diganti' });
    }
    const mentah = (e && e.postData && e.postData.contents) || '';
    if (mentah.length > MAKS_BYTE) return keluar_({ ok: false, error: 'Data terlalu besar' });
    const m = JSON.parse(mentah);
    if (!samaAman_(String(m.kunci || ''), KUNCI_RAHASIA)) return keluar_({ ok: false, error: 'Kunci salah' });
    if (m.aksi === 'tes') return keluar_({ ok: true, versi: VERSI });
    if (m.aksi === 'harga') return keluar_(ambilHarga_(m.data, m.segar === true));
    kunci = LockService.getScriptLock();
    kunci.waitLock(20000);
    if (m.aksi === 'baca') return keluar_({ ok: true, data: baca_() });
    if (m.aksi === 'tulis') { tulis_(m.data); return keluar_({ ok: true, waktu: new Date().toISOString() }); }
    return keluar_({ ok: false, error: 'Perintah tidak dikenal' });
  } catch (err) {
    return keluar_({ ok: false, error: 'Gagal: ' + ((err && err.message) || err) });
  } finally {
    if (kunci) { try { kunci.releaseLock(); } catch (x) {} }
  }
}

function keluar_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// perbandingan yang tidak membocorkan seberapa dekat tebakan
function samaAman_(a, b) {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

function tulis_(data) {
  if (!data || typeof data !== 'object') throw new Error('Data kosong');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABEL).forEach(function (nama) {
    const kolom = TABEL[nama];
    const rows = Array.isArray(data[nama]) ? data[nama].slice(1, MAKS_BARIS + 1) : [];
    const sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    sh.clearContents();
    const isi = [kolom].concat(rows.map(function (r) {
      return kolom.map(function (c, i) {
        const v = Array.isArray(r) ? r[i] : '';
        if (KOLOM_ANGKA[c]) return Number(v) || 0;
        return String(v === undefined || v === null ? '' : v).slice(0, 200);
      });
    }));
    // kolom teks dipaksa jadi teks biasa supaya isi seperti "=RUMUS(...)" tidak pernah dijalankan
    kolom.forEach(function (c, j) {
      sh.getRange(1, j + 1, isi.length, 1).setNumberFormat(KOLOM_ANGKA[c] ? '0.########' : '@');
    });
    sh.getRange(1, 1, isi.length, kolom.length).setValues(isi);
    sh.getRange(1, 1, 1, kolom.length).setFontWeight('bold');
  });
}

function baca_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hasil = {};
  Object.keys(TABEL).forEach(function (nama) {
    const kolom = TABEL[nama];
    const sh = ss.getSheetByName(nama);
    const n = sh ? Math.min(sh.getLastRow(), MAKS_BARIS + 1) : 0;
    const nilai = n > 0 ? sh.getRange(1, 1, n, kolom.length).getValues() : [kolom];
    hasil[nama] = nilai.map(function (r) {
      return r.map(function (v) { return v instanceof Date ? v.toISOString().slice(0, 10) : v; });
    });
  });
  return hasil;
}

/* ---------- HARGA PASAR (emas, kripto, saham) ---------- */
// daftar: [{sumber:'emas'|'kripto'|'saham', kode:'...'}]  ->  { 'emas:': {p: harga per unit (Rp), t: waktu}, ... }
const CACHE_HARGA_DETIK = 15 * 60;
function ambilJson_(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (Duitku)' } });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode());
  return JSON.parse(r.getContentText());
}
function kursUsdIdr_() {
  return Number(ambilJson_('https://open.er-api.com/v6/latest/USD').rates.IDR);
}
function hargaSatu_(sumber, kode) {
  if (sumber === 'emas') {   // harga emas dunia (spot) -> Rupiah per gram
    const usdPerOns = Number(ambilJson_('https://api.gold-api.com/price/XAU').price);
    return Math.round(usdPerOns / 31.1034768 * kursUsdIdr_());
  }
  if (sumber === 'kripto') { // kode = id CoinGecko, mis. bitcoin
    const j = ambilJson_('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(kode.toLowerCase()) + '&vs_currencies=idr');
    return Number(j[kode.toLowerCase()].idr);
  }
  if (sumber === 'saham') {  // kode = kode saham BEI, mis. BBCA
    const j = ambilJson_('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(kode.toUpperCase()) + '.JK?range=1d&interval=1d');
    return Number(j.chart.result[0].meta.regularMarketPrice);
  }
  if (sumber === 'emasid') { // kode = 'ANTAM|buyback' -> Rupiah per gram (toko Indonesia)
    const p = hargaGaleri24_()[kode];
    if (!(p > 0)) throw new Error('Harga tidak ada');
    return p;
  }
  throw new Error('Sumber tidak dikenal');
}
/* Harga emas toko Indonesia dari galeri24.co.id/harga-emas (jual & buyback per gram, dari baris 1 gram) */
const MEREK_G24 = ['GALERI 24', 'ANTAM', 'UBS'];
// ubah HTML jadi satu aliran teks (tidak bergantung pada pemecahan baris/tag)
function teksHalaman_(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}
function rapat_(t) { return String(t).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
// Pecah halaman jadi bagian per judul: judul = teks tepat sebelum "Berat Harga Jual Harga Buyback"
function bagianHarga_(teks) {
  const re = /Harga\s+(.+?)\s+Berat\s+Harga\s+Jual\s+Harga\s+Buyback/gi, awal = [];
  let m;
  while ((m = re.exec(teks)) !== null) {
    const nama = m[1].split(/Harga\s+/i).pop();           // ambil nama setelah kata "Harga" terakhir
    awal.push({ nama: rapat_(nama), mulai: re.lastIndex, kepala: m.index });
  }
  const hasil = {};
  awal.forEach(function (x, i) {
    if (hasil[x.nama] === undefined) hasil[x.nama] = teks.slice(x.mulai, i + 1 < awal.length ? awal[i + 1].kepala : teks.length);
  });
  return hasil;
}
function hargaBaris1Gram_(isi) {
  const m = /(?:^|\s)1(?:[.,]0+)?(?:\s*(?:gr|gram|g))?\s+Rp\s*([\d.]+)\s+Rp\s*([\d.]+)/i.exec(isi);
  if (!m) return null;
  return { jual: Number(m[1].replace(/\./g, '')) || 0, buyback: Number(m[2].replace(/\./g, '')) || 0 };
}
function hargaGaleri24_() {
  const cache = CacheService.getScriptCache(), ada = cache.get('g24_all');
  if (ada) return JSON.parse(ada);
  const r = UrlFetchApp.fetch('https://galeri24.co.id/harga-emas', { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (Duitku)' } });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode());
  const bagian = bagianHarga_(teksHalaman_(r.getContentText())), hasil = {};
  MEREK_G24.forEach(function (m) {
    const isi = bagian[rapat_(m)];
    const h = isi ? hargaBaris1Gram_(isi) : null;
    if (h) { if (h.jual > 0) hasil[m + '|jual'] = h.jual; if (h.buyback > 0) hasil[m + '|buyback'] = h.buyback; }
  });
  if (!Object.keys(hasil).length) throw new Error('Tabel harga tidak terbaca');
  cache.put('g24_all', JSON.stringify(hasil), CACHE_HARGA_DETIK);
  return hasil;
}
// segar = true: lewati simpanan 15 menit (dipakai tombol "Perbarui harga")
function ambilHarga_(daftar, segar) {
  if (!Array.isArray(daftar)) return { ok: false, error: 'Permintaan tidak valid' };
  const cache = CacheService.getScriptCache(), hasil = {}, sudah = {};
  if (segar) cache.remove('g24_all');   // tabel toko emas ikut diambil ulang (sekali per permintaan)
  daftar.slice(0, 20).forEach(function (d) {
    const sumber = String(d && d.sumber || ''), kode = String(d && d.kode || '').trim();
    if (['emas', 'emasid', 'kripto', 'saham'].indexOf(sumber) < 0) return;
    if (sumber === 'emasid' && !/^(GALERI 24|ANTAM|UBS)\|(jual|buyback)$/.test(kode)) { hasil[sumber + ':' + kode] = { err: 'Pilihan tidak valid' }; return; }
    if (sumber !== 'emas' && sumber !== 'emasid' && !/^[A-Za-z0-9.\-]{1,30}$/.test(kode)) { hasil[sumber + ':' + kode] = { err: 'Kode tidak valid' }; return; }
    const kunci = sumber + ':' + (sumber === 'emas' ? '' : kode);
    if (sudah[kunci]) return; sudah[kunci] = 1;
    const ck = 'hrg_' + kunci, ada = segar ? null : cache.get(ck);
    if (ada) { hasil[kunci] = JSON.parse(ada); return; }
    try {
      const p = hargaSatu_(sumber, kode);
      if (!(p > 0)) throw new Error('Harga kosong');
      const o = { p: p, t: new Date().toISOString() };
      cache.put(ck, JSON.stringify(o), CACHE_HARGA_DETIK);
      hasil[kunci] = o;
    } catch (err) { hasil[kunci] = { err: 'Harga belum bisa diambil (' + String(err.message || err).slice(0, 60) + ')' }; }
  });
  return { ok: true, harga: hasil };
}
