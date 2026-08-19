import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: {
        // Set with headroom below the current measured coverage (~93.5%
        // statements / 86% branches / 98% functions / 95% lines) — tight
        // enough to catch a real regression, loose enough not to fail CI on
        // routine changes.
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
