import path from "node:path";
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'restivism-offline-shell',
      apply: 'build',
      generateBundle(_options, bundle) {
        // Cache only public app assets. Private records never enter fetch or CacheStorage.
        const assets = Object.keys(bundle).filter(name => /\.(js|css|woff2?)$/.test(name)).map(name => `/${name}`).sort();
        const worker = readFileSync('public/sw.js', 'utf8');
        const version = createHash('sha256').update(JSON.stringify(assets) + worker + readFileSync('index.html', 'utf8') + readFileSync('public/manifest.webmanifest', 'utf8')).digest('hex').slice(0, 16);
        this.emitFile({ type: 'asset', fileName: 'offline-assets.json', source: JSON.stringify({ version, assets: ['/', '/favicon.svg', '/manifest.webmanifest', ...assets] }) });
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker.replace('__RESTIVISM_BUILD__', version) });
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/{vite,eslint}.config.*',
      '.agents/**',
    ],
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
