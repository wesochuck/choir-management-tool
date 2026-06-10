import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettierConfig from 'eslint-config-prettier'
import noEffectStateCycle from './eslint-rules/no-effect-state-cycle.js'
import noHardcodedInlineStyles from './eslint-rules/no-hardcoded-inline-styles.js'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'pocketbase/pb_data',
    'pocketbase/pocketbase',
    'pocketbase/types.d.ts',
    '.planning',
    'docs',
    'scratch',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
      'preserve-caught-error': 'off',
      'no-effect-state-cycle/no-effect-state-cycle': 'error',
      'no-hardcoded-inline-styles/no-hardcoded-inline-styles': 'error',
    },
    plugins: {
      'no-effect-state-cycle': { rules: { 'no-effect-state-cycle': noEffectStateCycle } },
      'no-hardcoded-inline-styles': { rules: { 'no-hardcoded-inline-styles': noHardcodedInlineStyles } },
    },
  },
  prettierConfig,
])
