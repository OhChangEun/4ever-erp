import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import everp from '@everp/eslint-plugin';

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/mockServiceWorker.js', // msw 가 생성한 파일
    'src/lib/api/openapi.gen.ts', // openapi-typescript 가 계약에서 만든 파일(npm run openapi)
    'coverage/**',
    '**/storybook-static/**', // Storybook 빌드 결과(Storybook 1 카드). 압축 JS 라 린트하면 10분 넘게 걸렸다
    '.turbo/**',
    'packages/ui/dist/**', // @everp/ui 라이브러리 빌드 결과(vite lib)
    '.lighthouseci/**',
  ]),
  ...nextVitals,
  ...nextTs,
  prettierRecommended,

  // 타입 정보를 쓰는 규칙. 근거는 ai/rules/react-typescript-antipatterns.md 의 R03, R12, R13, R14, R21.
  // 2026-11-09 측정값(현재 위반 수)을 주석에 적었다. 0이 되는 순서대로 warn → error 로 올린다.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'packages/ui/src/**/*.ts', 'packages/ui/src/**/*.tsx'],
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
      // no-explicit-any 는 eslint-config-next 가 이미 error. 억제 20건은 2026-11-10 타입 1차 카드에서 0.
      // 단언과 non-null 은 같은 카드에서 114 → 0, 13 → 0 이 돼 error 로 올렸다(as const 는 규칙이 제외함).
      // 남은 예외는 ModalProvider 의 제네릭 모달 props 한 줄(이유 주석 있음).
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }], // 0
      '@typescript-eslint/no-non-null-assertion': 'error', // 0
      // R13, R14 비동기 처리
      '@typescript-eslint/no-floating-promises': 'warn', // 90
      '@typescript-eslint/no-misused-promises': 'warn', // 4
      // 상태값 switch 누락 (STATUS_TEXT_MAP 류)
      '@typescript-eslint/switch-exhaustiveness-check': 'warn', // 3
      // 항상 참/거짓인 조건. 가드가 죽었는지 드러낸다
      '@typescript-eslint/no-unnecessary-condition': 'warn', // 89 (2026-11-10)
      // 타입 import 분리. --fix 로 한 번에 정리 가능. 린트 1차 브랜치가 머지된 뒤 돌린다
      '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }], // 376 (2026-11-10)
      // 날짜는 현지 기준(toDateKey). toISOString 은 UTC 라 한국 시간 오전 9시 전엔 어제가 된다(성능 2, 3 카드에서 8곳)
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.type='CallExpression'][callee.object.callee.property.name='toISOString']",
          message:
            "toISOString().split('T')[0] 은 UTC 날짜다. 현지 날짜는 '@/app/utils/date' 의 toDateKey 를 쓴다.",
        },
      ],
    },
  },

  // EverP 로컬 규칙(packages/eslint-plugin, 커스텀 ESLint 규칙 카드). 문서 규칙을 린트로 지킨다. 위반 0 에서 켰다(2026-11-10).
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'packages/ui/src/**/*.ts', 'packages/ui/src/**/*.tsx'],
    plugins: { everp },
    rules: {
      'everp/domain-boundary': 'error', // 다른 도메인은 그 도메인의 index.ts 로만
      'everp/no-component-mutation': 'error', // useMutation 은 *.mutations.ts 와 src/lib/query 에서만
      'everp/no-arbitrary-color': 'error', // bg-[#...] 대신 색 토큰
    },
  },

  // 전역 axios 인터셉터(src/lib/axiosInstance.ts)를 거치지 않는 것처럼 보이는 import 를 막는다.
  // 결정: ai/decisions.md 2026-11-09 "전역 axios 인스턴스". 0건(2026-11-09 queryClient 카드에서 마지막 2곳 정리).
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
    files: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'packages/*/src/**/*.test.tsx',
      'vitest.setup.ts',
    ],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-imports': 'off', // 테스트는 AxiosError 로 오류 모양을 만들어야 한다
    },
  },
]);
