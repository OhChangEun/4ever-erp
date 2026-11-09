import type { Page } from '@playwright/test';

/**
 * 화면에 보이는 오류 알림. Next.js 의 라우트 안내 요소(`#__next-route-announcer__`)도 role=alert 라
 * 글자가 있는 것만 센다.
 */
export const visibleAlerts = (page: Page) => page.getByRole('alert').filter({ hasText: /\S/ });

/** 목록 로딩 문구가 사라질 때까지 기다린다(TableStatusBox loading) */
export const waitForListLoaded = async (page: Page) => {
  await page
    .getByText(/불러오는 중입니다/)
    .first()
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => undefined);
};

/** 응답을 늦춘다. 낙관적 값이 보이는 순간을 확인할 때 쓴다 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
