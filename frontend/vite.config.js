import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow ngrok (and similar) tunnels for client previews
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
  },
})

