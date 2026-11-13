export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
export const tanggal = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
export const bulanKey = (iso) => iso.slice(0, 7)
export const bulanLabel = (key) =>
  new Date(key + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
export const bulanPendek = (key) =>
  new Date(key + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'short' })
export const hariIni = () => new Date().toISOString().slice(0, 10)
export const uid = () => Math.random().toString(36).slice(2, 10)
export const inisial = (nama) =>
  (nama || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?'
// 9.000.000 -> "9 jt", 2.500.000 -> "2,5 jt", 450.000 -> "450 rb"
export const ringkas = (n) => {
  const a = Math.abs(n), s = n < 0 ? '−' : ''
  if (a >= 1e9) return s + (a / 1e9).toFixed(a % 1e9 ? 1 : 0).replace('.', ',') + ' M'
  if (a >= 1e6) return s + (a / 1e6).toFixed(a % 1e6 ? 1 : 0).replace('.', ',') + ' jt'
  if (a >= 1e3) return s + Math.round(a / 1e3) + ' rb'
  return s + a
}
