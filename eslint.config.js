import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import tailwind from 'eslint-plugin-tailwindcss';
import noEffectStateCycle from './eslint-rules/no-effect-state-cycle.js';
import noHardcodedInlineStyles from './eslint-rules/no-hardcoded-inline-styles.js';

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'pocketbase/**',
    'test/**',
    '.planning',
    'docs',
    'scratch',
  ]),
  {
    ...tailwind.configs.recommended,
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    settings: {
      tailwindcss: {
        cssConfigPath: './src/index.css',
      },
    },
    rules: {
      'tailwindcss/no-custom-classname': [
        'error',
        {
          whitelist: [
            'no-print',
            'seating-row-label',
            'progress-ring__circle',
            'progress-ring__circle-bg',
            'grid-print',
            'director-indicator',
            'seating-row-action-btn',
            'seating-toolbar',
            'prose',
            'public-site',
          ],
        },
      ],
      'tailwindcss/no-contradicting-classname': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unreachable': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
      'preserve-caught-error': 'off',
      'no-effect-state-cycle/no-effect-state-cycle': 'error',
      'no-hardcoded-inline-styles/no-hardcoded-inline-styles': 'error',
    },
    plugins: {
      'no-effect-state-cycle': { rules: { 'no-effect-state-cycle': noEffectStateCycle } },
      'no-hardcoded-inline-styles': {
        rules: { 'no-hardcoded-inline-styles': noHardcodedInlineStyles },
      },
    },
    settings: {
      tailwindcss: {
        cssConfigPath: './src/index.css',
      },
    },
  },
  prettierConfig,
]);
