import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Fallback for direct /stream/* access (e.g. HLS segments fetched by hls.js
      // via a URL that bypasses the /api prefix rewrite)
      '/stream': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // No source maps in production — prevents reverse-engineering
    sourcemap: false,
    // Minify & mangle for obfuscation
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,
        // NOTE: never mangle properties — breaks React/library internals
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        // Randomised chunk names to prevent guessing
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'player': ['hls.js'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
});
