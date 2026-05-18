import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separar dependencias pesadas del bundle principal. El visitante
        // mobile descarga solo lo que necesita para la home y no carga
        // firebase/papaparse/cloudinary hasta que se requieren.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('firebase')) return 'firebase'
          if (id.includes('papaparse')) return 'papaparse'
          if (id.includes('@cloudinary')) return 'cloudinary'
          if (id.includes('@emailjs')) return 'emailjs'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
