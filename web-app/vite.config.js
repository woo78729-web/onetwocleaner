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

          // 僅拆離登入頁完全不需要的超大型套件。
          // 不要手動拆 react / date-fns / react-big-calendar，避免 chunk 依賴錯位拖慢首屏。
          if (id.includes('xlsx')) {
            return 'xlsx-vendor';
          }

          if (id.includes('html2canvas')) {
            return 'html2canvas-vendor';
          }

          return undefined;
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
