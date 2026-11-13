import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Perlindungan tambahan hanya untuk hasil build (di mode dev tidak dipasang agar HMR jalan)
const csp = {
  name: 'duitku-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://script.google.com https://script.googleusercontent.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'" />
    <meta name="referrer" content="no-referrer" />`
    ),
}

export default defineConfig({ base: './', plugins: [react(), csp] })
