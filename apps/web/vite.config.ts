import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

function richContentChunk(id: string): string | undefined {
  const normalized = id.replaceAll('\\', '/');

  if (normalized.includes('/node_modules/katex/')) {
    return 'katex';
  }

  if (
    normalized.includes('/node_modules/d3-') ||
    normalized.includes('/node_modules/d3/')
  ) {
    return 'd3';
  }

  if (normalized.endsWith('/mermaid.core/chunk-WYO6CB5R.mjs')) {
    return 'mermaid-config';
  }

  if (normalized.endsWith('/mermaid.core/chunk-ZGVPDNZ5.mjs')) {
    return 'mermaid-rendering';
  }

  return undefined;
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: richContentChunk,
      },
    },
  },
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
