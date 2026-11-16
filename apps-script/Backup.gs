/**
 * DUITKU - Penampung backup di Google Sheets milikmu.
 * Cara pasang (sekitar 5 menit): lihat bagian "Sheet" di PANDUAN-ANDROID.md atau panduan di dalam aplikasi.
 *
 * 1) Ganti KUNCI_RAHASIA di bawah dengan kata rahasia buatanmu sendiri (minimal 16 huruf/angka).
 * 2) Deploy sebagai Web app: Jalankan sebagai "Saya", akses "Siapa saja".
 * 3) Tempel link Web app dan kunci yang sama di aplikasi Duitku (menu Profil).
 */
const KUNCI_RAHASIA = 'GANTI-INI-DENGAN-KATA-RAHASIA-PANJANG';

const TABEL = {
  Transaksi: ['id', 'date', 'desc', 'amount', 'type', 'category', 'accountId'],
  Rekening:  ['id', 'name', 'balance', 'jenis'],
  Investasi: ['id', 'name', 'type', 'invested', 'value', 'sumber', 'kode', 'qty'],
  Goal:      ['id', 'name', 'target', 'saved', 'deadline'],
  Anggaran:  ['category', 'limit'],
  Tabungan:  ['id', 'month', 'amount', 'note', 'pos'],
};
const KOLOM_ANGKA = { amount: 1, balance: 1, invested: 1, value: 1, target: 1, saved: 1, limit: 1, qty: 1 };
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
    if (m.aksi === 'tes') return keluar_({ ok: true });
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
