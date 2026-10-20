import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Ishlab chiqish: `npm run dev` (frontend, 5173-port) + serverni alohida (3000-port) ishga tushiring.
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
});
