import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node24',
  platform: 'node',

  dts: false,
  clean: true,
  shims: false,

  define: {
    __FIGMA_FORGE_BUILD_ID__: JSON.stringify(String(Date.now())),
  },
  fixedExtension: true,
  publint: true,
  deps: { alwaysBundle: ['@figma-forge/core'] },
  outputOptions: {
    banner: '#!/usr/bin/env node',
  },
});
