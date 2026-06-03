import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': proxyTarget,
      '/ws/socket.io': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'EPIPE') return
            if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') return
            if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') return
            console.error('WS proxy error:', err)
          })
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err: NodeJS.ErrnoException) => {
              if (err.code === 'EPIPE') return
              if (err.code === 'ECONNREFUSED') return
              if (err.code === 'ECONNRESET') return
            })
          })
        },
      },
      '/webhooks': proxyTarget,
    },
  },
})
