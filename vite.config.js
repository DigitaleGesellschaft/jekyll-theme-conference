import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { defineConfig } from 'vite';

const copy = (source, target, filter = () => true) => {
  if (!existsSync(source)) {
    console.warn(`Source does not exist: ${source}`);
    return;
  }

  const stat = statSync(source);

  if (stat.isDirectory()) {
    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }

    for (const entry of readdirSync(source)) {
      if (entry === '.DS_Store') continue;
      copy(join(source, entry), join(target, entry), filter);
    }
  } else if (filter(basename(source))) {
    const targetDir = dirname(target);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    copyFileSync(source, target);
  }
};

// Plugin to copy all required assets (fonts and sass sources)
const copyAssetsPlugin = () => {
  return {
    name: 'copy-assets',
    writeBundle() {
      const nodeModules = resolve(import.meta.dirname, 'node_modules');
      const sassDir = resolve(import.meta.dirname, '_sass');
      const cssDir = resolve(import.meta.dirname, '_css');
      const webfontsDir = resolve(import.meta.dirname, 'assets/webfonts');

      // Font files (woff/woff2)
      copy(
        join(nodeModules, 'bootstrap-icons/font/fonts'),
        webfontsDir,
        (file) => file.endsWith('.woff') || file.endsWith('.woff2')
      );

      // Sass files from _css
      for (const file of ['bootstrap.scss', 'theme.scss']) {
        copy(join(cssDir, file), join(sassDir, file));
      }
      copy(join(cssDir, 'main.scss'), join(sassDir, 'conference.scss'));

      // Bootstrap SCSS
      copy(
        join(nodeModules, 'bootstrap/scss'),
        join(sassDir, 'bootstrap/scss'),
        (file) => file.endsWith('.scss')
      );

      // Bootstrap Icons SCSS/CSS
      copy(
        join(nodeModules, 'bootstrap-icons/font'),
        join(sassDir, 'bootstrap-icons/font'),
        (file) => file.endsWith('.scss') || file.endsWith('.css')
      );

      // Leaflet CSS files
      copy(
        join(nodeModules, 'leaflet/dist/leaflet.css'),
        join(sassDir, 'leaflet/dist/leaflet.css')
      );
      copy(
        join(nodeModules, 'leaflet-easybutton/src/easy-button.css'),
        join(sassDir, 'leaflet-easybutton/src/easy-button.css')
      );
      copy(
        join(nodeModules, 'leaflet.locatecontrol/dist/L.Control.Locate.css'),
        join(sassDir, 'leaflet.locatecontrol/dist/L.Control.Locate.css')
      );

      console.log('Assets copied successfully');
    },
  };
};

export default defineConfig({
  build: {
    outDir: 'assets',
    emptyOutDir: false,
    rolldownOptions: {
      input: {
        'js/conference': resolve(import.meta.dirname, '_js/main.js'),
        'css/conference': resolve(import.meta.dirname, '_css/main.scss'),
        'css/conference-only': resolve(import.meta.dirname, '_css/main-only.scss'),
      },
      output: {
        // Main JavaScript
        entryFileNames: '[name].bundle.js',

        // CSS and other assets
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            // Store any CSS (from SCSS) as .bundle.css
            return '[name].bundle.css';
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

        // Run modules only when imported, e.g. Leaflet plugins after Leaflet
        // set the global L. Also moves the bundler's helpers into a separate
        // chunk: the lazy chunks import them without the page's ?t= query,
        // which would load the entry a second time.
        strictExecutionOrder: true,
      },
    },
    sourcemap: false,
    // Preload URLs ignore the site's baseurl; chunks load on demand anyway
    modulePreload: false,
    cssCodeSplit: true,
    target: 'es2020',
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['node_modules'],
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
    copyAssetsPlugin(),
  ],
});
