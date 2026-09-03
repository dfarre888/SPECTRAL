import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false,
    exclude: ['**/node_modules/**', '**/dist/**', 'docs/**/*.spec.ts', 'wip/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'test/server-only-stub.ts'),
    },
  },
});
