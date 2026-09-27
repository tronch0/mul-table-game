import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icons/*.png'],
    manifest: {
      name: 'אלופי הכפל · Multiply Club', short_name: 'אלופי הכפל',
      description: 'משחק לוח הכפל — תרגיל אחד, ניצחון קטן.',
      lang: 'he', dir: 'rtl', theme_color: '#087f73', background_color: '#f3f7f7',
      display: 'standalone', start_url: '.', scope: '.',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: 'index.html' },
  })],
})
