import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "assets",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        "js/conference.bundle": resolve(__dirname, "_js/main.js"),
        "css/conference.bundle": resolve(__dirname, "_css/main.scss"),
      },
      output: {
        // JavaScript output configuration
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        // Asset output configuration
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "css/conference.bundle.css";
          }
          return "[name][extname]";
        },
        // Ensure we generate a single file
        inlineDynamicImports: false,
      },
    },
    minify: "esbuild",
    sourcemap: false,
    cssCodeSplit: false,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Allow importing from node_modules
        includePaths: ["node_modules"],
      },
    },
  },
  // Define globals that will be available
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
