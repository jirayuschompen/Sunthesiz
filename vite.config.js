import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // ✅ แก้ตรงนี้
  server: {
    proxy: {
      '/sungrow': {  // ใช้ได้เฉพาะ dev เท่านั้น
        target: 'https://web3.isolarcloud.com.hk',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/sungrow/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
});