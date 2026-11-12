import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The icon and emoji sets as one ES module per icon / emoji, run after the main library build (vite.lib.config.ts):
//   npm run build:lib
//
// The main build bundles each set into a single file (dist/icons.mjs, 1.9 MB; dist/emoji.mjs, 8.9 MB). Their exports
// are pure, so Rollup and esbuild keep only what an app imports, but other bundlers don't split a module that big:
// Next.js (Turbopack) shipped the whole of both to sakaniui.com, about 1.4 MB gzipped on every page, seven seconds
// on a 3G connection. One module each lets every bundler drop what isn't imported, at module level.
//
// Writes dist/icons/index.mjs and dist/emoji/index.mjs (re-exporting dist/icons/outline/*.mjs, dist/emoji/art/*.mjs,
// ...), which package.json's "import" conditions for ./icons and ./emoji point to. CommonJS keeps the single files.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        icons: path.resolve(__dirname, 'src/icons/index.ts'),
        emoji: path.resolve(__dirname, 'src/emoji/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].mjs',
      },
    },
  },
});
