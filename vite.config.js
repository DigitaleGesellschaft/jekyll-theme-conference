import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'assets',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'js/conference.bundle': resolve(__dirname, '_js/main.js'),
        'css/conference.bundle': resolve(__dirname, '_css/main.scss'),
      },
      output: {
        // Main JavaScript
        entryFileNames: '[name].js',

        // CSS and other assets
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/conference.bundle.css';
          }
          return '[name][extname]';
        },

        // Split lazy-loaded modules into separate chunks
        chunkFileNames: 'js/[name].bundle.js',
        manualChunks: (id) => {
          // Leaflet
          if (id.includes('leaflet')) {
            return 'leaflet';
          }
        },
      },
    },
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: false,
    target: 'es2020',
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: ['node_modules'],
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
