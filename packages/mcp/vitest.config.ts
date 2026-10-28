import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

/** Per-package config, discovered by the root's `projects` glob. Plain Node, no plugins needed. */
export default defineConfig({
  test: {
    name: 'mcp',
    include: ['test/**/*.{test,spec}.ts'],
    environment: 'node',
    env: { FIGMA_FORGE_PLUGIN_DIR: join(tmpdir(), 'figma-forge-test-plugin') },
  },
});
