import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/mockServiceWorker.js', // msw 가 생성한 파일
    'coverage/**',
  ]),
  ...nextVitals,
  ...nextTs,
  prettierRecommended,

  // 타입 정보를 쓰는 규칙. 근거는 ai/rules/react-typescript-antipatterns.md 의 R03, R12, R13, R14, R21.
  // 2026-11-09 측정값(현재 위반 수)을 주석에 적었다. 0이 되는 순서대로 warn → error 로 올린다.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 린트 1차(2026-11-09). `{ a, ...rest }` 로 a 를 빼는 패턴과 `_` 로 시작하는 인자는 허용
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],
      // R21 타입 안정성 우회 금지
      // no-explicit-any 는 eslint-config-next 가 이미 error. 20건(전부 src/mocks/handlers/sales.handlers.ts)은
      // eslint-suppressions.json 에 억제돼 있다. 여기서 수준을 바꾸면 억제가 "안 쓰임"으로 바뀌어 lint 가 exit 2 로 실패한다.
      '@typescript-eslint/consistent-type-assertions': ['warn', { assertionStyle: 'never' }], // 114 (as const 는 규칙이 제외함)
      '@typescript-eslint/no-non-null-assertion': 'warn', // 13
      // R13, R14 비동기 처리
      '@typescript-eslint/no-floating-promises': 'warn', // 90
      '@typescript-eslint/no-misused-promises': 'warn', // 4
      // 상태값 switch 누락 (STATUS_TEXT_MAP 류)
      '@typescript-eslint/switch-exhaustiveness-check': 'warn', // 3
      // 항상 참/거짓인 조건. 가드가 죽었는지 드러낸다
      '@typescript-eslint/no-unnecessary-condition': 'warn', // 100
      // 타입 import 분리. --fix 로 한 번에 정리 가능. 린트 1차 브랜치가 머지된 뒤 돌린다
      '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }], // 402
    },
  },

  // 전역 axios 인터셉터(src/lib/axiosInstance.ts)를 거치지 않는 것처럼 보이는 import 를 막는다.
  // 결정: ai/decisions.md 2026-11-09 "전역 axios 인스턴스". 2건(inventory.api.ts, production.api.ts 는 린트 1차 브랜치가 수정 중). 그 브랜치 머지 뒤 0 으로.
  {
    files: ['src/app/**/*.ts', 'src/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'axios',
              message: "'@/lib/axiosInstance' 를 import 한다. 오류 정규화 인터셉터가 거기 있다.",
            },
          ],
        },
      ],
    },
  },

  // 테스트 파일: 단언과 non-null 은 테스트 가독성을 위해 허용
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-imports': 'off', // 테스트는 AxiosError 로 오류 모양을 만들어야 한다
    },
  },
]);
