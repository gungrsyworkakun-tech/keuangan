/**
 * DUITKU - Backend Google Sheets (Apps Script)
 * Fungsi: simpan data di Sheets, login + sesi, backup harian ke Drive.
 * Cara pasang: lihat README.md bagian "Langkah 1".
 */

const TABEL = {
  Transaksi: ['id', 'date', 'desc', 'amount', 'type', 'category', 'accountId'],
  Rekening:  ['id', 'name', 'balance', 'jenis'],
  Investasi: ['id', 'name', 'type', 'invested', 'value', 'sumber', 'kode', 'qty'],
  Goal:      ['id', 'name', 'target', 'saved', 'deadline'],
  Anggaran:  ['category', 'limit'],
};
// nama di aplikasi -> nama tab di Sheets
const PETA = { transactions: 'Transaksi', accounts: 'Rekening', investments: 'Investasi', goals: 'Goal', budgets: 'Anggaran' };
const KOLOM_ANGKA = { amount: 1, balance: 1, invested: 1, value: 1, target: 1, saved: 1, limit: 1, qty: 1 };

const SESI_DETIK = 6 * 60 * 60;   // login berlaku 6 jam
const MAKS_GAGAL = 5;             // salah password 5x -> dikunci
const KUNCI_DETIK = 15 * 60;      // dikunci 15 menit
const MAKS_BACKUP = 30;           // simpan 30 backup terakhir
const MAKS_BARIS = 5000;          // batas pengaman ukuran data

/* ---------- SETUP (jalankan sekali) ---------- */
function setupAwal() {
  // >>> UBAH DI SINI kalau mau username/password lain (password minimal 8 karakter) <<<
  const USER_AWAL = 'admin';
  const PASS_AWAL = 'admin123';

  if (PASS_AWAL.length < 8) throw new Error('Password minimal 8 karakter.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABEL).forEach(function (nama) {
    const sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    sh.getRange(1, 1, 1, TABEL[nama].length).setValues([TABEL[nama]]).setFontWeight('bold');
    sh.getRange(2, 1, sh.getMaxRows() - 1, TABEL[nama].length).setNumberFormat('@'); // teks polos, cegah rumus nyasar
    sh.setFrozenRows(1);
  });
  // akun hanya dibuat jika belum ada (aman kalau fungsi ini dijalankan ulang)
  if (!daftarUser_()[USER_AWAL.toLowerCase()]) simpanUser_(USER_AWAL, PASS_AWAL);
  PropertiesService.getScriptProperties().setProperty('HAS_SETUP', '1');
  pasangTriggerBackup();
  Logger.log('Setup selesai untuk user: ' + USER_AWAL);
}

function pasangTriggerBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupHarian') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupHarian').timeBased().everyDays(1).atHour(2).create();
}

/* ---------- JAGA TETAP CEPAT ---------- */
// Dijalankan tiap 5 menit agar salinan data selalu siap -> aplikasi terbuka lebih cepat di HP
function jagaHangat() { bacaCepat_(); }
function pasangTriggerHangat() { // jalankan SEKALI dari editor
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'jagaHangat') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('jagaHangat').timeBased().everyMinutes(5).create();
}

