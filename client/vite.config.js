import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks to Vite, which forwards /api to Express.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
