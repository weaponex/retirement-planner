import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Coverage thresholds apply from the stage-2 tag, when CI sets ENFORCE_COVERAGE
// (see the design's Verification Plan). The globs do not overlap: 90% of
// branches for the engine, 80% for the store and the Worker, 70% for the screens.
const ENFORCE_COVERAGE = process.env.ENFORCE_COVERAGE === 'true';

export default defineConfig({
  plugins: [tsconfigPaths()],
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    include: ['tests/{unit,property,reference}/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/engine/config/bundle.ts', 'src/main.tsx'],
      thresholds: ENFORCE_COVERAGE
        ? {
            'src/engine/**': { branches: 90 },
            'src/{state,worker}/**': { branches: 80 },
            'src/ui/**': { branches: 70 },
          }
        : {},
    },
  },
});
