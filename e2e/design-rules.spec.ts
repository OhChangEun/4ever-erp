import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 디자인 지침 12장을 화면에서 잰다(디자인 지침 위반 정리 카드). 정적 검사(src/test/designRules.test.ts)가
 * 클래스 글자를 세고, 여기는 그려진 결과를 본다.
 * 1. main 안(모달, 드롭다운, 팝오버는 안 열린 상태)에 그림자가 없다.
 * 2. 세그먼트(서브탭)는 버튼 이름이 글자 그대로이고 aria-pressed 로 선택을 알린다. 고른 상태마다 axe critical, serious 0.
 * 3. 제목 있는 칸에 카드 래퍼(네 변 테두리 상자)가 없다. 제목에서 main 까지 올라가며 본다.
 * 4. 프로필 버튼은 브랜드 블루(primary)나 흰색(secondary)뿐이고, 브랜드 블루로 채운 버튼은 하나다.
 * 5. 세그먼트 활성 칸은 흰색이다(브랜드 블루로 채우면 옆의 primary 버튼과 같아 보인다). 기간 선택과 같은 모양.
 * 6. 키보드로 간 세그먼트, 공통 Button, 드롭다운에 포커스 링이 그려진다.
 */
interface Screen {
  path: string;
  /** 차례로 누를 세그먼트 버튼 이름. 첫 이름이 처음 선택된 것 */
  segments?: (string | RegExp)[];
  /** 카드 래퍼가 없어야 하는 칸의 제목. 'h2' 면 main 안의 h2 전부 */
  cardFree?: string[] | 'h2';
  brandButtonsOnly?: boolean;
  /** 세그먼트마다 돌리는 axe 에서 뺄 규칙. 이 카드 밖의 알려진 위반만(카드 별도 보고) */
  axeDisable?: string[];
}

