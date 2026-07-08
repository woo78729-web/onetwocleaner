import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/spa/',
  build: {
    outDir: '../public/spa',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('xlsx')) {
            return 'xlsx-vendor';
          }

          if (id.includes('html2canvas')) {
            return 'html2canvas-vendor';
          }

          if (
            id.includes('react-big-calendar')
            || id.includes('date-fns')
          ) {
            return 'calendar-vendor';
          }

          if (
            id.includes('react-dom')
            || id.includes('react-router')
            || id.includes('/react/')
          ) {
            return 'react-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
