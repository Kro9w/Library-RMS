import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), basicSsl()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'], // 👈 Add this exclude option
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    https: {},
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // <-- ADD THIS LINE
  },
});
