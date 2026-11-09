import { expect, test } from '@playwright/test';

/** 옵저버빌리티 1: 요청 ID 와 web-vitals 가 실제 서버에서 돈다 */
test('프록시 응답에 요청 ID 가 있다', async ({ page }) => {
  const res = await page.request.get('/api/proxy/scm-pp/iv/warehouses');
  expect(res.status()).toBe(200);
  expect(res.headers()['x-request-id']).toMatch(/^[A-Za-z0-9-]{8,64}$/);
});

test('화면을 열면 web-vitals 지표가 /api/vitals 로 간다', async ({ page }) => {
  const beacon = page.waitForRequest(
    (req) => req.url().endsWith('/api/vitals') && req.method() === 'POST',
    { timeout: 20_000 },
  );
  await page.goto('/warehouse');
  const req = await beacon;
  const body: unknown = JSON.parse(req.postData() ?? '{}');
  expect(body).toMatchObject({ path: '/warehouse' });
});
