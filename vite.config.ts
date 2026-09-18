import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.svg',
          'pwa-192x192.svg',
          'pwa-512x512.svg',
          'pwa-maskable-512x512.svg',
          'manifest.json'
        ],
        manifest: {
          id: '/',
          name: 'Jimpitan RT - Scanner QR & Rekap Kas Warga',
          short_name: 'Jimpitan RT',
          description: 'Aplikasi Jimpitan RT digital berbasis QR Code untuk ronda malam siskamling, rekapitulasi kas warga, dan transparansi keuangan.',
          theme_color: '#340d57',
          background_color: '#2b0f4a',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            },
            {
              src: '/apple-touch-icon.svg',
              sizes: '180x180',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/favicon.svg',
              sizes: '64x64',
              type: 'image/svg+xml',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB limit for complete offline caching
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'image-assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-icons': ['lucide-react'],
            'vendor-qr': ['qrcode', 'html5-qrcode'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
