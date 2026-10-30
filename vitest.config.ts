import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      // Model and firmware checks; no build needed.
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      // Checks on the built site in dist/; run after `npm run build`.
      { test: { name: 'dist', include: ['tests/dist/**/*.test.ts'] } },
    ],
  },
});
