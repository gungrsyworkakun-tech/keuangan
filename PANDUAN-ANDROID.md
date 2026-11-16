# Duitku untuk Android — panduan lengkap

Aplikasi menyimpan data di HP. Login dibuat sendiri di HP. Backup lewat file: menu Profil → **Simpan backup** (kirim ke Drive/WhatsApp) dan **Pulihkan dari file**. Backup otomatis ke Google Sheets bersifat **opsional**: isi Link + Kunci di Profil (Bagian 1).
APK/AAB dibuat otomatis oleh GitHub (laptopmu tidak perlu memasang Android Studio).

## Bagian 1 — Hubungkan Sheet (tanpa login Google, tanpa Google Cloud)
Dibuat sekali oleh tiap pengguna, sekitar 5 menit. Aplikasi mengirim salinan data ke Sheet milik pengguna itu sendiri.
1. Di aplikasi: Profil → **Backup otomatis ke Google Sheets** → buka "Cara menyiapkan Sheet" → **Salin skrip**. Kunci rahasia sudah dibuat otomatis dan sudah ada di dalam skrip itu.
2. Buka https://sheets.new (Google Sheet kosong). Menu **Ekstensi → Apps Script**. Hapus isinya, lalu tempel skrip tadi dan simpan.
3. **Deploy → Deployment baru → Aplikasi web**. Jalankan sebagai **Saya**, akses **Siapa saja**. Klik **Deploy**, lalu izinkan akses (Google memperingatkan "belum diverifikasi"; klik Lanjutan → buka, karena skrip ini buatanmu sendiri).
4. Salin **URL aplikasi web** (berakhiran `/exec`), tempel di kolom Link di aplikasi, lalu **Hubungkan & tes**.

Skrip ini juga mengambil harga emas, kripto, dan saham untuk menu Investasi (sama seperti skrip lama). Riwayat versi Sheet tersedia lewat File → Riwayat versi, sebagai pengganti backup harian ke Drive.

Skrip yang sama ada di `apps-script/Backup.gs`. Kalau menyalin dari file itu (bukan dari aplikasi), ganti `KUNCI_RAHASIA` dengan kata rahasia panjang dan isi kata yang sama di kolom Kunci.

Keamanan: link boleh dibuka siapa saja, tapi tanpa Kunci yang benar skrip menolak semua permintaan. Jangan bagikan Kunci. Aplikasi hanya mau mengirim data ke alamat `script.google.com`.

Login di aplikasi: username dan password dibuat sendiri saat pertama membuka aplikasi dan hanya tersimpan di HP (dalam bentuk hash). Kalau lupa password, pilih "Lupa password" (data HP dihapus) lalu pulihkan dari backup file atau Sheet.

## Bagian 2 — Pasang di GitHub
Untuk versi Play Store, di repo: **Settings → Secrets and variables → Actions → Secrets**: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.

Membuat keystore (sekali, simpan baik-baik, jangan hilang):
`keytool -genkeypair -v -keystore duitku.jks -alias duitku -keyalg RSA -keysize 2048 -validity 10000`
lalu `base64 -w0 duitku.jks` dan tempel hasilnya ke `KEYSTORE_BASE64`.

(Opsional) Login Google sebagai cara lain: isi variabel `GOOGLE_WEB_CLIENT_ID` (Client ID jenis Web dari Google Cloud Console, dengan Sheets API dan Drive API aktif). Kalau variabel ini ada, tombol "Masuk dengan Google" menggantikan kolom Link + Kunci.

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
