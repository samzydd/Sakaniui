import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'node:path';

// Library build — produces the dist/ output published to npm as
// @sakaniui/react. Run with:
//   npm run build:lib
//
// Two entry points, published as two subpaths:
//   .        -> src/index.ts   (stable, fully-configurable components)
//   ./icons       -> src/icons/index.ts (the icon set: Tabler Icons, outline + filled)
//   ./emoji       -> src/emoji/index.ts (the emoji set: Fluent Emoji Flat, full colour)
//   ./blocks -> src/blocks/index.ts (copy-paste composition examples --
//     kept out of the main entry so importing them is an explicit,
//     separate choice, matching how they're already split out in Storybook)
export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.app.json',
      include: [
        'src/components/**/*.ts', 'src/components/**/*.tsx', 'src/index.ts',
        'src/blocks/**/*.ts', 'src/blocks/**/*.tsx',
        'src/icons/**/*.ts', 'src/icons/**/*.tsx',
        'src/emoji/**/*.ts', 'src/emoji/**/*.tsx',
        // index.ts re-exports from ./lib (LiquidGlass, HoverGroup, helpers): without these their types are `any`
        'src/lib/**/*.ts', 'src/lib/**/*.tsx',
      ],
      exclude: [
        'src/lib/**/*.stories.tsx', 'src/lib/**/*.test.tsx', 'src/lib/**/*.test.ts',
        'src/components/**/*.stories.tsx', 'src/components/**/*.test.tsx', 'src/components/**/*.test.ts',
        'src/blocks/**/*.stories.tsx', 'src/blocks/**/*.test.tsx', 'src/blocks/**/*.test.ts',
        // Experimental/broken alternate file, not part of the real
        // blocks/index.ts export graph -- see ChatInterfaceBlock/index.ts.
        'src/blocks/**/*-simple.tsx', 'src/blocks/**/*.backup',
      ],
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        blocks: path.resolve(__dirname, 'src/blocks/index.ts'),
        // 1,626 generated icon modules: a separate entry so the main bundle
        // doesn't carry them, and each export is pure so apps keep only the
        // icons they import.
        icons: path.resolve(__dirname, 'src/icons/index.ts'),
        // 1,594 generated emoji modules, same idea: their own entry, pure exports.
        emoji: path.resolve(__dirname, 'src/emoji/index.ts'),
      },
      name: 'SakaniDesignSystem',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'recharts'],
      output: {
        preserveModules: false,
        // Was a fallback to info.name, which Vite derives from
        // package.json's "name" field by default -- so the emitted CSS
        // filename silently changed (sakani-design-system.css -> react.css)
        // the moment the package was renamed to @sakaniui/react, breaking
        // package.json's exports["./style.css"] pointer. Forced to a fixed
        // name for CSS specifically; everything else (the JPG avatars a few
        // blocks import directly) keeps its own hashed name instead of also
        // being swept into "style.css".
        assetFileNames: (info) => {
          const name = info.name ?? (info as { names?: string[] }).names?.[0] ?? '';
          return name.endsWith('.css') ? 'style.css' : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
