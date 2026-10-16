import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
//
// start.ng publishing rules (docs): the repo must contain a BUILT index.html (at the top, or in dist/, build/,
// docs/ or out/). A *source* index.html at the top of the repo is refused ("needs building first"), so this
// project's source page is app.html, and the build writes dist/index.html, which is committed.
const APP_PAGE = fileURLToPath(new URL('./app.html', import.meta.url));

function startNgPage(): Plugin {
  return {
    name: 'start-ng-page',
    // Dev: serve app.html at / so http://localhost:5173/ just works.
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = (req.url ?? '/').split('?');
        if (path === '/' || path === '/index.html') req.url = '/app.html' + (query ? `?${query}` : '');
        next();
      });
    },
    // Build: publish the page as dist/index.html.
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['app.html'];
        if (!page) return;
        page.fileName = 'index.html';
        bundle['index.html'] = page;
        delete bundle['app.html'];
      },
    },
  };
}

export default defineConfig({
  // Relative paths: start.ng requires them so the game works at <name>.start.ng (and anywhere else).
  base: './',
  plugins: [react(), startNgPage()],
  build: {
    rollupOptions: { input: APP_PAGE },
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
