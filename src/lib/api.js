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

// Laporan tahap permintaan (untuk bilah persen di layar masuk dan saat memuat data)
const pendengar = new Set()
export const dengarProgres = (fn) => { pendengar.add(fn); return () => pendengar.delete(fn) }
const lapor = (aksi, persen, label) => pendengar.forEach((f) => f({ aksi, persen, label }))

async function bacaBadan(res, aksi) {
  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body || !res.body.getReader) return res.json()
  const rd = res.body.getReader(), potong = []
  let got = 0
  for (;;) {
    const { done, value } = await rd.read()
    if (done) break
    potong.push(value); got += value.length
    lapor(aksi, total ? 60 + Math.min(35, Math.round((got / total) * 35)) : 70, 'Menerima data…')
  }
  const all = new Uint8Array(got); let o = 0
  for (const c of potong) { all.set(c, o); o += c.length }
  return JSON.parse(new TextDecoder().decode(all))
}

export async function call(action, payload = {}, opts = {}) {
  lapor(action, 15, 'Menghubungi server…')
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
    lapor(action, 60, 'Menerima data…')
    const hasil = await bacaBadan(res, action)
    lapor(action, 100, 'Selesai')
    return hasil
  } finally {
    clearTimeout(timer)
  }
}
