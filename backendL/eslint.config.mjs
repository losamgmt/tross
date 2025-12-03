// ESLint Flat Config (v9+) for Backend
export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'logs/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '__tests__/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        exports: 'writable',
        global: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      // Possible Errors
      'no-console': 'off', // Allow console in backend
      'no-debugger': 'warn',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'warn',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',

      // Best Practices
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-multi-spaces': 'warn',
      'no-return-await': 'warn',
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-var': 'error',
      'prefer-const': 'warn',

      // Style
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],
      'no-trailing-spaces': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2 }],
    },
  },
];
