import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig 의 paths(@/*) 를 Vite 가 직접 읽는다. 별도 플러그인 없음.
    tsconfigPaths: true,
    alias: {
      // 'server-only' 는 Next 런타임 밖(vitest)에서 import 되면 throw 한다. 테스트에선 빈 모듈로 바꾼다.
      'server-only': fileURLToPath(new URL('./src/test/server-only.mock.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // 테스트가 .next 나 node_modules 를 읽지 않게
    exclude: ['node_modules', '.next'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/mocks/**',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
      ],
    },
  },
});
