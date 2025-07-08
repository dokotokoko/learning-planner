import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '探Qメイト - 探究学習支援アプリ',
        short_name: '探Qメイト',
        description: 'AIを活用した探究学習支援アプリケーション',
        theme_color: '#73bbff',
        background_color: '#ffffff',
        display: 'standalone',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1週間
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'mammoth-enabled-bird.ngrok-free.app',
      'localhost',
      '127.0.0.1'
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}); 