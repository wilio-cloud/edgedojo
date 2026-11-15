import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const isGhPages = process.env.GITHUB_PAGES === 'true';
const base = isGhPages ? '/edgedojo/' : '/';

export default defineConfig({
  base,
  server: {
    host: '0.0.0.0',
    port: 5178,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5178,
    allowedHosts: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
      ],
      manifest: {
        name: 'EdgeDojo — Price Action Pro',
        short_name: 'EdgeDojo',
        description:
          'Entrenador tàctic de Price Action, Liquidesa, MNQ Scalping, Crypto Swing i Gestió del Risc',
        theme_color: '#070B12',
        background_color: '#070B12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        globIgnores: ['**/og-card.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
