import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'client'),
  plugins: [
    react({
      jsxRuntime: 'classic',
    })
  ],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    strictPort: false,
    hmr: {
      port: 24679
    }
  }
});
