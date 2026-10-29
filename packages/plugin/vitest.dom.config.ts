import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

import { DOM_TESTS } from './vitest.config.js';

export default defineConfig({
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify('0.0.0-test') },
  test: {
    name: 'plugin-dom',
    include: DOM_TESTS,
    environment: 'happy-dom',
  },
});
