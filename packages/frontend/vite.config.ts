import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split react-syntax-highlighter into separate chunk (only loaded with TranscriptViewer)
          if (id.includes('react-syntax-highlighter') || id.includes('refractor')) {
            return 'vendor-syntax';
          }
          // Split React/Router into vendor-react
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          // Split TanStack libraries
          if (id.includes('@tanstack')) {
            return 'vendor-query';
          }
          // All other node_modules go to vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
