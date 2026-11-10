import { defineConfig } from 'vitest/config';

// @everp/auth 단위 테스트. 서버 모듈이라 node 환경
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
