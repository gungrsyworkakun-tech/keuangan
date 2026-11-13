<?php
/**
 * DUITKU - Perantara cepat di hosting (PHP).
 *
 * Aplikasi bicara ke file ini, bukan langsung ke Apps Script.
 * - Buka aplikasi  : data dibaca dari salinan di hosting (cepat).
 * - Simpan         : ditulis ke salinan dulu (cepat), lalu dikirim ke Google Sheets di belakang layar.
 * - Login/harga/ganti password/backup: diteruskan ke Apps Script (aturan keamanan tetap di sana).
 * Google Sheets tetap jadi tempat data utama.
 */
declare(strict_types=1);

const MAKS_BODY   = 3 * 1024 * 1024;   // batas ukuran permintaan
const MAKS_BARIS  = 5000;              // sama dengan Apps Script
const SESI_PENDEK = 6 * 3600;          // login biasa: 6 jam
const SESI_PANJANG = 30 * 24 * 3600;   // "ingat saya": 30 hari
const MAKS_SESI   = 20;                // batas jumlah sesi tersimpan
const MAKS_LOGIN_IP = 30;              // percobaan login per IP per 15 menit
const KUNCI_STATE = ['transactions', 'accounts', 'investments', 'goals', 'budgets'];

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) { kirim(['ok' => false, 'error' => 'Perantara belum dikonfigurasi (config.php tidak ada)'], 500); exit; }
$cfg = require $cfgFile;
$cfg['data_dir'] = rtrim((string)($cfg['data_dir'] ?? (__DIR__ . '/data')), '/\\');
$cfg['refresh_detik'] = (int)($cfg['refresh_detik'] ?? 300);

/* ---------- dasar: respons & CORS ---------- */
function kirim(array $o, int $kode = 200): void {
    http_response_code($kode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    $b = json_encode($o, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    header('Content-Length: ' . strlen($b));
    header('Connection: close');
    echo $b;
    // balas ke pengguna sekarang juga; pekerjaan sinkron lanjut di belakang
    if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); }
    elseif (function_exists('litespeed_finish_request')) { litespeed_finish_request(); }
    else { while (ob_get_level() > 0) { @ob_end_flush(); } flush(); }
}
// Apakah server ini bisa membalas pengguna dulu lalu lanjut bekerja di belakang?
function bisaLatar(array $cfg): bool {
    $mode = (string)($cfg['latar'] ?? 'auto');
    if ($mode === 'langsung') return true;
    if ($mode === 'http') return false;
    return function_exists('fastcgi_finish_request') || function_exists('litespeed_finish_request');
}

function cors(array $cfg): void {
    $asal = $_SERVER['HTTP_ORIGIN'] ?? '';
    $boleh = (array)($cfg['origin'] ?? []);
    if ($asal === '') return;                       // bukan dari browser lain (mis. uji manual)
    if (!in_array($asal, $boleh, true)) { kirim(['ok' => false, 'error' => 'Asal tidak diizinkan'], 403); exit; }
    header('Access-Control-Allow-Origin: ' . $asal);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
}

cors($cfg);
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET')     { kirim(['ok' => true, 'app' => 'duitku-proxy']); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST')    { kirim(['ok' => false, 'error' => 'Metode tidak didukung'], 405); exit; }

ignore_user_abort(true);
@set_time_limit(60);

/* ---------- penyimpanan berkas (dikunci agar tidak bentrok) ---------- */
function siapkanDir(array $cfg): void {
    $d = $cfg['data_dir'];
    if (!is_dir($d)) @mkdir($d, 0700, true);
    if (!is_dir($d) || !is_writable($d)) { kirim(['ok' => false, 'error' => 'Folder data tidak bisa ditulis'], 500); exit; }
    if (!is_file($d . '/.htaccess')) @file_put_contents($d . '/.htaccess', "Require all denied\nDeny from all\n");
    if (!is_file($d . '/index.html')) @file_put_contents($d . '/index.html', '');
}
function berkas(array $cfg, string $nama): string { return $cfg['data_dir'] . '/' . $nama; }

function bacaJson(string $f, $awal = []) {
    if (!is_file($f)) return $awal;
    $j = json_decode((string)@file_get_contents($f), true);
    return $j === null ? $awal : $j;
}
function tulisJson(string $f, $data): void {
    $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
    @chmod($tmp, 0600);
    rename($tmp, $f);
}
// jalankan $fn sambil memegang kunci berkas; $blok=false -> langsung null kalau kunci sedang dipegang
function dengan(array $cfg, string $kunci, callable $fn, bool $blok = true) {
    $h = fopen(berkas($cfg, $kunci . '.lock'), 'c');
    if (!$h) return null;
    if (!flock($h, $blok ? LOCK_EX : (LOCK_EX | LOCK_NB))) { fclose($h); return null; }
    try { return $fn(); } finally { flock($h, LOCK_UN); fclose($h); }
}

