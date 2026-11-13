/* Duitku: simpan file aplikasi di HP supaya terbuka seketika walau internet lambat atau putus.
   Hanya menyimpan berkas aplikasi milik sendiri. Panggilan data (login, simpan, dll) tidak pernah disentuh. */
const NAMA = 'duitku-v1'
const MAKS = 80

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== NAMA) await caches.delete(k)
  await self.clients.claim()
})()))

async function rapikan(cache) {
  const keys = await cache.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - MAKS))) await cache.delete(k)
}

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (u.origin !== self.location.origin || u.pathname.endsWith('.php') || u.pathname.includes('/duitku/')) return
  const aset = u.pathname.includes('/assets/') // nama berkas berubah tiap versi, aman disimpan lama
  e.respondWith((async () => {
    const cache = await caches.open(NAMA)
    const ada = await cache.match(r.url)
    if (ada && aset) return ada
    const segar = fetch(r).then((res) => {
      if (res && res.ok && !res.redirected && res.type === 'basic') { cache.put(r.url, res.clone()).then(() => rapikan(cache)) }
      return res
    }).catch(() => null)
    if (ada) { e.waitUntil(segar); return ada } // tampil dulu dari HP, perbarui diam-diam
    return (await segar) || Response.error()
  })())
})
