import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'node_modules/',
      'private/',
      'src/engine/config/bundle.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The reference plan's independent calculator is plain Node JavaScript.
    files: ['tests/fixtures/reference-plan/calculator/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', structuredClone: 'readonly' },
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/main.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Rule values come from config; engine settings from constants.ts.
    files: ['src/engine/**/*.ts'],
    ignores: ['src/engine/constants.ts'],
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1, 2, 100],
          ignoreNumericLiteralTypes: true,
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreArrayIndexes: true,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', '**/state/**', '@/ui/*', '@/state/*'],
              message: 'The engine must not import screen or store code.',
            },
          ],
        },
      ],
    },
  },
  {
    // Inside the calculation, today's dollars must not exist.
    files: [
      'src/engine/solver/**/*.ts',
      'src/engine/project/**/*.ts',
      'src/engine/simulate/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@engine/units',
              importNames: ['TodayDollars'],
              message: 'The solver, projection and simulation work in future dollars only.',
            },
          ],
          patterns: [
            {
              group: ['**/units'],
              importNames: ['TodayDollars'],
              message: 'The solver, projection and simulation work in future dollars only.',
            },
          ],
        },
      ],
    },
  },
);
