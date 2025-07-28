import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Docker環境専用のVite設定
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
    watch: {
      // Docker環境でのファイル監視設定
      usePolling: true,
      interval: 2000, // ポーリング間隔を長めに設定
      depth: 2, // 監視の深さを制限
      // 大きなディレクトリを除外
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        '**/public/assets/**',
        '**/*.log',
        '**/.DS_Store',
        '**/tmp/**'
      ],
    },
    fs: {
      strict: true,
      // シンボリックリンクを無視
      allow: ['.'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // メモリ使用量を削減
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'utils': ['lodash', 'date-fns', 'marked'],
        },
      },
    },
  },
  // 最適化設定
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@vite-pwa/assets-generator'],
  },
});