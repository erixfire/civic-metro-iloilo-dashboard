import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// PWA: register service worker (autoUpdate mode)
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        // New content available; app will auto-update on next visit
        console.info('[PWA] New content available, will update on next reload.')
      },
      onOfflineReady() {
        console.info('[PWA] App is ready to work offline.')
      },
    })
  }).catch(() => {
    // vite-plugin-pwa not present in dev mode — ignore
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
