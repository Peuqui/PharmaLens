import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import { serveStaticLargeFiles } from './vite-plugin-serve-static.js'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    https: false, // Erstmal ohne HTTPS
    // HMR will use the same host as the server connection
    hmr: true,
    // Increase server timeouts for large files
    middlewareMode: false,
    fs: {
      // Allow serving files from public directory
      strict: false,
      allow: ['..']
    }
  },
  // Optimize for large static files
  optimizeDeps: {
    exclude: ['opencv.js']
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks: {
          'opencv': ['/public/libs/opencv/opencv.js']
        }
      }
    }
  },
  plugins: [
    vue(),
    serveStaticLargeFiles(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Drug2QR - Medikamentenplan Scanner',
        short_name: 'Drug2QR',
        description: 'Medikamentenpläne scannen und digitalisieren',
        theme_color: '#0066CC',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm,traineddata}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB für große Dateien
        runtimeCaching: [
          {
            // Cache für lokale große Libraries
            urlPattern: /^\/libs\/(opencv|tesseract)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-libraries',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Tage
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
