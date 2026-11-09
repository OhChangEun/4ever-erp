import { defineConfig } from '@playwright/test';
import { oidcEnv } from './e2e-oidc/env';

/**
 * OIDC 모드 브라우저 확인(인증 4단계 카드). 로컬 Keycloak 이 떠 있어야 한다(bash dev/keycloak/start.sh).
 * CI 에는 Keycloak 이 없어 돌리지 않는다. 값은 dev/keycloak/.env.oidc(git 에 안 올림)에서 읽는다.
 * 실행: npm run e2e:oidc
 */
// 앱 서버에 넘기는 값. 테스트 워커는 e2e-oidc/env.ts 로 직접 읽는다(설정이 바꾼 process.env 는 워커에 안 보인다)
const env = oidcEnv();

const PORT = 3100;

export default defineConfig({
  testDir: './e2e-oidc',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...env,
      SESSION_SECRET: process.env.SESSION_SECRET ?? 'oidc-e2e-only-secret-not-for-prod',
    },
  },
});
