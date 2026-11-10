import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@portal': fileURLToPath(new URL('./src', import.meta.url)),
      // 'server-only' 는 Next 밖에서 import 하면 throw 한다. 테스트에선 빈 모듈
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
