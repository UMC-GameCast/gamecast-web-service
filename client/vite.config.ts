import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr()
  ],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app'], // 🔑 ngrok 도메인 허용
    // 개발용으로는 모든 호스트 허용도 가능
    // allowedHosts: 'all'
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
