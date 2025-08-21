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
    allowedHosts: 'all', // 🔑 모든 호스트에서 접속 허용 (개발용)
    // 프로덕션에서는 특정 도메인만 허용:
    // allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app']
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
