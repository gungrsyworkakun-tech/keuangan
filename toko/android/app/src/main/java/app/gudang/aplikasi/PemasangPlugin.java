package app.gudang.aplikasi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;

/**
 * Mengecek aplikasi terpasang, mengunduh APK dari GitHub Releases, memasangnya lewat PackageInstaller,
 * dan membuka aplikasi. Hasil pemasangan dikirim ke halaman lewat event "status"; kemajuan unduhan lewat "progres".
 */
@CapacitorPlugin(name = "Pemasang")
public class PemasangPlugin extends Plugin {
    private static final String AKSI_HASIL = "app.gudang.aplikasi.HASIL_PASANG";
    private static final Pattern PAKET = Pattern.compile("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$");
    private static final Pattern URL_APK = Pattern.compile("^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/download/[^\\s]+\\.apk$");
    private static final long MAKS_BYTE = 300L * 1024 * 1024;

    private BroadcastReceiver penerima;

    @Override
    public void load() {
        penerima = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
                String paket = intent.getStringExtra("paket");
                String pesan = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
                if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    Intent konfirmasi = Build.VERSION.SDK_INT >= 33
                            ? intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class)
                            : intent.getParcelableExtra(Intent.EXTRA_INTENT);
                    if (konfirmasi != null) {
                        konfirmasi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(konfirmasi);
                    }
                    kirimStatus(paket, "menunggu", status, "");
                } else if (status == PackageInstaller.STATUS_SUCCESS) {
                    kirimStatus(paket, "sukses", status, "");
                } else {
                    kirimStatus(paket, "gagal", status, pesan == null ? "" : pesan);
                }
            }
        };
        ContextCompat.registerReceiver(getContext(), penerima, new IntentFilter(AKSI_HASIL), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() {
        try { getContext().unregisterReceiver(penerima); } catch (Exception ignored) {}
        super.handleOnDestroy();
    }

    private void kirimStatus(String paket, String status, int kode, String pesan) {
        JSObject o = new JSObject();
        o.put("paket", paket == null ? "" : paket);
        o.put("status", status);
        o.put("kode", kode);
        o.put("pesan", pesan);
        notifyListeners("status", o);
    }

    private void kirimProgres(String paket, int persen) {
        JSObject o = new JSObject();
        o.put("paket", paket);
        o.put("persen", persen);
        notifyListeners("progres", o);
    }

    @PluginMethod
    public void cekPaket(PluginCall call) {
        String paket = call.getString("paket", "");
        if (!PAKET.matcher(paket).matches()) { call.reject("Nama paket tidak valid"); return; }
        JSObject hasil = new JSObject();
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(paket, 0);
            long kode = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            hasil.put("terpasang", true);
            hasil.put("kode", kode);
            hasil.put("nama", pi.versionName == null ? "" : pi.versionName);
        } catch (PackageManager.NameNotFoundException e) {
            hasil.put("terpasang", false);
            hasil.put("kode", 0);
            hasil.put("nama", "");
        }
        call.resolve(hasil);
    }

    @PluginMethod
    public void izinPasang(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject hasil = new JSObject();
        hasil.put("diizinkan", ok);
        call.resolve(hasil);
    }

    @PluginMethod
    public void mintaIzin(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Tidak bisa membuka pengaturan izin");
        }
    }

    @PluginMethod
    public void bukaAplikasi(PluginCall call) {
        String paket = call.getString("paket", "");
        if (!PAKET.matcher(paket).matches()) { call.reject("Nama paket tidak valid"); return; }
        Intent i = getContext().getPackageManager().getLaunchIntentForPackage(paket);
        if (i == null) { call.reject("Aplikasi tidak bisa dibuka"); return; }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void unduhDanPasang(final PluginCall call) {
        final String paket = call.getString("paket", "");
        final String alamat = call.getString("url", "");
        if (!PAKET.matcher(paket).matches()) { call.reject("Nama paket tidak valid"); return; }
        if (!URL_APK.matcher(alamat).matches()) { call.reject("Alamat unduhan tidak diizinkan"); return; }
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("izin"); return;
        }
        new Thread(() -> {
            File berkas = null;
            try {
                File dir = new File(getContext().getCacheDir(), "unduhan");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Tidak bisa menyiapkan folder unduhan");
                berkas = new File(dir, paket + ".apk");
                unduh(alamat, berkas, paket);
                pasang(berkas, paket);
                call.resolve();
            } catch (Exception e) {
                if (berkas != null) berkas.delete();
                call.reject(e.getMessage() == null ? "Gagal mengunduh" : e.getMessage());
            }
        }).start();
    }

    private void unduh(String alamat, File tujuan, String paket) throws Exception {
        HttpURLConnection k = (HttpURLConnection) new URL(alamat).openConnection();
        k.setConnectTimeout(15000);
        k.setReadTimeout(30000);
        k.setInstanceFollowRedirects(true);
        k.setRequestProperty("User-Agent", "GudangAplikasi");
        try {
            if (k.getResponseCode() != 200) throw new Exception("Server menjawab " + k.getResponseCode());
            long total = k.getContentLengthLong();
            if (total > MAKS_BYTE) throw new Exception("Berkas terlalu besar");
            long terbaca = 0;
            int terakhir = -1;
            byte[] buf = new byte[64 * 1024];
            try (InputStream in = k.getInputStream(); OutputStream out = new FileOutputStream(tujuan)) {
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    terbaca += n;
                    if (terbaca > MAKS_BYTE) throw new Exception("Berkas terlalu besar");
                    if (total > 0) {
                        int p = (int) (terbaca * 100 / total);
                        if (p != terakhir) { terakhir = p; kirimProgres(paket, p); }
                    }
                }
            }
            if (total > 0 && terbaca != total) throw new Exception("Unduhan terputus, coba lagi");
            kirimProgres(paket, 100);
        } finally {
            k.disconnect();
        }
    }

    private void pasang(File berkas, String paket) throws Exception {
        PackageInstaller installer = getContext().getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(paket); // APK yang nama paketnya lain akan ditolak
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        int id = installer.createSession(params);
        try (PackageInstaller.Session sesi = installer.openSession(id)) {
            try (InputStream in = new FileInputStream(berkas); OutputStream out = sesi.openWrite("paket", 0, berkas.length())) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                sesi.fsync(out);
            }
            Intent hasil = new Intent(AKSI_HASIL).setPackage(getContext().getPackageName());
            hasil.putExtra("paket", paket);
            int bendera = PendingIntent_BENDERA();
            android.app.PendingIntent pi = android.app.PendingIntent.getBroadcast(getContext(), id, hasil, bendera);
            sesi.commit(pi.getIntentSender());
        }
    }

    private static int PendingIntent_BENDERA() {
        int b = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 31) b |= android.app.PendingIntent.FLAG_MUTABLE; // sistem perlu mengisi hasil pemasangan
        return b;
    }
}
