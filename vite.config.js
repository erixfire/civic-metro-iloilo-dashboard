import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        // Cache pages shell + assets aggressively; never cache API calls
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Open-Meteo weather: network-first, 10 min cache
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-cache',
              expiration: { maxAgeSeconds: 600 },
            },
          },
          {
            // OSM tiles: stale-while-revalidate, 7 day cache
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles-cache',
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
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Heat Index',
            short_name: 'Heat Index',
            description: 'Jump to Heat Index & Advisories',
            url: '/?section=heat-index',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Emergency',
            short_name: 'Emergency',
            description: 'Jump to Emergency Directory',
            url: '/?section=emergency',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
})
