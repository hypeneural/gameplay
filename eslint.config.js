import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

const gameDomain = ['packages/games/*/src/domain/**/*.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: [
      '.reference/**',
      'node_modules/**',
      '**/dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'docs/generated/evidence/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/*/src/**' },
        { type: 'game-domain', pattern: 'packages/games/*/src/domain/**' },
        { type: 'game-runtime', pattern: 'packages/games/*/src/runtime/**' },
        { type: 'platform', pattern: 'packages/platform/src/**' },
        { type: 'theme', pattern: 'packages/theme/src/**' },
        { type: 'tool', pattern: 'tools/*/src/**' },
      ],
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'game-domain' } },
              disallow: { to: { element: { types: { anyOf: ['app', 'game-runtime'] } } } },
            },
            {
              from: { element: { type: 'platform' } },
              disallow: { to: { element: { types: { anyOf: ['game-domain', 'game-runtime'] } } } },
            },
            {
              from: { element: { type: 'theme' } },
              disallow: { to: { element: { types: { anyOf: ['game-domain', 'game-runtime'] } } } },
            },
            {
              from: { element: { type: 'tool' } },
              disallow: {
                to: { element: { types: { anyOf: ['app', 'game-domain', 'game-runtime'] } } },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: gameDomain,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: 'Domain must remain independent of Phaser.' },
            { name: 'react', message: 'Domain must remain independent of React.' },
            { name: 'react-dom', message: 'Domain must remain independent of React.' },
          ],
          patterns: [
            {
              group: ['**/runtime/**', 'apps/**'],
              message: 'Domain must not import runtime or app code.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'fetch', 'localStorage', 'Date'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Inject Random into domain code.' },
        { object: 'Date', property: 'now', message: 'Inject Clock into domain code.' },
      ],
    },
  },
  {
    files: ['**/*.cjs', '**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
);
