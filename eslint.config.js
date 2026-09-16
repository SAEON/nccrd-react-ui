import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '19.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      // This project has no TypeScript and never adopted the `prop-types`
      // package (not even a dependency) — the rule was firing on every
      // component purely because it's part of eslint-plugin-react's
      // "recommended" preset, not because runtime prop validation was ever
      // in use here. Adding prop-types declarations with no enforcement
      // behind them would be dead weight, not a real safety net.
      'react/prop-types': 'off',
      // react-hooks v7's "recommended" preset bundles the new React
      // Compiler-aligned rules, several of which are genuinely useful
      // (rules-of-hooks, exhaustive-deps, the use-before-declare checks
      // under "immutability" — all kept, and fixed several real call-order
      // issues they caught). set-state-in-effect is different: it flags
      // *any* function call from an effect body that transitively calls
      // setState, even inside an async function after an await — which
      // means it flags the standard "call an async loader from useEffect
      // on mount" data-fetching pattern itself, not just genuine
      // synchronous derived-state-via-effect bugs. That pattern is used
      // throughout this app (Home, SubmissionForm, SubmissionDetails,
      // CurrentUserContext) and is exactly what React's own docs show for
      // effect-based fetching without a data-fetching library. Satisfying
      // this rule properly would mean adopting something like TanStack
      // Query app-wide, which is a real architectural change, not a lint
      // fix — out of scope here.
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
