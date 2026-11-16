// Masuk dengan Google di aplikasi HP (plugin Capacitor). Hanya meminta izin "drive.file".
// Client ID jenis "Web application" diisi saat build lewat VITE_GOOGLE_WEB_CLIENT_ID (lihat PANDUAN-ANDROID.md).
const KUNCI = 'duitku-google'
const IZIN = ['https://www.googleapis.com/auth/drive.file']
const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || 'null') } catch { return null } }
const tulis = (v) => { try { v ? localStorage.setItem(KUNCI, JSON.stringify(v)) : localStorage.removeItem(KUNCI) } catch {} }

export const akunGoogle = () => baca()

let siap = null
async function plugin() {
  const m = await import('@capawesome/capacitor-google-sign-in')
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
  if (!clientId) throw new Error('Aplikasi ini belum diberi Client ID Google (lihat panduan)')
  if (!siap) siap = m.GoogleSignIn.initialize({ clientId, scopes: IZIN }).catch((e) => { siap = null; throw e })
  await siap
  return m
}

function pesan(e, m) {
  if (m && e && e.code === m.ErrorCode.SignInCanceled) return new Error('Masuk Google dibatalkan')
  if (m && e && e.code === m.ErrorCode.NoCredentialAvailable) return new Error('Tidak ada akun Google di HP ini')
  return new Error((e && e.message) || 'Gagal masuk Google')
}

export async function masukGoogle() {
  const m = await plugin()
  let u
  try { u = await m.GoogleSignIn.signIn() } catch (e) { throw pesan(e, m) }
  if (!u.accessToken) throw new Error('Google tidak memberi izin akses ke Sheets/Drive')
  const akun = { email: u.email || '', token: u.accessToken, waktu: Date.now() }
  tulis(akun)
  return akun
}

export async function keluarGoogle() {
  try { const m = await plugin(); await m.GoogleSignIn.signOut() } catch {}
  tulis(null)
}

// Token Google berlaku sekitar 1 jam. Dipakai ulang selama < 45 menit; selebihnya diminta baru.
export async function ambilToken(paksa = false) {
  const akun = baca()
  if (!akun) throw new Error('Belum masuk Google')
  if (!paksa && akun.token && Date.now() - akun.waktu < 45 * 60 * 1000) return akun.token
  const m = await plugin()
  let u
  try { u = await m.GoogleSignIn.signIn() } catch (e) { throw pesan(e, m) }
  if (!u.accessToken) throw new Error('Sesi Google habis, masuk lagi')
  tulis({ ...akun, token: u.accessToken, waktu: Date.now() })
  return u.accessToken
}
