# Rekap Kerja (Android)

Pembungkus Android untuk aplikasi Rekap Kerja. Halaman ada di `www/` (disalin dari `index.html` aplikasi hosting), data tetap di server hosting `https://cara-kinerja-ngr.my.id/api.php`.

- APK dibuat otomatis oleh GitHub (workflow **Rekap Kerja (Android)**) dan ditaruh di Releases dengan tag `rekapkerja-terbaru`.
- Aplikasi terdaftar di toko **Gudang Aplikasi** lewat `toko/www/apps.json`.
- Ganti alamat server: ubah `https://cara-kinerja-ngr.my.id/api.php` di `www/index.html` (cari `API_URL`).
- Perbarui tampilan: ganti `www/index.html` dengan versi terbaru dari hosting, lalu push ke `main`.
- Agar pembaruan lewat toko bisa menimpa versi lama, isi secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` (sama seperti aplikasi lain di repo ini). Tanpa itu APK memakai kunci percobaan yang berubah tiap build.
