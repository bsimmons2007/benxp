import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'YouXP',
        short_name: 'YouXP',
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
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
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

    // esbuild drop — strips all console.* and debugger statements from production build
    minify: 'esbuild',

    // Hidden sourcemaps — uploaded to Sentry, never served to browsers
    sourcemap: 'hidden',

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
        },
      },
    },

    chunkSizeWarningLimit: 500,
  },

  // Strip console.* and debugger only in production
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] as const } : {},
}))
