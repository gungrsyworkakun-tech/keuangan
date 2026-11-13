// URL web app Apps Script. Kosong = mode lokal (data hanya di browser, untuk coba-coba).
export const API_URL = import.meta.env.VITE_API_URL || ''
export const MODE_SHEETS = Boolean(API_URL)

const KEY = 'duitku-token'
export const getToken = () => { try { return sessionStorage.getItem(KEY) || '' } catch { return '' } }
export const setToken = (t) => { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY) } catch {} }

export async function call(action, payload = {}) {
  // text/plain supaya tidak memicu preflight CORS (Apps Script tidak mendukungnya)
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: getToken(), ...payload }),
    redirect: 'follow',
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Server tidak bisa dihubungi')
  return res.json()
}
