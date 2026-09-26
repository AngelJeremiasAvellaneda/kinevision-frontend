import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // Charts
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // Icons
          'vendor-icons': ['lucide-react'],
          // MediaPipe — largest chunk, loaded lazily anyway
          'vendor-mediapipe': ['@mediapipe/tasks-vision'],
        }
      }
    }
  }
})
