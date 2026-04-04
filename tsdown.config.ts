import { defineConfig } from 'tsdown';

export default defineConfig([
  // Runtime plugin definition — emdash is a peer dep, keep it external
  {
    entry: { index: 'src/index.ts' },
    format: 'esm',
    dts: true,
    clean: true,
    external: ['emdash', /^@emdash-cms\//],
    outDir: 'dist',
  },
  // Descriptor — build-time only, imported in astro.config.mjs via Vite
  {
    entry: { descriptor: 'src/descriptor.ts' },
    format: 'esm',
    dts: true,
    external: ['emdash', /^@emdash-cms\//],
    outDir: 'dist',
  },
  // Admin UI — browser bundle; React and emdash admin are externals loaded by host
  {
    entry: { admin: 'src/admin.tsx' },
    format: 'esm',
    dts: true,
    external: ['react', 'react/jsx-runtime', 'react-dom', 'emdash', /^@emdash-cms\//],
    outDir: 'dist',
  },
]);
