export default [
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts', '**/*.ts', '**/*.tsx'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
