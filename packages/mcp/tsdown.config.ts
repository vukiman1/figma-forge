import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node24',
  platform: 'node',
  // Bin-only package: the entry is a stdio CLI with top-level side effects (it starts the election
  // and binds stdio on import), not a library. Emitting a `.d.mts` would only advertise an import
  // surface that must not be used — a stray `import '@figma-forge/mcp'` would seize the relay port.
  dts: false,
  clean: true,
  shims: false,
  // Build stamp for newest-build-wins election (src/build-id.ts). Epoch ms of this build; absent
  // (→ 0) when running unbundled, so only real builds participate in build ordering.
  define: {
    __FIGMA_FORGE_BUILD_ID__: JSON.stringify(String(Date.now())),
  },
  fixedExtension: true,
  publint: true,
  deps: { alwaysBundle: ['@figma-forge/shared'] },
  outputOptions: {
    banner: '#!/usr/bin/env node',
  },
});
