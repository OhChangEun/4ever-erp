import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { findClipped, findNestedScroll, type Clipped } from './clipped';
import { waitForListLoaded } from './helpers';

/**
 * 내용이 잘렸는데 볼 방법이 없는 곳이 없어야 한다(카드 화면 아래가 잘리는 곳).
 * 비공개 화면 전부와 그 탭, 하위 탭, 대표 모달을 이 앱의 최소 창(1280x720)과 노트북 창(1512x772)에서 연다.
 * 판정은 `findClipped`(e2e/clipped.ts). 기대값은 빈 목록이고 허용 목록은 두지 않는다.
 * 화면에서는 이중 스크롤(스크롤되는 칸 안에 또 스크롤되는 칸)도 같이 본다.
 */
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1512, height: 772 },
];

interface Screen {
  /** 화면이나 탭 이름. 실패 목록에 그대로 나온다 */
  name: string;
  url: string;
  /** 주소에 없는 화면 안 전환(보기 바꾸기, 상태 탭). 하나씩 누르고 다시 본다 */
  views?: string[];
}

const SCREENS: Record<string, Screen[]> = {
  '/dashboard': [{ name: '대시보드', url: '/dashboard', views: ['매입 프로세스', '표로 보기'] }],
  '/sales': [
    { name: '견적 관리', url: '/sales?tab=quotes' },
    { name: '주문 관리', url: '/sales?tab=orders' },
    { name: '고객 관리', url: '/sales?tab=customers' },
    { name: '매출 분석', url: '/sales?tab=analytics' },
  ],
  '/production': [
    { name: '견적 관리', url: '/production?tab=quotations' },
    { name: 'MPS', url: '/production?tab=mps' },
    { name: 'MRP 순소요', url: '/production?tab=mrp&subTab=requirements' },
    { name: 'MRP 계획 주문', url: '/production?tab=mrp&subTab=orders' },
    { name: 'MES', url: '/production?tab=mes', views: ['간트'] },
    { name: 'BOM', url: '/production?tab=bom' },
  ],
  '/purchase': [
    { name: '구매 요청', url: '/purchase?tab=requests' },
    { name: '발주서', url: '/purchase?tab=orders' },
    { name: '공급업체 관리', url: '/purchase?tab=suppliers' },
  ],
  '/inventory': [
    { name: '재고 목록', url: '/inventory?tab=inventory' },
    { name: '출고 관리', url: '/inventory?tab=shipping', views: ['출고 준비 완료'] },
    { name: '입고 관리', url: '/inventory?tab=receiving', views: ['입고 완료'] },
  ],
  '/warehouse': [{ name: '창고 관리', url: '/warehouse' }],
  '/low-stock': [{ name: '안전재고', url: '/low-stock' }],
  '/finance': [
    { name: '매출 전표', url: '/finance?tab=sales' },
    { name: '매입 전표', url: '/finance?tab=purchase' },
    { name: '재무 현황', url: '/finance?tab=overview', views: ['표로 보기'] },
  ],
  '/hrm': [
    { name: '직원정보', url: '/hrm?tab=employee-management&subTab=employees' },
    { name: '부서관리', url: '/hrm?tab=employee-management&subTab=organization' },
    { name: '급여관리', url: '/hrm?tab=payroll-management' },
    { name: '출퇴근 기록', url: '/hrm?tab=attendance-management&subTab=attendance' },
    { name: '휴가 관리', url: '/hrm?tab=attendance-management&subTab=leave' },
    { name: '직원별 교육', url: '/hrm?tab=training-management&subTab=employeeTraining' },
    { name: '교육 프로그램', url: '/hrm?tab=training-management&subTab=programs' },
  ],
  '/profile': [{ name: '프로필', url: '/profile', views: ['신청 가능한 교육', '수료한 교육'] }],
  '/alarm': [{ name: '알림', url: '/alarm' }],
};

