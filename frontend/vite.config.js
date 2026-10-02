import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Redireciona chamadas /api para o backend em desenvolvimento
      '/api': 'http://localhost:5000',
    },
  },
});
