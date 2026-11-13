// URL web app Apps Script. Kosong = mode lokal (data hanya di browser, untuk coba-coba).
export const API_URL = import.meta.env.VITE_API_URL || 'https://cara-kinerja-ngr.my.id/duitku/api.php'
export const MODE_SHEETS = Boolean(API_URL)

const KEY = 'duitku-token'
const CACHE = 'duitku-cache'
const PROFIL = 'duitku-profil'

// ingat = true: simpan di perangkat (untuk HP pribadi, berlaku 30 hari). false: hilang saat tab/aplikasi ditutup.
export const getToken = () => { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || '' } catch { return '' } }
export const setToken = (t, ingat = false) => {
  try {
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY)
    if (t) (ingat ? localStorage : sessionStorage).setItem(KEY, t)
  } catch {}
}

// Salinan data terakhir di perangkat (hanya satu kunci, selalu ditimpa, jadi tidak menumpuk).
export const bacaCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || 'null') } catch { return null } }
export const tulisCache = (state) => { try { localStorage.setItem(CACHE, JSON.stringify({ state })) } catch {} }
export const bacaProfil = () => { try { return JSON.parse(localStorage.getItem(PROFIL) || 'null') } catch { return null } }
export const tulisProfil = (p) => { try { localStorage.setItem(PROFIL, JSON.stringify(p)) } catch {} }
export const hapusCache = () => { try { localStorage.removeItem(CACHE); localStorage.removeItem(PROFIL) } catch {} }

export async function call(action, payload = {}, opts = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 30000)
  try {
    // text/plain supaya tidak memicu preflight CORS (Apps Script tidak mendukungnya)
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: getToken(), ...payload }),
      redirect: 'follow',
      credentials: 'omit',
      keepalive: Boolean(opts.keepalive),
      signal: ctl.signal,
    })
    if (!res.ok) throw new Error('Server tidak bisa dihubungi')
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}