interface ModalCase {
  name: string;
  url: string;
  /** 모달을 여는 버튼 이름의 끝(아이콘 글자가 앞에 붙는 버튼이 있다. 여럿이면 첫 번째). 함수면 직접 연다 */
  open: string | ((page: Page) => Promise<void>);
  /** 떴는지 볼 요소. 기본은 role=dialog */
  shown?: (page: Page) => Locator;
}

const MODALS: Record<string, ModalCase[]> = {
  // 대시보드에는 관리자가 여는 모달이 없다. 모든 화면에 있는 사이드바 팝업을 여기서 본다
  '/dashboard': [
    {
      name: '사이드바 알림',
      url: '/dashboard',
      open: (page) => page.getByRole('button', { name: /^알림/ }).click(),
    },
    {
      name: '사이드바 프로필 메뉴',
      url: '/dashboard',
      open: (page) => page.getByRole('button', { name: /전체 관리자/ }).click(),
      shown: (page) => page.getByRole('button', { name: /로그아웃/ }),
    },
  ],
  '/sales': [
    { name: '견적 상세', url: '/sales?tab=quotes', open: '상세' },
    { name: '주문 상세', url: '/sales?tab=orders', open: '상세' },
    { name: '고객 등록', url: '/sales?tab=customers', open: '고객 등록' },
    { name: '고객 상세', url: '/sales?tab=customers', open: '상세' },
  ],
  '/production': [
    {
      name: '견적 시뮬레이션 결과',
      url: '/production?tab=quotations',
      open: async (page) => {
        await page.locator('tbody input[type="checkbox"]').first().check();
        await page.getByRole('button', { name: '시뮬레이션' }).click();
      },
    },
    {
      name: 'MES 공정 상세',
      url: '/production?tab=mes',
      open: (page) => page.locator('tbody tr').first().click(),
    },
    { name: 'BOM 생성', url: '/production?tab=bom', open: 'BOM 생성' },
    { name: 'BOM 상세', url: '/production?tab=bom', open: '상세보기' },
  ],
  '/purchase': [
    { name: '구매 요청 작성', url: '/purchase?tab=requests', open: '구매 요청 작성' },
    { name: '구매 요청 상세', url: '/purchase?tab=requests', open: '상세' },
    { name: '발주서 상세', url: '/purchase?tab=orders', open: '상세' },
    { name: '공급업체 등록', url: '/purchase?tab=suppliers', open: '공급업체 등록' },
    { name: '공급업체 상세', url: '/purchase?tab=suppliers', open: '상세' },
  ],
  '/inventory': [
    { name: '원자재 추가', url: '/inventory?tab=inventory', open: '원자재 추가' },
    { name: '재고 상세', url: '/inventory?tab=inventory', open: '상세' },
    { name: '출고 상세', url: '/inventory?tab=shipping', open: '상세' },
  ],
  '/warehouse': [
    { name: '창고 추가', url: '/warehouse', open: '창고 추가' },
    { name: '창고 상세', url: '/warehouse', open: '상세보기' },
    { name: '창고 3D', url: '/warehouse', open: '3D 보기' },
    { name: '창고 수정', url: '/warehouse', open: '관리' },
  ],
  '/low-stock': [
    {
      name: '선택 품목 발주',
      url: '/low-stock',
      open: async (page) => {
        await page.locator('tbody input[type="checkbox"]').first().check();
        await page.getByRole('button', { name: '선택 품목 발주' }).click();
      },
    },
  ],
  '/finance': [{ name: '전표 상세', url: '/finance?tab=sales', open: '상세' }],
  '/hrm': [
    {
      name: '신규 직원 등록',
      url: '/hrm?tab=employee-management&subTab=employees',
      open: '신규 직원 등록',
    },
    { name: '직원 상세', url: '/hrm?tab=employee-management&subTab=employees', open: '상세보기' },
    { name: '부서 상세', url: '/hrm?tab=employee-management&subTab=organization', open: '상세' },
    { name: '급여 상세', url: '/hrm?tab=payroll-management', open: '상세보기' },
    {
      name: '직원 교육 상세',
      url: '/hrm?tab=training-management&subTab=employeeTraining',
      open: '상세',
    },
    {
      name: '교육 추가',
      url: '/hrm?tab=training-management&subTab=employeeTraining',
      open: '교육 추가',
    },
    {
      name: '프로그램 추가',
      url: '/hrm?tab=training-management&subTab=programs',
      open: '프로그램 추가',
    },
    {
      name: '프로그램 상세',
      url: '/hrm?tab=training-management&subTab=programs',
      open: '상세보기',
    },
    {
      name: '프로그램 관리',
      url: '/hrm?tab=training-management&subTab=programs',
      open: '프로그램 관리',
    },
  ],
  '/profile': [
    {
      // 공통 모달 틀이 아니라 화면이 직접 그린 창이다
      name: '휴가 신청',
      url: '/profile',
      open: '휴가 신청',
      shown: (page) => page.getByRole('button', { name: '취소' }),
    },
  ],
};

