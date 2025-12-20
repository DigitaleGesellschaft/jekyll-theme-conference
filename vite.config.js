import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Plugin to copy font files (woff/woff2) from source directories
const copyFontFiles = (sourceDirs, targetDir) => {
  return {
    name: 'copy-font-files',
    writeBundle() {
      const resolvedTargetDir = resolve(__dirname, targetDir);

      // Create target directory if it doesn't exist
      if (!existsSync(resolvedTargetDir)) {
        mkdirSync(resolvedTargetDir, { recursive: true });
      }

      // Process each source directory
      sourceDirs.forEach(sourceDir => {
        const resolvedSourceDir = resolve(__dirname, sourceDir);

        if (!existsSync(resolvedSourceDir)) {
          console.warn(`Source directory does not exist: ${resolvedSourceDir}`);
          return;
        }

        // Read all files in the source directory
        const files = readdirSync(resolvedSourceDir);

        // Filter for woff and woff2 files
        const fontFiles = files.filter(file =>
          file.endsWith('.woff') || file.endsWith('.woff2')
        );

        // Copy each font file
        fontFiles.forEach(file => {
          const source = resolve(resolvedSourceDir, file);
          const target = resolve(resolvedTargetDir, file);
          copyFileSync(source, target);
          console.log(`Copied ${file} from ${sourceDir} to ${targetDir}/`);
        });
      });
    },
  };
};

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
        // Suppress Bootstrap's Sass deprecation warnings
        // See https://getbootstrap.com/docs/5.3/getting-started/vite/#configure-vite
        silenceDeprecations: [
          'legacy-js-api',
          'import',
          'color-functions',
          'global-builtin',
        ],
        quietDeps: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [
    copyFontFiles(
      ['node_modules/bootstrap-icons/font/fonts'],
      'assets/webfonts'
    ),
  ],
});
