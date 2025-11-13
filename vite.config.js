import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: '/QuickChain/',
  plugins: [
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      // Enable specific modules
      protocolImports: true
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
