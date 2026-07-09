import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  globalIgnores(['dist/**', 'src/generated/**', 'node_modules/**']),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-shadow': 'error',

      // 일반
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      'no-nested-ternary': 'error',

      // Import 순서
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: '@syfity/shared',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: './lib/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: './middlewares/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: './repositories/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: './services/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: './controllers/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: './routes/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: './socket/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',

      // 레이어 단방향 의존 규칙
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Repository는 services, controllers, routes import 금지
            {
              target: './src/repositories',
              from: './src/services',
              message: 'repository는 service를 import할 수 없습니다.',
            },
            {
              target: './src/repositories',
              from: './src/controllers',
              message: 'repository는 controller를 import할 수 없습니다.',
            },
            {
              target: './src/repositories',
              from: './src/routes',
              message: 'repository는 router를 import할 수 없습니다.',
            },
            // Service는 controllers, routes import 금지
            {
              target: './src/services',
              from: './src/controllers',
              message: 'service는 controller를 import할 수 없습니다.',
            },
            {
              target: './src/services',
              from: './src/routes',
              message: 'service는 router를 import할 수 없습니다.',
            },
            // Controller는 routes import 금지
            {
              target: './src/controllers',
              from: './src/routes',
              message: 'controller는 router를 import할 수 없습니다.',
            },
            // Socket handlers는 routes, controllers import 금지
            {
              target: './src/socket',
              from: './src/routes',
              message: 'socket handler는 router를 import할 수 없습니다.',
            },
            {
              target: './src/socket',
              from: './src/controllers',
              message: 'socket handler는 controller를 import할 수 없습니다.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
