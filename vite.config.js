import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "assets/js",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "_js/main.js"),
      name: "Conference",
      fileName: () => "conference.bundle.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        // Ensure we generate a single file
        inlineDynamicImports: true,
        // Preserve the global window.conference object
        extend: true,
      },
    },
    minify: "esbuild",
    sourcemap: false,
  },
  // Define globals that will be available
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
