<?php
// Salin file ini menjadi config.php di hosting, lalu isi nilainya.
return [
    // URL web app Apps Script (berakhiran /exec)
    'apps_script_url' => 'https://script.google.com/macros/s/ISI_ID_KAMU/exec',

    // Alamat halaman aplikasi yang boleh memanggil perantara ini (tanpa garis miring di akhir)
    'origin' => [
        'https://gungrsyworkakun-tech.github.io',
    ],

    // Folder penyimpanan salinan data & sesi.
    // Paling aman: taruh DI LUAR public_html, mis. '/home/USERNAME/duitku-data'
    // Kalau dikosongkan, dipakai folder "data" di samping api.php (dilindungi .htaccess).
    // 'data_dir' => '/home/USERNAME/duitku-data',

    // Seberapa sering salinan disegarkan dari Sheets (detik), supaya edit langsung di Sheets ikut terbawa
    'refresh_detik' => 300,
];
