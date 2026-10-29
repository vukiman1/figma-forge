import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export const DOM_TESTS = [
  'test/components/**/*.test.ts',
  'test/composables/**/*.test.ts',
  'test/sandbox/messaging.test.ts',
];

export default defineConfig({
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify('0.0.0-test') },
  test: {
    name: 'plugin',
    include: ['test/**/*.{test,spec}.ts'],
    exclude: DOM_TESTS,
    environment: 'node',
  },
});
