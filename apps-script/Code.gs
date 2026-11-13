/**
 * DUITKU - Backend Google Sheets (Apps Script)
 * Fungsi: simpan data di Sheets, login + sesi, backup harian ke Drive.
 * Cara pasang: lihat README.md bagian "Langkah 1".
 */

const TABEL = {
  Transaksi: ['id', 'date', 'desc', 'amount', 'type', 'category', 'accountId'],
  Rekening:  ['id', 'name', 'balance'],
  Investasi: ['id', 'name', 'type', 'invested', 'value'],
  Goal:      ['id', 'name', 'target', 'saved', 'deadline'],
  Anggaran:  ['category', 'limit'],
};
// nama di aplikasi -> nama tab di Sheets
const PETA = { transactions: 'Transaksi', accounts: 'Rekening', investments: 'Investasi', goals: 'Goal', budgets: 'Anggaran' };
const KOLOM_ANGKA = { amount: 1, balance: 1, invested: 1, value: 1, target: 1, saved: 1, limit: 1 };

const SESI_DETIK = 6 * 60 * 60;   // login berlaku 6 jam
const MAKS_GAGAL = 5;             // salah password 5x -> dikunci
const KUNCI_DETIK = 15 * 60;      // dikunci 15 menit
const MAKS_BACKUP = 30;           // simpan 30 backup terakhir
const MAKS_BARIS = 5000;          // batas pengaman ukuran data

/* ---------- SETUP (jalankan sekali) ---------- */
function setupAwal() {
  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty('ADMIN_USER');
  const pass = props.getProperty('ADMIN_PASS');
  if (!user || !pass) throw new Error('Isi dulu Script Properties ADMIN_USER dan ADMIN_PASS (lihat README).');
  if (pass.length < 8) throw new Error('Password minimal 8 karakter.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABEL).forEach(function (nama) {
    const sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    sh.getRange(1, 1, 1, TABEL[nama].length).setValues([TABEL[nama]]).setFontWeight('bold');
    sh.getRange(2, 1, sh.getMaxRows() - 1, TABEL[nama].length).setNumberFormat('@'); // teks polos, cegah rumus nyasar
    sh.setFrozenRows(1);
  });
  simpanUser_(user, pass);
  props.deleteProperty('ADMIN_PASS'); // password asli dihapus, tinggal hash-nya
  props.setProperty('HAS_SETUP', '1');
  pasangTriggerBackup();
  Logger.log('Setup selesai untuk user: ' + user);
}

function pasangTriggerBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupHarian') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupHarian').timeBased().everyDays(1).atHour(2).create();
}

/* ---------- WEB APP ---------- */
function doGet() { return json_({ ok: true, app: 'duitku' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Permintaan tidak valid' }); }
  try {
    if (req.action === 'login') return json_(login_(req.username, req.password));
    const user = cekSesi_(req.token);
    if (!user) return json_({ ok: false, error: 'Sesi habis, silakan login lagi', auth: false });
    switch (req.action) {
      case 'load':   return json_({ ok: true, state: baca_() });
      case 'save':   return json_(simpan_(req.state, user));
      case 'backup': return json_({ ok: true, nama: backupSekarang() });
      case 'logout': CacheService.getScriptCache().remove('sess_' + req.token); return json_({ ok: true });
      case 'changePassword': return json_(gantiPassword_(user, req.oldPassword, req.newPassword));
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

function login_(username, password) {
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
  return { ok: true, token: token, user: u };
}

function cekSesi_(token) {
  if (!token || typeof token !== 'string') return null;
  return CacheService.getScriptCache().get('sess_' + token);
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
      const lama = sh.getLastRow() - 1;
      if (lama > 0) sh.getRange(2, 1, lama, kolom.length).clearContent();
      if (nilai.length) {
        const rentang = sh.getRange(2, 1, nilai.length, kolom.length);
        rentang.setNumberFormat('@');
        rentang.setValues(nilai);
      }
    });
    return { ok: true, waktu: new Date().toISOString(), oleh: user };
  } catch (err) {
    return { ok: false, error: String(err.message || 'Gagal menyimpan') };
  } finally {
    lock.releaseLock();
  }
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
