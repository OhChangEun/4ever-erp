import { defineConfig } from '@playwright/test';

/**
 * 브라우저 검증(erp-loop 5단계)을 사람 눈 대신 영구 테스트로 남긴다. 결정 22.
 * - 브라우저: 이 맥에 설치된 Google Chrome(channel: 'chrome'). 별도 브라우저 다운로드 없음.
 * - 서버: 로컬은 `next dev` 를 3100 포트로(떠 있으면 재사용). CI 는 같은 잡에서 만든 빌드를 `next start` 로 띄운다.
 *   BACKEND_API_URL 이 없어 서버 목(`src/app/api/[...slug]`)으로 돈다(Vercel 데모와 같은 경로).
 * - CI 재시도 0. 재시도는 흔들리는 테스트를 가린다.
 * - 실패 시나리오는 MSW 대신 Playwright `page.route` 로 응답을 바꾼다.
 * - 로그인: setup 프로젝트가 데모 계정으로 세션 쿠키를 받아 저장하고, 나머지 테스트가 재사용한다.
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: isCI,
  reporter: [['list']],
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chrome',
      dependencies: ['setup'],
      use: { storageState: 'e2e/.auth/admin.json' },
    },
  ],
  webServer: {
    command: isCI ? `npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