const SCREENS: Screen[] = [
  { path: '/dashboard', segments: ['매출 프로세스', '매입 프로세스'] },
  { path: '/inventory', cardFree: ['재고 부족 알림', '최근 재고 이동'] },
  { path: '/inventory?tab=shipping', segments: [/^생산중 \(/, /^출고 준비 완료 \(/] },
  { path: '/inventory?tab=receiving', segments: [/^입고 대기 \(/, /^입고 완료 \(/] },
  { path: '/warehouse', cardFree: ['창고 목록'] },
  { path: '/hrm?tab=employee-management', segments: ['직원정보', '부서관리'] },
  { path: '/hrm?tab=attendance-management', segments: ['출퇴근 기록', '휴가 관리'] },
  { path: '/hrm?tab=training-management', segments: ['직원별 교육 상태', '교육 프로그램 목록'] },
  { path: '/production?tab=mrp', segments: ['순소요', '계획 주문'] },
  // MES 표 보기: 단계 글자 대비와 단계 가로 스크롤 칸 포커스(카드 별도 보고 5)
  {
    path: '/production?tab=mes',
    segments: ['표', '간트'],
    axeDisable: ['color-contrast', 'scrollable-region-focusable'],
  },
  { path: '/profile', cardFree: 'h2', brandButtonsOnly: true },
];

const settle = async (page: Page) => {
  await waitForListLoaded(page);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
};

/**
 * main 안에서 그림자를 그리는 요소. 열린 대화상자, 목록 상자, 메뉴 안은 뺀다.
 * 번짐과 어긋남이 없는 층(ring, 테두리처럼 보이는 2px 선)은 그림자가 아니라 세지 않는다
 */
const shadows = (main: Locator) =>
  main.evaluate((root) => {
    const casts = (boxShadow: string) =>
      boxShadow !== 'none' &&
      (boxShadow.match(/rgba?\([^)]*\)[^,]*/g) ?? []).some((layer) => {
        if (/rgba\([^)]*,\s*0\)/.test(layer)) return false; // 투명
        const [x = 0, y = 0, blur = 0] = (
          layer.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) ?? []
        ).map(parseFloat);
        return x !== 0 || y !== 0 || blur !== 0;
      });
    // 개발 서버에만 붙는 TanStack Query 개발 도구 버튼(tsqd-)도 뺀다
    const layer =
      '[role="dialog"], [role="listbox"], [role="menu"], [role="tooltip"], [class*="tsqd-"]';
    return [...root.querySelectorAll('*')]
      .filter((el) => {
        if (el.closest(layer)) return false;
        const s = getComputedStyle(el);
        return casts(s.boxShadow) || s.textShadow !== 'none' || s.filter.includes('drop-shadow');
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${getComputedStyle(el).boxShadow}`,
      );
  });

/** 제목에서 main 까지 올라가며 만난 네 변 테두리 상자 */
const wrapperOf = (heading: Locator) =>
  heading.evaluate((h) => {
    const boxed = (el: Element) => {
      const s = getComputedStyle(el);
      return (['Top', 'Right', 'Bottom', 'Left'] as const).every(
        (side) =>
          parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
          s.getPropertyValue(`border-${side.toLowerCase()}-style`) !== 'none' &&
          s.getPropertyValue(`border-${side.toLowerCase()}-color`) !== 'rgba(0, 0, 0, 0)',
      );
    };
    const found: string[] = [];
    for (let el = h.parentElement; el && el.tagName !== 'MAIN'; el = el.parentElement) {
      if (boxed(el)) found.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80));
    }
    return found;
  });

const axeSerious = async (page: Page, disable: string[] = []) => {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(disable)
    .analyze();
  return result.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id}(${v.impact}): ${v.nodes[0]?.target.join(' ')}`);
};

for (const screen of SCREENS) {
  test(`${screen.path} 는 디자인 지침 12장에 맞다`, async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 772 });
    await page.goto(screen.path);
    await settle(page);
    // 탭 화면은 바깥 main 안에 탭 내용 main 이 없다. 가장 바깥 main 을 본다
    const main = page.locator('main').first();
    const problems: string[] = [];

    problems.push(...(await shadows(main)).map((s) => `그림자: ${s}`));

    if (screen.cardFree) {
      const headings =
        screen.cardFree === 'h2'
          ? await main.locator('h2').all()
          : screen.cardFree.map((name) => main.getByRole('heading', { name, exact: true }));
      expect(headings.length).toBeGreaterThan(0);
      for (const heading of headings) {
        await expect(heading).toBeVisible();
        const name = (await heading.textContent())?.trim();
        problems.push(...(await wrapperOf(heading)).map((w) => `카드 래퍼(${name}): ${w}`));
      }
    }

    if (screen.brandButtonsOnly) {
      const colors = await main.evaluate((root) => {
        const probe = document.createElement('span');
        probe.className = 'bg-blue-500';
        document.body.append(probe);
        const brand = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const allowed = new Set([brand, 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)']);
        return [...root.querySelectorAll('button')]
          .filter((b) => !b.closest('[role="dialog"]'))
          .map((b) => [b, getComputedStyle(b).backgroundColor] as const)
          .filter(([, bg]) => !allowed.has(bg))
          .map(([b, bg]) => `${(b.textContent ?? '').trim()} ${bg}`);
      });
      problems.push(...colors.map((c) => `버튼 색: ${c}`));
      // 지침 "한 화면에 primary 는 하나". 비활성이어도 같은 남색 채움이라 센다
      const filled = await main.evaluate((root) => {
        const probe = document.createElement('span');
        probe.className = 'bg-blue-500';
        document.body.append(probe);
        const brand = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return [...root.querySelectorAll('button')]
          .filter(
            (b) => !b.closest('[role="dialog"]') && getComputedStyle(b).backgroundColor === brand,
          )
          .map((b) => (b.textContent ?? '').trim());
      });
      if (filled.length > 1) problems.push(`primary 둘 이상: ${filled.join(', ')}`);
    }

    for (const [i, name] of (screen.segments ?? []).entries()) {
      const button = main.getByRole('button', { name, exact: typeof name === 'string' });
      await expect(button).toHaveCount(1);
      if (i > 0) {
        await expect(button).toHaveAttribute('aria-pressed', 'false');
        await button.click();
        await settle(page);
      }
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      problems.push(...(await shadows(main)).map((s) => `그림자(${String(name)}): ${s}`));
      const look = await button.evaluate((b) => ({
        bg: getComputedStyle(b).backgroundColor,
        inGroup: Boolean(b.closest('[role="group"]')),
      }));
      if (look.bg !== 'rgb(255, 255, 255)')
        problems.push(`활성 세그먼트 색(${String(name)}): ${look.bg}`);
      if (!look.inGroup) problems.push(`세그먼트 묶음(group) 없음: ${String(name)}`);
      problems.push(
        ...(await axeSerious(page, screen.axeDisable)).map((v) => `axe(${String(name)}): ${v}`),
      );
    }

    expect(problems).toEqual([]);
  });
}

test('세그먼트는 키보드로 고른다(Tab 으로 가서 Enter)', async ({ page }) => {
  await page.goto('/inventory?tab=shipping');
  await settle(page);
  const second = page.getByRole('button', { name: /^출고 준비 완료 \(/ });
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /^생산중 \(/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

/** Tab 을 눌러 대상에 포커스가 갈 때까지 간다(마우스 없이 키보드로 간 것이라 :focus-visible 이 걸린다) */
const tabTo = async (page: Page, target: Locator) => {
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('Tab 으로 대상에 못 갔다');
};

test('키보드로 간 세그먼트, 공통 Button, 드롭다운에 포커스 링이 그려진다', async ({ page }) => {
  await page.goto('/hrm?tab=employee-management');
  await settle(page);
  const main = page.locator('main').first();
  const targets = [
    main.getByRole('button', { name: '부서관리', exact: true }),
    main.getByRole('combobox', { name: '전체 부서' }),
    main.getByRole('button', { name: '신규 직원 등록' }),
  ];
  const missing: string[] = [];
  for (const target of targets) {
    await tabTo(page, target);
    const ring = await target.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), name: el.textContent };
    });
    if (ring.style === 'none' || !(ring.width > 0))
      missing.push(`${ring.name?.trim()}: ${ring.style} ${ring.width}px`);
  }
  expect(missing).toEqual([]);
});
