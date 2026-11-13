import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Alamat perantara (VITE_API_URL) ikut diizinkan di aturan CSP, selain Apps Script
const asalApi = (() => { try { return new URL(process.env.VITE_API_URL || 'https://cara-kinerja-ngr.my.id/duitku/api.php').origin } catch { return '' } })()

// Perlindungan tambahan hanya untuk hasil build (di mode dev tidak dipasang agar HMR jalan)
const csp = {
  name: 'duitku-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://script.google.com https://script.googleusercontent.com ${asalApi}; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'" />
    <meta name="referrer" content="no-referrer" />`
    ),
}

export default defineConfig({
  base: './',
  plugins: [react(), csp],
  build: {
    // React dipisah ke berkas sendiri: jarang berubah, jadi browser memakai salinan lama (hemat unduhan)
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'] } } },
  },
})
