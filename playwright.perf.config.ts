import { defineConfig } from '@playwright/test';

/**
 * 성능 측정(성능 블록 기준선 카드). 운영 빌드(next start)를 띄워 화면 3개의 LCP, 긴 작업, 요청 수를 잰다.
 * 측정이라 CI 에서 돌리지 않는다. 먼저 npm run build. 실행: npm run perf
 * 로컬 맥 한 대의 값이라 절대값보다 같은 기계의 전후 비교에 쓴다.
 */
const PORT = 3200;

export default defineConfig({
  testDir: './perf',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    locale: 'ko-KR',
  },
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
