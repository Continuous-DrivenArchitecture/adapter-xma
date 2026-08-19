// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'examples/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // This codebase deliberately keeps mapping tables/diagnostics typed
      // strictly (see README's "never switch statements" architecture
      // note) — no relaxations beyond the recommended preset.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
  {
    // The runtime (src/) is deliberately Node-free (browser-safe); only the
    // build-time helper script under scripts/ uses Node APIs.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // Tests parse arbitrary XML into untyped structures (fast-xml-parser's
    // output) to make ad-hoc assertions on shape — `any` there is a
    // pragmatic choice, not a lapse the way it would be in src/.
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
