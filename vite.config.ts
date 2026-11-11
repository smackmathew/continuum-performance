import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from a domain root or a sub-path.
// Two pages: the public site (index.html) and the team hub (admin/index.html),
// built separately so the public site doesn't load the hub's code.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800, // the hub (only loaded at /admin) bundles the full Firebase SDK
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
});
