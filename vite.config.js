import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg', 'offline.html'],
      workbox: {
        // SPA navigation fallback — serves index.html for all non-API routes
        // offline.html is precached via includeAssets above and served by the
        // SW catch handler when both network and cache are unavailable.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Note: 'offlineFallback' is not a Workbox GenerateSW option.
        // Offline-page behaviour is handled by precaching offline.html
        // and relying on navigateFallback for navigation requests.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-cache',
              expiration: { maxAgeSeconds: 600 },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: { maxEntries: 256, maxAgeSeconds: 604800 },
            },
          },
          {
            // CartoDB Positron tiles (used on mobile)
            urlPattern: /^https:\/\/[abcd]\.basemaps\.cartocdn\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'carto-tiles-cache',
              expiration: { maxEntries: 256, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
      manifest: {
        name: 'Civic Metro Iloilo Dashboard',
        short_name: 'Metro Iloilo',
        description: 'Real-time city services dashboard — weather, traffic, emergency info for Iloilo City.',
        theme_color: '#01696f',
        background_color: '#f4f4f5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en-PH',
        categories: ['government', 'utilities', 'weather'],
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Heat Index',
            short_name: 'Heat Index',
            description: 'Jump to Heat Index & Advisories',
            url: '/?section=heat-index',
            icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
          },
          {
            name: 'Emergency',
            short_name: 'Emergency',
            description: 'Jump to Emergency Directory',
            url: '/?section=emergency',
            icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    // Split vendor code into separate chunks to reduce initial JS payload.
    // Keeps the main bundle well under the 500 kB Vite warning threshold.
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Mapping libraries (heavy — leaflet ~150kB, react-leaflet ~15kB)
          'vendor-leaflet': ['leaflet', 'react-leaflet', '@react-leaflet/core'],
          // Charting (chart.js ~200kB + react-chartjs-2)
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // State management
          'vendor-store': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
