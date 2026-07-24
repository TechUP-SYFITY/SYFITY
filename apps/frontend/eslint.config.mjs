// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import storybook from 'eslint-plugin-storybook';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    '.next-e2e/**', // Playwright E2E용 Next 빌드 산출물
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/generated/**',
    '.storybook/**',
    'test-results/**',
    'playwright-report/**',
  ]),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
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
      '@typescript-eslint/no-non-null-assertion': 'error',
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
      'no-console': 'warn',
      'no-nested-ternary': 'error',

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/self-closing-comp': 'error',

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
              pattern: '@/shared/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/features/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/app/**',
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
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/shared',
              from: ['./src/features', './src/widgets'],
              message: 'shared는 features/widgets를 import할 수 없습니다.',
            },
            {
              target: './src/features',
              from: './src/widgets',
              message: 'features는 widgets를 import할 수 없습니다.',
            },
            {
              target: './src/features/auth',
              from: './src/features',
              except: ['./auth'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
            {
              target: './src/features/room',
              from: './src/features',
              except: ['./room'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
            {
              target: './src/features/player',
              from: './src/features',
              except: ['./player'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
            {
              target: './src/features/playlist',
              from: './src/features',
              except: ['./playlist'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
            {
              target: './src/features/chat',
              from: './src/features',
              except: ['./chat'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
            {
              target: './src/features/presence',
              from: './src/features',
              except: ['./presence'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
            {
              target: './src/features/search',
              from: './src/features',
              except: ['./search'],
              message: 'features 간 직접 import는 금지입니다. 공통 로직은 shared로 이동하세요.',
            },
          ],
        },
      ],
    },
  },
  {
    ...betterTailwindcss.configs.recommended,
    files: ['**/*.{ts,tsx}'],
    settings: {
      'better-tailwindcss': {
        cwd: projectRoot,
        entryPoint: path.join(projectRoot, 'src/app/globals.css'),
        tsconfig: path.join(projectRoot, 'tsconfig.json'),
      },
    },
    rules: {
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
  {
    // Playwright fixture는 `async ({ page }, use) => { ... await use(value) }` 형태를 쓴다.
    // react-hooks 규칙이 이 `use`를 React Hook으로 오인하므로 E2E 디렉터리에서만 끈다.
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]);

export default eslintConfig;
