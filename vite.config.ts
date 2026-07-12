import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // autoUpdate: no prompt UI exists, so a waiting SW would never activate
      // and installed PWAs would run stale builds indefinitely after deploys.
      registerType: 'autoUpdate',
      manifest: false,
      includeAssets: ['favicon.svg', 'icons.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      workbox: {
        // Push + notificationclick handlers, imported into the generated SW.
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{css,html,ico,png,svg}', 'assets/*.js'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Target modern browsers — smaller output, native ESM, no legacy transforms
    target: 'esnext',

    // Inline assets < 4 kB (most SVG icons)
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts':   ['recharts'],
          'vendor-form':     ['react-hook-form'],
          'vendor-state':    ['zustand'],
          'vendor-anime':    ['animejs'],
        },
      },
    },

    chunkSizeWarningLimit: 500,
  },
})
