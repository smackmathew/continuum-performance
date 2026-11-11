import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rules test files share one emulator, so run them one at a time.
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 20000, fileParallelism: false },
});