/* ---------- Apps Script ---------- */
function gs(array $cfg, array $req): array {
    $ch = curl_init((string)$cfg['apps_script_url']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($req, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: text/plain;charset=utf-8'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,   // Apps Script membalas lewat pengalihan
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 40,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'Duitku-Proxy',
    ]);
    $isi = curl_exec($ch);
    curl_close($ch);
    $j = is_string($isi) ? json_decode($isi, true) : null;
    return is_array($j) ? $j : ['ok' => false, 'error' => 'Server Google tidak membalas, coba lagi'];
}

/* ---------- sesi (hanya hash token yang disimpan) ---------- */
function hashTok(string $t): string { return hash('sha256', $t); }
function tokenValid($t): bool { return is_string($t) && (bool)preg_match('/^[A-Za-z0-9\-]{20,120}$/', $t); }

function cekSesi(array $cfg, string $token): ?string {
    $s = bacaJson(berkas($cfg, 'sesi.json'));
    $r = $s[hashTok($token)] ?? null;
    return ($r && $r['exp'] > time()) ? (string)$r['u'] : null;
}
function simpanSesi(array $cfg, string $token, string $user, int $detik): void {
    dengan($cfg, 'sesi', function () use ($cfg, $token, $user, $detik) {
        $f = berkas($cfg, 'sesi.json'); $s = bacaJson($f); $n = time();
        $s = array_filter($s, fn($x) => ($x['exp'] ?? 0) > $n);
        $s[hashTok($token)] = ['u' => $user, 'exp' => $n + $detik];
        uasort($s, fn($a, $b) => $b['exp'] <=> $a['exp']);
        tulisJson($f, array_slice($s, 0, MAKS_SESI, true));
    });
}
function hapusSesi(array $cfg, string $token, bool $semuaKecuali = false): void {
    dengan($cfg, 'sesi', function () use ($cfg, $token, $semuaKecuali) {
        $f = berkas($cfg, 'sesi.json'); $s = bacaJson($f); $h = hashTok($token);
        $s = $semuaKecuali ? array_intersect_key($s, [$h => 1]) : array_diff_key($s, [$h => 1]);
        tulisJson($f, $s);
    });
}

/* ---------- batas percobaan login per IP ---------- */
function batasLogin(array $cfg): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    return (bool)dengan($cfg, 'lim', function () use ($cfg, $ip) {
        $f = berkas($cfg, 'lim.json'); $n = time(); $d = bacaJson($f);
        foreach ($d as $k => $v) if ($v['t'] < $n - 900) unset($d[$k]);
        $k = hash('sha256', $ip);
        $d[$k] = ['t' => $d[$k]['t'] ?? $n, 'n' => ($d[$k]['n'] ?? 0) + 1];
        tulisJson($f, $d);
        return $d[$k]['n'] <= MAKS_LOGIN_IP;
    });
}

/* ---------- salinan data ---------- */
function bacaSalinan(array $cfg): array {
    $d = bacaJson(berkas($cfg, 'salinan.json'), []);
    return is_array($d) ? $d : [];
}
// pending = ada perubahan yang belum sampai ke Sheets; versi naik tiap simpan
function tulisSalinan(array $cfg, array $state, $profil, bool $pending, ?int $versi = null): int {
    return (int)dengan($cfg, 'salinan', function () use ($cfg, $state, $profil, $pending, $versi) {
        $lama = bacaSalinan($cfg);
        $v = $versi ?? (($lama['versi'] ?? 0) + 1);
        tulisJson(berkas($cfg, 'salinan.json'), [
            'state' => $state, 'profil' => $profil ?? ($lama['profil'] ?? null),
            'pending' => $pending, 'versi' => $v, 'waktu' => time(),
        ]);
        return $v;
    });
}
function ubahProfil(array $cfg, array $profil): void {
    dengan($cfg, 'salinan', function () use ($cfg, $profil) {
        $d = bacaSalinan($cfg); if (!$d) return;
        $d['profil'] = $profil; tulisJson(berkas($cfg, 'salinan.json'), $d);
    });
}
function stateValid($s): bool {
    if (!is_array($s)) return false;
    foreach (KUNCI_STATE as $k) if (!isset($s[$k]) || !is_array($s[$k]) || count($s[$k]) > MAKS_BARIS) return false;
    return true;
}

