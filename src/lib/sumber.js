// Dua cara menyambung ke Google Sheets. Hook backup memakai salah satunya lewat antarmuka yang sama.
import { buatKlien } from './sheets-backup.js'
import { masukGoogle, keluarGoogle, ambilToken, GOOGLE_ADA } from './google.js'
import { buatKlienScript, cekLink, simpanConfig, bacaConfig } from './sheets-script.js'

export const sumberGoogle = {
  jenis: 'google',
  klien: buatKlien({ ambilToken }),
  masuk: async () => ({ email: (await masukGoogle()).email }),
  keluar: keluarGoogle,
}

export const sumberScript = {
  jenis: 'script',
  klien: buatKlienScript(),
  masuk: async ({ url, kunci } = {}) => {
    if (!cekLink(url)) throw new Error('Link harus berbentuk https://script.google.com/macros/s/…/exec')
    if (!kunci || kunci.length < 16) throw new Error('Kunci minimal 16 karakter (sama dengan yang ada di skrip)')
    simpanConfig({ url, kunci })
    return { email: 'Sheet pribadi' }
  },
  keluar: async () => { simpanConfig(null) },
  sudahDiisi: () => Boolean(bacaConfig()),
}

export const sumberAktif = GOOGLE_ADA ? sumberGoogle : sumberScript
