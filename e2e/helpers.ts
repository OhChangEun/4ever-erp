import type { Page } from '@playwright/test';

/**
 * 화면에 보이는 오류 알림. Next.js 의 라우트 안내 요소(`#__next-route-announcer__`)도 role=alert 다.
 * 처음엔 비어 있지만 클라이언트 이동(탭 전환으로 URL 이 바뀜) 뒤엔 페이지 제목을 읽어 줘서 글자가 생긴다.
 * 그래서 id 로 빼고, 글자가 있는 것만 센다.
 */
export const visibleAlerts = (page: Page) =>
  page.locator('[role="alert"]:not(#__next-route-announcer__)').filter({ hasText: /\S/ });

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