// 끝이 있는 애니메이션(모달 등장 150ms)이 끝나고 배치가 다시 잡힌 뒤에 잰다
const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await waitForListLoaded(page);
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

type Finding = { where: string } & (Clipped | { nestedScroll: string } | { tabOverflowX: number });

/** 두 창 크기에서 잘린 곳을 모은다. 화면(모달 아님)은 이중 스크롤과 탭 내용 칸 가로 넘침도 모은다 */
const collect = async (page: Page, where: string, nested = true): Promise<Finding[]> => {
  const findings: Finding[] = [];
  for (const size of VIEWPORTS) {
    const at = `${where} ${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    for (const clipped of await findClipped(page)) findings.push({ where: at, ...clipped });
    if (!nested) continue;
    for (const nestedScroll of await findNestedScroll(page)) {
      findings.push({ where: at, nestedScroll });
    }
    // 탭 내용 칸(TabNavigation, 포커스 받는 region 은 이것 하나)은 overflow-auto 라 1~4px 가로 넘침도
    // 가로 스크롤바가 된다(스크롤바가 자리를 차지하는 Windows). 판정 허용치와 별개로 0 이어야 한다
    const overflowX = await page
      .locator('[role="region"][tabindex="0"]')
      .evaluateAll((els) => els.map((el) => el.scrollWidth - el.clientWidth));
    for (const px of overflowX) if (px > 0) findings.push({ where: at, tabOverflowX: px });
  }
  return findings;
};

for (const [route, screens] of Object.entries(SCREENS)) {
  test(`잘린 곳이 없다: ${route} 화면과 탭`, async ({ page }) => {
    test.setTimeout(180_000);
    const findings: Finding[] = [];
    for (const screen of screens) {
      await page.goto(screen.url);
      findings.push(...(await collect(page, screen.name)));
      for (const view of screen.views ?? []) {
        await page.getByRole('button', { name: view }).first().click();
        findings.push(...(await collect(page, `${screen.name} > ${view}`)));
      }
    }
    expect(findings).toEqual([]);
  });
}

for (const [route, modals] of Object.entries(MODALS)) {
  test(`잘린 곳이 없다: ${route} 모달`, async ({ page }) => {
    test.setTimeout(180_000);
    const findings: Finding[] = [];
    for (const modal of modals) {
      await page.setViewportSize(VIEWPORTS[0]);
      await page.goto(modal.url);
      await settle(page);
      if (typeof modal.open === 'string') {
        await page
          .getByRole('button', { name: new RegExp(`${modal.open}$`) })
          .first()
          .click();
      } else {
        await modal.open(page);
      }
      await expect((modal.shown ?? ((p: Page) => p.getByRole('dialog')))(page)).toBeVisible();
      findings.push(...(await collect(page, `모달 ${modal.name}`, false)));
    }
    expect(findings).toEqual([]);
  });
}

// 목 데이터는 부서가 하나라 카드 격자가 넘치지 않는다. 표가 아닌 긴 내용(카드 격자)도 탭 내용 칸에서
// 스크롤되는지 보려고 응답의 부서를 24개로 늘린다
test('잘린 곳이 없다: 부서 카드가 많을 때(카드 격자)', async ({ page }) => {
  await page.route(
    (url) => url.pathname === '/api/proxy/business/hrm/departments',
    async (route) => {
      const response = await route.fetch();
      const body: { data: { content: Record<string, unknown>[] } } = await response.json();
      const first = body.data.content[0];
      body.data.content = Array.from({ length: 24 }, (_, i) => ({
        ...first,
        departmentId: `dept-${i}`,
        departmentName: `부서 ${i + 1}`,
      }));
      await route.fulfill({ response, json: body });
    },
  );
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/hrm?tab=employee-management&subTab=organization');
  const last = page.getByRole('heading', { name: '부서 24', exact: true });
  await expect(last).toBeAttached();
  await settle(page);
  // 마지막 카드까지 사용자가 내려갈 수 있다. scrollIntoViewIfNeeded 는 overflow-hidden 칸도 스크립트로
  // 스크롤해서 고치기 전에도 통과한다(리뷰 P3). 내용 칸에 포커스하고 End 를 누른다
  await expect(last).not.toBeInViewport();
  await page.getByRole('region', { name: '직원관리' }).focus();
  await page.keyboard.press('End');
  await expect(last).toBeInViewport();
  expect(await collect(page, '부서관리 24개')).toEqual([]);
});

test('매출 분석: 키보드로 맨 아래 차트까지 내려가고 axe 위반이 없다', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/sales?tab=analytics');
  await settle(page);
  // 탭 내용 칸이 이름 있는 영역이고 키보드 포커스를 받는다. End 로 끝까지 내려간다
  const region = page.getByRole('region', { name: '매출 분석' });
  const scrollLeft = () =>
    region.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
  expect(await scrollLeft()).toBeGreaterThan(100);
  await region.focus();
  await expect(region).toBeFocused();
  await page.keyboard.press('End');
  await expect.poll(scrollLeft).toBeLessThanOrEqual(1);
  // 바깥 화면은 같이 스크롤되지 않는다
  expect(
    await page
      .locator('main')
      .first()
      .evaluate((el) => el.scrollTop),
  ).toBe(0);

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`),
  ).toEqual([]);
});