/* ---------- WEB APP ---------- */
function doGet() { return json_({ ok: true, app: 'duitku' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Permintaan tidak valid' }); }
  try {
    if (req.action === 'login') return json_(login_(req.username, req.password, req.ingat === true));
    const user = cekSesi_(req.token);
    if (!user) return json_({ ok: false, error: 'Sesi habis, silakan login lagi', auth: false });
    switch (req.action) {
      case 'load':   return json_({ ok: true, state: bacaCepat_(), profil: profil_(user) });
      case 'saveProfile': return json_(simpanProfil_(user, req.nama));
      case 'save':   return json_(simpan_(req.state, user));
      case 'harga':  return json_(ambilHarga_(req.daftar));
      case 'backup': return json_({ ok: true, nama: backupSekarang() });
      case 'logout': CacheService.getScriptCache().remove('sess_' + req.token); hapusSesiPanjang_(req.token); return json_({ ok: true });
      case 'changePassword': { const h = gantiPassword_(user, req.oldPassword, req.newPassword); if (h.ok) cabutSesiLain_(req.token); return json_(h); }
      default: return json_({ ok: false, error: 'Aksi tidak dikenal' });
    }
  } catch (err) {
    return json_({ ok: false, error: 'Terjadi kesalahan di server' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- LOGIN & KEAMANAN ---------- */
function hash_(garam, password) {
  let h = garam + '|' + password;
  for (let i = 0; i < 3000; i++) {
    h = bytesKeHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + garam, Utilities.Charset.UTF_8));
  }
  return h;
}
function bytesKeHex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function sama_(a, b) { // perbandingan aman waktu
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function daftarUser_() { return JSON.parse(PropertiesService.getScriptProperties().getProperty('USERS') || '{}'); }
function simpanUser_(username, password) {
  const users = daftarUser_();
  const garam = Utilities.getUuid();
  users[String(username).toLowerCase()] = { garam: garam, hash: hash_(garam, password) };
  PropertiesService.getScriptProperties().setProperty('USERS', JSON.stringify(users));
}

function login_(username, password, ingat) {
  const cache = CacheService.getScriptCache();
  const u = String(username || '').toLowerCase().slice(0, 64);
  const kunci = 'gagal_' + u;
  const kunciGlobal = 'gagal_semua';
  if (Number(cache.get(kunci) || 0) >= MAKS_GAGAL || Number(cache.get(kunciGlobal) || 0) >= MAKS_GAGAL * 4) {
    return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' };
  }
  const rec = daftarUser_()[u];
  const hashCoba = hash_(rec ? rec.garam : 'garam-palsu', String(password || '').slice(0, 200));
  if (!rec || !sama_(hashCoba, rec.hash)) {
    cache.put(kunci, String(Number(cache.get(kunci) || 0) + 1), KUNCI_DETIK);
    cache.put(kunciGlobal, String(Number(cache.get(kunciGlobal) || 0) + 1), KUNCI_DETIK);
    Utilities.sleep(800);
    return { ok: false, error: 'Username atau password salah' };
  }
  cache.remove(kunci);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  cache.put('sess_' + token, u, SESI_DETIK);
  if (ingat) simpanSesiPanjang_(u, token);
  return { ok: true, token: token, user: u, profil: profil_(u) };
}

function cekSesi_(token) {
  if (!token || typeof token !== 'string') return null;
  const cache = CacheService.getScriptCache();
  const u = cache.get('sess_' + token);
  if (u) return u;
  // sesi "ingat saya" (30 hari): disimpan sebagai hash, bukan token aslinya
  const rec = sesiPanjang_()[hashToken_(token)];
  if (rec && rec.exp > Date.now()) { cache.put('sess_' + token, rec.u, SESI_DETIK); return rec.u; }
  return null;
}

/* ---------- SESI "INGAT SAYA" ---------- */
const SESI_PANJANG_MS = 30 * 24 * 3600 * 1000;
function hashToken_(t) { return bytesKeHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8)); }
function sesiPanjang_() { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SESI') || '{}'); }
function tulisSesiPanjang_(semua) {
  const sekarang = Date.now();
  const bersih = {};
  Object.keys(semua).filter(function (k) { return semua[k].exp > sekarang; })
    .sort(function (a, b) { return semua[b].exp - semua[a].exp; }).slice(0, 10) // maksimal 10 perangkat
    .forEach(function (k) { bersih[k] = semua[k]; });
  PropertiesService.getScriptProperties().setProperty('SESI', JSON.stringify(bersih));
}
function simpanSesiPanjang_(u, token) {
  const semua = sesiPanjang_();
  semua[hashToken_(token)] = { u: u, exp: Date.now() + SESI_PANJANG_MS };
  tulisSesiPanjang_(semua);
}
function hapusSesiPanjang_(token) {
  const semua = sesiPanjang_();
  delete semua[hashToken_(token)];
  tulisSesiPanjang_(semua);
}
// Ganti password = semua perangkat lain keluar, perangkat yang sedang dipakai tetap masuk
function cabutSesiLain_(tokenSaatIni) {
  const semua = sesiPanjang_(), h = hashToken_(tokenSaatIni), baru = {};
  if (semua[h]) baru[h] = semua[h];
  tulisSesiPanjang_(baru);
}

function gantiPassword_(user, lama, baru) {
  const rec = daftarUser_()[user];
  if (!rec || !sama_(hash_(rec.garam, String(lama || '')), rec.hash)) return { ok: false, error: 'Password lama salah' };
  if (String(baru || '').length < 8) return { ok: false, error: 'Password baru minimal 8 karakter' };
  simpanUser_(user, baru);
  return { ok: true };
}

/* ---------- BACA / TULIS DATA ---------- */
function bentukTeks_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

function baca_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hasil = {};
  Object.keys(PETA).forEach(function (kunci) {
    const nama = PETA[kunci], kolom = TABEL[nama];
    const sh = ss.getSheetByName(nama);
    const n = sh ? sh.getLastRow() - 1 : 0;
    const baris = n > 0 ? sh.getRange(2, 1, n, kolom.length).getValues() : [];
    hasil[kunci] = baris
      .filter(function (r) { return r[0] !== '' && r[0] !== null; })
      .map(function (r) {
        const o = {};
        kolom.forEach(function (k, i) { o[k] = KOLOM_ANGKA[k] ? Number(r[i]) || 0 : bentukTeks_(r[i]); });
        return o;
      });
  });
  return hasil;
}

function simpan_(state, user) {
  if (!state || typeof state !== 'object') return { ok: false, error: 'Data tidak valid' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, error: 'Server sibuk, coba lagi' };
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(PETA).forEach(function (kunci) {
      const daftar = state[kunci];
      if (!Array.isArray(daftar)) throw new Error('Data ' + kunci + ' tidak valid');
      if (daftar.length > MAKS_BARIS) throw new Error('Data terlalu banyak');
    });
    Object.keys(PETA).forEach(function (kunci) {
      const nama = PETA[kunci], kolom = TABEL[nama];
      const sh = ss.getSheetByName(nama);
      const nilai = state[kunci].map(function (o) {
        return kolom.map(function (k) {
          const v = o[k];
          return KOLOM_ANGKA[k] ? (Number(v) || 0) : String(v === undefined || v === null ? '' : v).slice(0, 200);
        });
      });
      sh.getRange(1, 1, 1, kolom.length).setValues([kolom]).setFontWeight('bold');
      const lama = sh.getLastRow() - 1;
      if (lama > 0) sh.getRange(2, 1, lama, kolom.length).clearContent();
      if (nilai.length) {
        const rentang = sh.getRange(2, 1, nilai.length, kolom.length);
        rentang.setNumberFormat('@');
        rentang.setValues(nilai);
      }
    });
    CacheService.getScriptCache().remove('data_v1'); // data berubah, hapus salinan cepat
    return { ok: true, waktu: new Date().toISOString(), oleh: user };
  } catch (err) {
    return { ok: false, error: String(err.message || 'Gagal menyimpan') };
  } finally {
    lock.releaseLock();
  }
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
// Jalankan manual di editor Apps Script untuk mengecek hasil baca harga (lihat "Log eksekusi")
function ujiHargaEmas() {
  CacheService.getScriptCache().remove('g24_all');
  try { Logger.log('HASIL: ' + JSON.stringify(hargaGaleri24_())); }
  catch (e) { Logger.log('GAGAL: ' + e.message); }
  // info bantu: bagian apa saja yang terbaca dari halaman
  const r = UrlFetchApp.fetch('https://galeri24.co.id/harga-emas', { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (Duitku)' } });
  const teks = teksHalaman_(r.getContentText()), bagian = bagianHarga_(teks);
  Logger.log('HTTP ' + r.getResponseCode() + ', panjang teks ' + teks.length + ', bagian: ' + Object.keys(bagian).join(', '));
  MEREK_G24.forEach(function (m) { Logger.log(m + ' -> ' + String(bagian[rapat_(m)] || '(tidak ada)').slice(0, 160)); });
  if (!Object.keys(bagian).length) { const i = teks.search(/Berat/i); Logger.log('CONTOH: ' + teks.slice(Math.max(0, i - 120), i + 200)); }
}

function ambilHarga_(daftar) {
  if (!Array.isArray(daftar)) return { ok: false, error: 'Permintaan tidak valid' };
  const cache = CacheService.getScriptCache(), hasil = {}, sudah = {};
  daftar.slice(0, 20).forEach(function (d) {
    const sumber = String(d && d.sumber || ''), kode = String(d && d.kode || '').trim();
    if (['emas', 'emasid', 'kripto', 'saham'].indexOf(sumber) < 0) return;
    if (sumber === 'emasid' && !/^(GALERI 24|ANTAM|UBS)\|(jual|buyback)$/.test(kode)) { hasil[sumber + ':' + kode] = { err: 'Pilihan tidak valid' }; return; }
    if (sumber !== 'emas' && sumber !== 'emasid' && !/^[A-Za-z0-9.\-]{1,30}$/.test(kode)) { hasil[sumber + ':' + kode] = { err: 'Kode tidak valid' }; return; }
    const kunci = sumber + ':' + (sumber === 'emas' ? '' : kode);
    if (sudah[kunci]) return; sudah[kunci] = 1;
    const ck = 'hrg_' + kunci, ada = cache.get(ck);
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

/* ---------- PROFIL & PEMBACAAN CEPAT ---------- */
function profil_(user) {
  const semua = JSON.parse(PropertiesService.getScriptProperties().getProperty('PROFIL') || '{}');
  const p = semua[user] || {};
  return { username: user, nama: p.nama || user };
}

function simpanProfil_(user, nama) {
  const bersih = String(nama || '').replace(/[<>]/g, '').trim().slice(0, 40);
  if (!bersih) return { ok: false, error: 'Nama tidak boleh kosong' };
  const props = PropertiesService.getScriptProperties();
  const semua = JSON.parse(props.getProperty('PROFIL') || '{}');
  semua[user] = { nama: bersih };
  props.setProperty('PROFIL', JSON.stringify(semua));
  return { ok: true, profil: profil_(user) };
}

// Baca dari salinan cepat (10 menit); kalau kosong baru baca Sheets
function bacaCepat_() {
  const cache = CacheService.getScriptCache();
  const ada = cache.get('data_v1');
  if (ada) { try { return JSON.parse(ada); } catch (e) {} }
  const data = baca_();
  try { cache.put('data_v1', JSON.stringify(data), 600); } catch (e) {} // data besar (>100KB) dilewati
  return data;
}

/* ---------- BACKUP KE DRIVE ---------- */
function folderBackup_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('BACKUP_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const folder = DriveApp.createFolder('Backup Duitku');
  props.setProperty('BACKUP_FOLDER_ID', folder.getId());
  return folder;
}

function backupSekarang() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folder = folderBackup_();
  const stempel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
  const nama = 'Duitku-backup-' + stempel;
  DriveApp.getFileById(ss.getId()).makeCopy(nama, folder);
  // hapus backup lama, sisakan MAKS_BACKUP terbaru
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) { const f = it.next(); files.push({ f: f, t: f.getDateCreated().getTime() }); }
  files.sort(function (a, b) { return b.t - a.t; });
  files.slice(MAKS_BACKUP).forEach(function (x) { x.f.setTrashed(true); });
  return nama;
}

function backupHarian() { backupSekarang(); }
