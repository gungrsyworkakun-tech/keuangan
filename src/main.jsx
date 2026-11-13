import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.jsx'
createRoot(document.getElementById('root')).render(<App />)

// Simpan berkas aplikasi di perangkat supaya terbuka cepat (hanya di versi jadi, bukan saat pengembangan)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}) })
}