// 판정 함수가 조용히 아무것도 못 잡게 되면 위 테스트가 전부 가짜 초록이 된다. 잡을 것과 넘길 것을 고정한다
test('판정 확인: 잘린 것은 잡고 스크롤되는 것, 말줄임은 넘긴다', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS[0]);
  await page.setContent(`
    <div class="cut" style="height:100px;overflow:hidden"><p style="height:300px;margin:0">잘림</p></div>
    <div class="auto-cut" style="height:100px;overflow:hidden">
      <div style="height:300px;overflow:auto"><p style="height:300px;margin:0">스크롤 칸 자체가 잘림</p></div>
    </div>
    <div class="clip" style="height:100px;overflow:clip"><p style="height:300px;margin:0">clip 으로 잘림</p></div>
    <div class="cut-x" style="width:100px;overflow:hidden"><p style="width:300px;margin:0">가로로 잘림</p></div>
    <div class="inner-scroll" style="height:100px;overflow:hidden">
      <div style="height:100px;overflow:auto"><p style="height:300px">안에서 스크롤</p></div>
    </div>
    <p class="ellipsis" style="width:50px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
      아주 긴 글자 아주 긴 글자 아주 긴 글자
    </p>
    <div class="fixed-out" style="position:fixed;top:0;left:0;width:200px;height:900px">화면 밖</div>
    <div class="fixed-scroll" style="position:fixed;top:0;right:0;width:200px;height:100%;overflow:auto">
      <p style="height:2000px">스크롤</p>
    </div>
  `);
  expect((await findClipped(page)).map((c) => `${c.el} ${c.axis} ${c.hidden}`)).toEqual([
    'div.cut y 200',
    // 리뷰 P2(Codex): 안쪽 스크롤 칸이 바깥 hidden 칸에 잘리면 그 칸 자체가 잡힌다
    'div.auto-cut y 200',
    'div.clip y 200',
    'div.cut-x x 200',
    'div.fixed-out y 180',
  ]);
});
