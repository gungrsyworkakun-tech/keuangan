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
