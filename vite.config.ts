import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from a domain root or a sub-path
// (e.g. GitHub Pages at /continuum-performance/).
export default defineConfig({
  base: './',
  plugins: [react()],
});
