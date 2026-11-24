import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Coverage thresholds apply from the stage-2 tag, when CI sets ENFORCE_COVERAGE
// (see the design's Verification Plan). The two globs do not overlap: the
// engine's target is 90% of branches, the rest of src/ 70% (pending M3).
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
            'src/{state,ui,worker}/**': { branches: 70 },
          }
        : {},
    },
  },
});
