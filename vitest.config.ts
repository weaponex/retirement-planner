import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Coverage thresholds start at the stage-2 tag (see the design's Verification
// Plan). Until then coverage is reported but not enforced.
const ENFORCE_COVERAGE = process.env.ENFORCE_COVERAGE === 'true';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/{unit,property,reference}/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/engine/config/bundle.ts', 'src/main.tsx'],
      thresholds: ENFORCE_COVERAGE
        ? {
            'src/engine/**': { branches: 90 },
            'src/**': { branches: 70 },
          }
        : {},
    },
  },
});
