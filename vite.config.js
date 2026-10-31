import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Service worker buforuje tylko pliki aplikacji. Odpowiedzi API zawsze idą do serwera,
    // żeby znalazca nigdy nie zobaczył nieaktualnego statusu zaginięcia.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PeTrace Alt',
        short_name: 'PeTrace',
        description: 'Tag NFC/QR na obroży – i Twój pupil wraca do domu.',
        lang: 'pl',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        background_color: '#F5F5F3',
        theme_color: '#FF5A3D',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
})
