import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'BenXP',
        short_name: 'BenXP',
        description: 'Gamified life tracker',
        id: '/',
        start_url: '/',
        display: 'standalone',
        background_color: '#1A1A2E',
        theme_color: '#1A1A2E',
        orientation: 'portrait',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Cache all JS/CSS/HTML on install
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        // Runtime caching for Supabase API calls — network-first with fallback
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 10,
              // Only cache successful responses — prevents caching 4xx/5xx errors
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts':   ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
