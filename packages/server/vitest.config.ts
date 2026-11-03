import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    include: ['test/**/*.{test,spec}.ts'],
    environment: 'node',
    env: { FIGMA_FORGE_PLUGIN_DIR: join(tmpdir(), 'figma-forge-test-plugin') },
  },
});
