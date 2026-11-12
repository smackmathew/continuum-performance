import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from a domain root or a sub-path.
// Four pages, built separately so each loads only its own code: the public
// site (index.html), the team hub (admin/), the client onboarding form (start/)
// and the membership checkout page (pay/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800, // the hub (only loaded at /admin) bundles the full Firebase SDK
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        start: resolve(__dirname, 'start/index.html'),
        pay: resolve(__dirname, 'pay/index.html'),
      },
    },
  },
});
