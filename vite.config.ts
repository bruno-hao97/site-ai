import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const gommoAuthTarget = 'https://api.gommo.net';
const localApi = 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      // Public Gommo auth/site-config — proxy thẳng (tránh lỗi qua Express dev)
      '/api/apps/go-mmo': { target: gommoAuthTarget, changeOrigin: true, secure: true },
      '/api/v2': { target: gommoAuthTarget, changeOrigin: true, secure: true },
      '/api/auth': { target: localApi, changeOrigin: true },
      '/api/payos': { target: localApi, changeOrigin: true },
      '/api/telegram': { target: localApi, changeOrigin: true },
      '/api/ops': { target: localApi, changeOrigin: true },
      '/api': { target: localApi, changeOrigin: true },
      '/ai': { target: localApi, changeOrigin: true },
      '/v2': { target: localApi, changeOrigin: true },
    },
  },
});
