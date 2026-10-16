import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
//
// start.ng publishing rules (docs): the game repo must contain a BUILT index.html (at the top or in dist/, build/,
// docs/ or out/); a source index.html at the top of the repo is refused ("needs building first"). So the Vite
// source page lives in web/, and the build is written to dist/, which is committed.
export default defineConfig({
  root: 'web',
  publicDir: '../public', // favicon, startng.json (leaderboard columns), cover.png are copied next to the built index.html
  // Relative paths: start.ng requires them so the game works at <name>.start.ng (and anywhere else).
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
