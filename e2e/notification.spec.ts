import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * 알림 UI 연결 카드(ai/cards/2026-11-12_알림_UI_연결.md) 브라우저 확인.
 * 서버 목의 알림 상태는 로그인(세션 토큰)별이라, setup 이 새로 로그인할 때마다 안 읽은 알림 3건에서 시작한다.
 */
test('알림 버튼 → 목록 → 하나 읽음 → 뱃지 감소 → Esc 로 닫히고 포커스 복귀', async ({ page }) => {
  await page.goto('/purchase');
  const bell = page.getByRole('button', { name: /^알림, 안 읽은 알림 \d+개$/ });
  await expect(bell).toBeVisible({ timeout: 30_000 });
  const before = Number(/\d+/.exec((await bell.getAttribute('aria-label')) ?? '')?.[0]);
  expect(before).toBeGreaterThan(0);
  // 뱃지 숫자는 버튼 위에 겹쳐 보인다
  const badge = (count: number) => page.locator('aside').getByText(String(count), { exact: true });
  await expect(badge(before)).toBeVisible();

  // 누르면 사이드바 옆에 목록이 뜬다
  await bell.click();
  await expect(bell).toHaveAttribute('aria-expanded', 'true');
  const dialog = page.getByRole('dialog', { name: '알림' });
  await expect(dialog.getByRole('list')).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveCount(3);
  await expect(bell).toHaveAttribute('aria-controls', (await dialog.getAttribute('id')) ?? '');
  const sidebar = await page.locator('aside').boundingBox();
  const popover = await dialog.boundingBox();
  expect(popover?.x ?? 0).toBeGreaterThanOrEqual((sidebar?.x ?? 0) + (sidebar?.width ?? 0));
  // 화면 안에 남는다. 폭 상한은 화면 폭에서 사이드바(224), 간격(12), 여백(8)을 뺀 값(리뷰 C 1번)
  const viewport = page.viewportSize();
  expect((popover?.x ?? 0) + (popover?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
  expect(await dialog.evaluate((el) => getComputedStyle(el).maxWidth)).toBe(
    `${(viewport?.width ?? 0) - 244}px`,
  );

  // 연 상태에서 axe critical, serious 0 (e2e/a11y.spec.ts 와 같은 기준)
  await page.waitForLoadState('networkidle');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`),
  ).toEqual([]);

  // 안 읽은 알림 하나를 읽으면 뱃지가 1 준다. 팝오버는 열린 채
  await dialog.getByRole('listitem').getByRole('button').first().click();
  await expect(
    page.getByRole('button', { name: `알림, 안 읽은 알림 ${before - 1}개` }),
  ).toBeVisible();
  await expect(dialog).toBeVisible();

  // 새로고침해도 서버 목이 읽음 상태를 기억한다(목록, 안 읽은 수, 읽음 처리가 같은 상태)
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(bell).toHaveAttribute('aria-expanded', 'false');
  await expect(bell).toBeFocused();

  await page.reload();
  await expect(
    page.getByRole('button', { name: `알림, 안 읽은 알림 ${before - 1}개` }),
  ).toBeVisible({ timeout: 30_000 });

  // 사이드바를 접어도 버튼과 뱃지가 보인다
  await page.getByRole('button', { name: '사이드바 접기' }).click();
  await expect(bell).toBeVisible();
  await expect(badge(before - 1)).toBeVisible();
});
