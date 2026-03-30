import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 4000,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:2000',
                changeOrigin: true,
                secure: false,
                rewrite: function (path) { return path.replace(/^\/api/, ''); },
            },
        },
    },
});