/* ---------- sinkron ke Sheets (dijalankan setelah pengguna dibalas) ---------- */
function kirimKeSheets(array $cfg, string $token): void {
    dengan($cfg, 'sinkron', function () use ($cfg, $token) {
        $d = bacaSalinan($cfg);
        if (empty($d['pending'])) return;
        $r = gs($cfg, ['action' => 'save', 'token' => $token, 'state' => $d['state']]);
        if (!empty($r['ok'])) {
            // tandai selesai hanya kalau tidak ada simpanan yang lebih baru selama pengiriman
            dengan($cfg, 'salinan', function () use ($cfg, $d) {
                $skrg = bacaSalinan($cfg);
                if (($skrg['versi'] ?? 0) === ($d['versi'] ?? -1)) { $skrg['pending'] = false; tulisJson(berkas($cfg, 'salinan.json'), $skrg); }
            });
        }
    }, false);
}
function segarkanDariSheets(array $cfg, string $token): void {
    dengan($cfg, 'sinkron', function () use ($cfg, $token) {
        $d = bacaSalinan($cfg);
        if (!empty($d['pending'])) return;
        $r = gs($cfg, ['action' => 'load', 'token' => $token]);
        if (empty($r['ok']) || !stateValid($r['state'] ?? null)) return;
        dengan($cfg, 'salinan', function () use ($cfg, $r, $d) {
            $skrg = bacaSalinan($cfg);
            if (!empty($skrg['pending']) || ($skrg['versi'] ?? 0) !== ($d['versi'] ?? 0)) return; // ada simpanan baru, jangan timpa
            tulisJson(berkas($cfg, 'salinan.json'), [
                // kunci yang belum dikenal Sheets (mis. backend lama) tetap dipertahankan dari salinan
                'state' => $r['state'] + array_diff_key(is_array($skrg['state'] ?? null) ? $skrg['state'] : [], $r['state']),
                'profil' => $r['profil'] ?? ($skrg['profil'] ?? null),
                'pending' => false, 'versi' => ($skrg['versi'] ?? 0), 'waktu' => time(),
            ]);
        });
    }, false);
}

/* ---------- kerja latar lewat panggilan ke diri sendiri (untuk server yang menahan balasan) ---------- */
function rahasia(array $cfg): string {
    $f = berkas($cfg, 'rahasia.txt');
    if (!is_file($f)) { file_put_contents($f, bin2hex(random_bytes(16))); @chmod($f, 0600); }
    return trim((string)file_get_contents($f));
}
function urlSendiri(array $cfg): string {
    if (!empty($cfg['url_sendiri'])) return (string)$cfg['url_sendiri'];
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    return ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['SCRIPT_NAME'] ?? '/api.php');
}
// kirim perintah ke api.php sendiri lalu tidak menunggu hasilnya
function pingLatar(array $cfg, string $jenis, string $token): void {
    $ch = curl_init(urlSendiri($cfg));
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['action' => 'latar', 'rahasia' => rahasia($cfg), 'jenis' => $jenis, 'token' => $token]),
        CURLOPT_HTTPHEADER => ['Content-Type: text/plain;charset=utf-8'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_NOSIGNAL => true,
        CURLOPT_CONNECTTIMEOUT_MS => 1500,
        CURLOPT_TIMEOUT_MS => 400,      // sengaja tidak menunggu; server tetap lanjut bekerja
    ]);
    curl_exec($ch); curl_close($ch);
}
function jalankanLatar(array $cfg, string $jenis, string $token): void {
    if ($jenis === 'kirim') kirimKeSheets($cfg, $token); else segarkanDariSheets($cfg, $token);
}

/* ---------- permintaan masuk ---------- */
siapkanDir($cfg);
$mentah = file_get_contents('php://input', false, null, 0, MAKS_BODY + 1);
if ($mentah === false || strlen($mentah) > MAKS_BODY) { kirim(['ok' => false, 'error' => 'Permintaan terlalu besar'], 413); exit; }
$req = json_decode($mentah, true);
if (!is_array($req) || !isset($req['action'])) { kirim(['ok' => false, 'error' => 'Permintaan tidak valid'], 400); exit; }
$aksi = (string)$req['action'];
$token = $req['token'] ?? '';
$tugas = null; // pekerjaan latar setelah pengguna dibalas

