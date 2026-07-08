import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Enterprise-Workforce-Management-Platform-with-AI-Operations-Assistant/',
  server: {
    allowedHosts: true
  }
})
