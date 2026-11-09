import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// @everp/ui 단위 테스트(모노레포 2 카드). 앱과 같은 jsdom 과 jest-dom
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
