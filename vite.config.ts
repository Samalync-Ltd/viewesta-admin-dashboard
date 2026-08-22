import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api requests to the real backend to avoid CORS issues in development.
      // In production (Vercel), requests go directly to the backend URL.
      '/api': {
        target: 'https://api.viewesta.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
