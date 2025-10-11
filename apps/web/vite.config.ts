import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'], // 👈 Add this exclude option
  },
    resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})