if ($aksi === 'latar') {
    // hanya boleh dipanggil oleh api.php sendiri (butuh rahasia di folder data)
    if (!hash_equals(rahasia($cfg), (string)($req['rahasia'] ?? '')) || !tokenValid($token)) { http_response_code(403); exit; }
    jalankanLatar($cfg, ($req['jenis'] ?? '') === 'kirim' ? 'kirim' : 'segarkan', $token);
    http_response_code(204); exit;
}
if ($aksi === 'login') {
    if (!batasLogin($cfg)) { kirim(['ok' => false, 'error' => 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.'], 429); exit; }
    $r = gs($cfg, $req);
    if (!empty($r['ok']) && tokenValid($r['token'] ?? null)) {
        simpanSesi($cfg, $r['token'], (string)($r['user'] ?? ''), ($req['ingat'] ?? false) === true ? SESI_PANJANG : SESI_PENDEK);
        $t = $r['token'];
        if (!bacaSalinan($cfg)) $tugas = ['segarkan', $t]; // siapkan salinan awal
    }
    kirim($r);
} else {
    if (!tokenValid($token)) { kirim(['ok' => false, 'error' => 'Sesi habis, silakan login lagi', 'auth' => false]); exit; }
    $user = cekSesi($cfg, $token);

    if ($user === null) {
        // Belum dikenal di sini (mis. login dibuat sebelum perantara dipasang): minta Apps Script memeriksa
        $r = gs($cfg, $req);
        if ($aksi === 'load' && !empty($r['ok']) && stateValid($r['state'] ?? null)) {
            simpanSesi($cfg, $token, (string)($r['profil']['username'] ?? ''), SESI_PENDEK);
            tulisSalinan($cfg, $r['state'], $r['profil'] ?? null, false);
        }
        kirim($r);
    } else {
        $d = bacaSalinan($cfg);
        switch ($aksi) {
            case 'load':
                if (!$d || !stateValid($d['state'] ?? null)) {
                    $r = gs($cfg, $req);
                    if (!empty($r['ok']) && stateValid($r['state'] ?? null)) tulisSalinan($cfg, $r['state'], $r['profil'] ?? null, false);
                    kirim($r);
                } else {
                    kirim(['ok' => true, 'state' => $d['state'], 'profil' => $d['profil'] ?? ['username' => $user, 'nama' => $user]]);
                    if (!empty($d['pending'])) $tugas = ['kirim', $token];
                    elseif (time() - (int)($d['waktu'] ?? 0) > $cfg['refresh_detik']) $tugas = ['segarkan', $token];
                }
                break;

            case 'save':
                if (!stateValid($req['state'] ?? null)) { kirim(['ok' => false, 'error' => 'Data tidak valid']); break; }
                tulisSalinan($cfg, $req['state'], null, true);
                kirim(['ok' => true, 'waktu' => gmdate('c'), 'oleh' => $user]);
                $tugas = ['kirim', $token];
                break;

            case 'saveProfile':
                $r = gs($cfg, $req);
                if (!empty($r['ok']) && isset($r['profil'])) ubahProfil($cfg, $r['profil']);
                kirim($r);
                break;

            case 'harga': {
                $kunci = hash('sha256', json_encode($req['daftar'] ?? []));
                $f = berkas($cfg, 'harga.json');
                $c = bacaJson($f);
                if (isset($c[$kunci]) && $c[$kunci]['t'] > time() - 600) { kirim($c[$kunci]['r']); break; }
                $r = gs($cfg, $req);
                if (!empty($r['ok'])) {
                    $n = time();
                    $c = array_filter($c, fn($x) => $x['t'] > $n - 600);
                    $c[$kunci] = ['t' => $n, 'r' => $r];
                    tulisJson($f, array_slice($c, -40, null, true));
                }
                kirim($r);
                break;
            }

            case 'backup':
                kirim(gs($cfg, $req));
                break;

            case 'logout':
                hapusSesi($cfg, $token);
                gs($cfg, $req);
                kirim(['ok' => true]);
                break;

            case 'changePassword':
                $r = gs($cfg, $req);
                if (!empty($r['ok'])) hapusSesi($cfg, $token, true); // perangkat lain harus login ulang
                kirim($r);
                break;

            default:
                kirim(['ok' => false, 'error' => 'Aksi tidak dikenal']);
        }
    }
}

if ($tugas) {
    try {
        if (bisaLatar($cfg)) jalankanLatar($cfg, $tugas[0], $tugas[1]);
        else pingLatar($cfg, $tugas[0], $tugas[1]);
    } catch (Throwable $e) { /* sinkron gagal: dicoba lagi di permintaan berikutnya */ }
}
