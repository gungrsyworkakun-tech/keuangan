# Duitku untuk Android — panduan lengkap

Aplikasi menyimpan data di HP. Backup ke Google Sheets lewat tombol "Masuk dengan Google" di menu Profil.
APK/AAB dibuat otomatis oleh GitHub (laptopmu tidak perlu memasang Android Studio).

## Bagian 1 — Siapkan Google (sekali saja, gratis)
1. Buka https://console.cloud.google.com lalu buat project baru, misalnya "Duitku".
2. Menu **APIs & Services → Library**: aktifkan **Google Sheets API** dan **Google Drive API**.
3. **OAuth consent screen**: pilih External, isi nama aplikasi "Duitku", email, dan alamat kebijakan privasi (lihat Bagian 4). Tambahkan izin `.../auth/drive.file`. Izin ini tidak termasuk izin sensitif.
4. Klik **Publish app** supaya semua orang bisa masuk (kalau masih "Testing", hanya email yang kamu daftarkan yang bisa).
5. **Credentials → Create credentials → OAuth client ID**:
   - Jenis **Web application** → salin Client ID-nya. Ini yang dipakai aplikasi.
   - Jenis **Android** → isi package name `app.duitku.keuangan` dan SHA-1 (Bagian 3). Buat satu untuk tiap SHA-1 (debug dan Play).

## Bagian 2 — Pasang di GitHub
Di repo: **Settings → Secrets and variables → Actions**
- Tab **Variables**: `GOOGLE_WEB_CLIENT_ID` = Client ID jenis Web tadi.
- Tab **Secrets** (untuk versi Play Store): `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.

Membuat keystore (sekali, simpan baik-baik, jangan hilang):
`keytool -genkeypair -v -keystore duitku.jks -alias duitku -keyalg RSA -keysize 2048 -validity 10000`
lalu ubah ke teks: `base64 -w0 duitku.jks` dan tempel hasilnya ke `KEYSTORE_BASE64`.

## Bagian 3 — Bangun aplikasi
Tab **Actions → Android → Run workflow**. Setelah selesai, unduh artefak `duitku-android`:
- `app-debug.apk` untuk dicoba di HP (izinkan "pasang dari sumber lain").
- `app-release.aab` untuk Play Store (hanya muncul kalau secrets keystore sudah diisi).

SHA-1 untuk Android client:
- Percobaan (debug): jalankan `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android` di komputer mana pun yang punya Java, atau ambil dari log build. Kunci debug di GitHub berbeda tiap build, jadi untuk uji login Google, lebih mudah langsung pakai versi release yang ditandatangani keystore-mu (`keytool -list -v -keystore duitku.jks`).
- Play Store: pakai SHA-1 **App signing key** dari Play Console → Setup → App signing (bukan upload key).

## Bagian 4 — Play Store
- Daftar akun developer: biaya sekali $25.
- Kebijakan privasi: sudah ada di `public/privacy.html`; kalau web di GitHub Pages, alamatnya `…/privacy.html`. Tempel alamat ini di Play Console dan di OAuth consent screen.
- Isi formulir **Data safety**: data keuangan disimpan di perangkat; bisa dikirim ke Google Sheets milik pengguna atas pilihannya; tidak dijual.
- Akun pribadi baru wajib **closed testing**: minimal 12 penguji, tetap ikut 14 hari berturut-turut, baru bisa ajukan produksi. Akun organisasi tidak kena aturan ini.
- Aplikasi baru wajib target Android 16 (API 36). Proyek ini sudah memakainya.

## iOS (nanti)
Butuh Apple Developer (sekitar $99/tahun) dan Mac untuk build (bisa runner Mac di GitHub). Belum dikerjakan.

## Yang belum diuji
Login Google dan backup nyata belum dicoba di HP/emulator. Logika backup sudah diuji dengan Google tiruan, dan tampilan sudah dicek di browser. Uji pertama di HP sungguhan sebelum diunggah ke Play Store.
