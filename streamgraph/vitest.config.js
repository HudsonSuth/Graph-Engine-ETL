import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['explore/demos/registry-sanctions/**/*.test.js'],
    environment: 'node',
  },
});
