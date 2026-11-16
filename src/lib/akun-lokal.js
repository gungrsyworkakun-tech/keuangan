// Akun lokal: username + password dibuat sendiri di HP, hanya untuk mengunci aplikasi.
// Disimpan sebagai hash (PBKDF2), bukan password asli. Data keuangan sendiri tidak dienkripsi.
const AKUN = 'duitku-akun-lokal'
const INGAT = 'duitku-ingat'
const SESI = 'duitku-buka'
const PUTARAN = 150000
const b64 = (u8) => btoa(String.fromCharCode(...u8))
const dariB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function hash(password, garam) {
  const kunci = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bit = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: garam, iterations: PUTARAN, hash: 'SHA-256' }, kunci, 256)
  return new Uint8Array(bit)
}
const baca = () => { try { return JSON.parse(localStorage.getItem(AKUN) || 'null') } catch { return null } }
const sama = (a, b) => { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a[i] ^ b[i]; return x === 0 }

export const adaAkun = () => Boolean(baca())
export const namaAkun = () => (baca() || {}).user || ''
export const sudahBuka = () => { try { return Boolean(baca()) && (localStorage.getItem(INGAT) === '1' || sessionStorage.getItem(SESI) === '1') } catch { return false } }
export function tandaiBuka(ingat) { try { sessionStorage.setItem(SESI, '1'); ingat ? localStorage.setItem(INGAT, '1') : localStorage.removeItem(INGAT) } catch {} }
export function kunciLagi() { try { sessionStorage.removeItem(SESI); localStorage.removeItem(INGAT) } catch {} }

export async function buatAkun(user, password) {
  user = String(user || '').trim()
  if (user.length < 3) throw new Error('Username minimal 3 karakter')
  if (String(password || '').length < 6) throw new Error('Password minimal 6 karakter')
  const garam = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(AKUN, JSON.stringify({ user, garam: b64(garam), hash: b64(await hash(password, garam)), putaran: PUTARAN }))
}
export async function cekAkun(user, password) {
  const a = baca()
  if (!a) return false
  const h = await hash(String(password || ''), dariB64(a.garam))
  return sama(h, dariB64(a.hash)) && String(user || '').trim().toLowerCase() === a.user.toLowerCase()
}
// Lupa password: hapus akun dan semua data Duitku di HP ini
export function hapusSemua() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('duitku')).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear() } catch {}
}

export async function gantiPassword(lama, baru) {
  const a = baca()
  if (!a || !(await cekAkun(a.user, lama))) throw new Error('Password lama salah')
  if (String(baru || '').length < 6) throw new Error('Password baru minimal 6 karakter')
  const garam = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(AKUN, JSON.stringify({ ...a, garam: b64(garam), hash: b64(await hash(baru, garam)), putaran: PUTARAN }))
}
