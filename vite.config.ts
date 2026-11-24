import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Content security policy and noindex, added to the built app only.
// Local development (vite dev) needs inline scripts and a live-reload
// connection, which this policy would block.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "worker-src 'self' blob:",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ');

function securityMeta(): Plugin {
  return {
    name: 'retirement-planner:security-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
        {
          tag: 'meta',
          attrs: { name: 'robots', content: 'noindex' },
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig({
  base: '/retirement-planner/',
  plugins: [react(), tsconfigPaths(), securityMeta()],
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
