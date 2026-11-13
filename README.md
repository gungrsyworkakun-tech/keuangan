# Duitku – Keuangan pribadi (Google Sheets + GitHub Pages)

Alurnya: **GitHub Pages** (tampilan) → **Apps Script** (login + penjaga data) → **Google Sheets** (data) → **Drive** (backup harian).

## Langkah 1 – Siapkan Google Sheets + backend
1. Buat Google Sheets baru, beri nama `Duitku Data`.
2. Menu **Ekstensi → Apps Script**. Hapus isi default, tempel seluruh isi `apps-script/Code.gs`, simpan.
3. Buka **Setelan Proyek (ikon roda gigi) → Properti skrip → Tambah properti skrip**, buat dua properti:
   - `ADMIN_USER` = username pilihanmu (mis. `komang`)
   - `ADMIN_PASS` = password kuat, minimal 8 karakter
4. Di editor, pilih fungsi **`setupAwal`** lalu klik **Jalankan**. Izinkan akses saat diminta (Sheets dan Drive).
   Ini membuat tab-tabnya, mendaftarkan akunmu, **menghapus password mentah** dari properti, dan memasang backup otomatis tiap hari jam 02.00.
5. **Terapkan → Deployment baru → Jenis: Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Salin **URL aplikasi web** (berakhiran `/exec`).

   "Siapa saja" hanya berarti URL-nya bisa dihubungi. Data tetap hanya keluar kalau login benar.

## Langkah 2 – Taruh di GitHub
1. Buat repository baru di GitHub (boleh private jika akunmu mendukung Pages untuk private, kalau tidak pakai public. Kode tidak berisi data atau password).
2. Upload semua isi folder ini, lalu push ke branch `main`.
3. Repo → **Settings → Secrets and variables → Actions → tab Variables → New repository variable**
   - Name: `VITE_API_URL`, Value: URL `/exec` dari Langkah 1.
4. Repo → **Settings → Pages → Source: GitHub Actions**.
5. Tab **Actions** akan membangun otomatis. Setelah hijau, buka link Pages-mu dan login.

## Coba di komputer sendiri
```
npm install
echo VITE_API_URL=URL_EXEC_KAMU > .env.local
npm run dev
```
Tanpa `VITE_API_URL` aplikasi jalan dalam **mode lokal** (data hanya di browser, tanpa login) untuk coba-coba.

## Keamanan yang sudah dipasang
- Login di sisi server; semua data dan aksi butuh token sesi (berlaku 6 jam, disimpan di sessionStorage, hilang saat tab ditutup).
- Password disimpan sebagai hash + garam (bukan teks asli) dan tidak ada di kode GitHub.
- Salah password 5x → dikunci 15 menit.
- Penulisan data dikunci (LockService) dan divalidasi; sel dipaksa teks polos agar tidak bisa menyisipkan rumus.
- Perlindungan CSP di halaman hasil build.
- Backup ke folder Drive `Backup Duitku` tiap hari, menyimpan 30 terakhir. Tombol **Backup ke Drive** untuk backup manual.

## Catatan
- Aplikasi untuk **satu pengguna**. Kalau dibuka di dua tempat bersamaan, simpanan terakhir yang menang.
- Kalau mengubah `Code.gs`, buat **Deployment baru / kelola versi** agar perubahan berlaku (URL tetap sama kalau pilih "Edit deployment → Versi baru").
- Ganti password: jalankan di Apps Script `simpanUser_('username','passwordBaru')` lalu hapus baris itu.
- Jangan share Sheets ke orang lain kalau tidak ingin datanya terlihat.


## Pembaruan: profil, grafik, mobile
- Menu **Profil**: ubah nama tampilan dan ganti password (tersimpan di Apps Script).
- Grafik: arus kas, donat kategori, tren selisih, komposisi harta, alokasi investasi, cincin progres goal.
- Ponsel: navigasi bawah + tombol tambah, form naik dari bawah.
- Cepat & stabil: data lama tampil dulu lalu dicocokkan ke server, simpan satu per satu, peringatan jika tab ditutup sebelum tersimpan.
- Setelah mengubah `Code.gs`: **Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan** (URL tetap).
