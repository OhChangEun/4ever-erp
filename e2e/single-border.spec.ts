import { expect, test, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 맞붙는 선은 한 겹만 그린다(카드 표 테두리 한 겹, DESIGN_GUIDELINES 12장 "테이블").
 * 화면의 테두리 상자 쌍에서 서로 다른 두 요소의 나란한 변(가로는 가로끼리, 세로는 세로끼리)이
 * 0~2px 간격으로 붙어 있고 나란히 겹치는 길이가 20px 이상이면 "두 겹 선"으로 잡는다.
 * 위아래로 붙는 두 요소(위 요소의 아래 변과 아래 요소의 위 변)도 같은 규칙이다.
 * 떨어져 있어도 표를 감싸는 테두리 상자(상자 안 상자)는 따로 잡는다. 표는 자기 테두리를 가진 유일한 상자다.
 * 화면 밖 선까지 보려고 스크롤 칸(문서, 탭 내용 칸, 표, 모달 본문)마다 끝까지 내리며 재고 결과를 합친다.
 * CSS border 만 잰다. 그림자, ring, outline, 의사 요소(::before, ::after)로 그린 선은 못 본다.
 */

interface DoubleBorder {
  a: string;
  b: string;
  /** 어느 선인가(가로 y=…, 세로 x=…). 같은 두 요소가 위와 아래에서 다 붙으면 두 줄로 나온다 */
  line: string;
  /** 붙은 두 변(Bottom/Top 등). 스크롤 위치가 달라도 같은 쌍을 한 번만 세는 데 쓴다 */
  sides: string;
  /** 두 선 사이 px(0 이면 맞닿아 2px 처럼 보인다) */
  gap: number;
  /** 나란히 겹치는 길이 px */
  length: number;
}

interface BorderReport {
  doubles: DoubleBorder[];
  /** 표 바깥에서 표를 한 번 더 감싸는 네 변 테두리 상자 */
  boxedTables: string[];
}

/**
 * 페이지 안에서 돈다. page.evaluate 로 넘기므로 바깥 변수를 쓰지 않는다. root 안의 요소만 본다.
 * 잡지 않는 것: 선이 같은 픽셀에 겹쳐 그려지는 경우(탭 밑줄의 -mb-px 처럼 한 겹으로 보인다),
 * outline(포커스 링, border 가 아니다), 투명하거나 none 인 테두리, 스크롤이나 overflow 로 가려진 부분,
 * 스크롤 칸이 내용을 잘라 낸 가장자리(위로 더 올릴 수 있는 위 끝, 더 내릴 수 있는 아래 끝)에서 MAX_GAP + 1 px 안의 선.
 * 마지막 것은 잘린 행의 선이 칸 테두리와 우연히 붙은 것이라 두 겹으로 보이지 않는다. 내용의 진짜 첫 줄과 끝 줄은
 * 스크롤을 처음과 끝까지 돌 때 잘리지 않은 위치에서 잰다.
 */
const inspectBorders = (root: string): BorderReport => {
  const MAX_GAP = 2;
  const MIN_LENGTH = 20;
  const alphaOf = (color: string) => {
    if (color === 'transparent') return 0;
    const slash = /\/\s*([\d.]+)(%?)\s*\)$/.exec(color);
    if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1);
    const rgba = /^rgba\(.*,\s*([\d.]+)\)$/.exec(color);
    return rgba ? Number(rgba[1]) : 1;
  };
  const describe = (el: Element) => {
    const label = el.getAttribute('aria-label') ?? el.getAttribute('role') ?? '';
    const cls = typeof el.className === 'string' ? el.className.trim().slice(0, 70) : '';
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 20);
    return `<${el.tagName.toLowerCase()}${label ? ` ${label}` : ''}> .${cls} "${text}"`;
  };
  const scrolls = (overflow: string) => overflow === 'auto' || overflow === 'scroll';
  /**
   * 요소가 실제로 보이는 영역(뷰포트와 overflow 를 자르는 조상들의 교집합)과
   * 스크롤 칸 조상이 내용을 잘라 낸 가장자리 좌표(가로 선은 cutY, 세로 선은 cutX 와 비교)
   */
  const clipOf = (el: Element) => {
    let top = 0;
    let left = 0;
    let bottom = window.innerHeight;
    let right = window.innerWidth;
    const cutY: number[] = [];
    const cutX: number[] = [];
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top);
      left = Math.max(left, r.left);
      bottom = Math.min(bottom, r.bottom);
      right = Math.min(right, r.right);
      const innerTop = r.top + p.clientTop;
      const innerLeft = r.left + p.clientLeft;
      if (scrolls(s.overflowY)) {
        if (p.scrollTop > 0) cutY.push(innerTop);
        if (p.scrollTop + p.clientHeight < p.scrollHeight - 1) cutY.push(innerTop + p.clientHeight);
      }
      if (scrolls(s.overflowX)) {
        if (p.scrollLeft > 0) cutX.push(innerLeft);
        if (p.scrollLeft + p.clientWidth < p.scrollWidth - 1) cutX.push(innerLeft + p.clientWidth);
      }
    }
    return { top, left, bottom, right, cutY, cutX };
  };

  // 선 하나: band 는 선이 그려진 두께 구간(가로 선이면 y), span 은 선이 뻗은 구간(가로 선이면 x)
  interface Line {
    owner: number;
    side: string;
    horizontal: boolean;
    band: [number, number];
    span: [number, number];
  }
  const owners: Element[] = [];
  const lines: Line[] = [];
  for (const el of document.querySelector(root)?.querySelectorAll('*') ?? []) {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const sides = [
      ['Top', true, [r.top, r.top + parseFloat(s.borderTopWidth)]],
      ['Bottom', true, [r.bottom - parseFloat(s.borderBottomWidth), r.bottom]],
      ['Left', false, [r.left, r.left + parseFloat(s.borderLeftWidth)]],
      ['Right', false, [r.right - parseFloat(s.borderRightWidth), r.right]],
    ] as const;
    let clip: ReturnType<typeof clipOf> | undefined;
    for (const [side, horizontal, band] of sides) {
      if (!(band[1] - band[0] > 0)) continue;
      const style = s.getPropertyValue(`border-${side.toLowerCase()}-style`);
      if (style === 'none' || style === 'hidden') continue;
      if (alphaOf(s.getPropertyValue(`border-${side.toLowerCase()}-color`)) === 0) continue;
      clip ??= clipOf(el);
      const [lo, hi] = horizontal ? [clip.top, clip.bottom] : [clip.left, clip.right];
      const center = (band[0] + band[1]) / 2;
      if (center < lo - 0.5 || center > hi + 0.5) continue;
      if (
        (horizontal ? clip.cutY : clip.cutX).some((edge) => Math.abs(center - edge) <= MAX_GAP + 1)
      ) {
        continue;
      }
      const span: [number, number] = horizontal
        ? [Math.max(r.left, clip.left), Math.min(r.right, clip.right)]
        : [Math.max(r.top, clip.top), Math.min(r.bottom, clip.bottom)];
      if (span[1] - span[0] < MIN_LENGTH) continue;
      let owner = owners.indexOf(el);
      if (owner === -1) owner = owners.push(el) - 1;
      lines.push({ owner, side, horizontal, band: [band[0], band[1]], span });
    }
  }

  const found: DoubleBorder[] = [];
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    if (!a) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const b = lines[j];
      if (!b || b.owner === a.owner || b.horizontal !== a.horizontal) continue;
      const gap = Math.max(b.band[0] - a.band[1], a.band[0] - b.band[1]);
      // 음수면 같은 픽셀에 겹쳐 그려져 한 겹으로 보인다. 0.5 는 소수 좌표 반올림 여유
      if (gap < -0.5 || gap > MAX_GAP + 0.5) continue;
      const length = Math.min(a.span[1], b.span[1]) - Math.max(a.span[0], b.span[0]);
      if (length < MIN_LENGTH) continue;
      const ea = owners[a.owner];
      const eb = owners[b.owner];
      if (!ea || !eb) continue;
      found.push({
        a: describe(ea),
        b: describe(eb),
        line: `${a.horizontal ? '가로 y' : '세로 x'}=${Math.round(a.band[0])}`,
        sides: `${a.side}/${b.side}`,
        gap: Math.round(Math.max(gap, 0)),
        length: Math.round(length),
      });
    }
  }
  // 표(또는 공통 Table 루트)의 테두리 하나는 표 자신의 것. 그 바깥, root 안쪽에 네 변 테두리가 또 있으면 잡는다.
  // 모달 상자(role=dialog)는 root 자신이라 세지 않는다
  const boxed = (el: Element) => {
    const s = getComputedStyle(el);
    return ['top', 'right', 'bottom', 'left'].every(
      (side) =>
        parseFloat(s.getPropertyValue(`border-${side}-width`)) > 0 &&
        !['none', 'hidden'].includes(s.getPropertyValue(`border-${side}-style`)) &&
        alphaOf(s.getPropertyValue(`border-${side}-color`)) > 0,
    );
  };
  const container = document.querySelector(root);
  const boxedTables: string[] = [];
  for (const table of container?.querySelectorAll('table') ?? []) {
    if (!table.checkVisibility()) continue;
    let ownBorder = false;
    for (let el: Element | null = table; el && el !== container; el = el.parentElement) {
      if (!boxed(el)) continue;
      if (ownBorder) boxedTables.push(`${describe(el)} 가 표 ${describe(table)} 를 감싼다`);
      ownBorder = true;
    }
  }
  return { doubles: found, boxedTables };
};

interface Screen {
  path: string;
  /**
   * 탭 이름(탭 바가 없는 화면은 '') → 그 탭 안의 세그먼트 버튼(이름 패턴).
   * 아이콘 글꼴 글자가 이름 앞에 붙는 버튼이 있어 끝만 맞춘다
   */
  subTabs?: Record<string, RegExp[]>;
  /** 대표 상세 모달을 여는 버튼. 첫 탭(또는 지정 탭)에서 누른다 */
  modal?: { tab?: string; button: RegExp };
}

const SCREENS: Screen[] = [
  { path: '/dashboard' },
  { path: '/sales', modal: { button: /^상세$/ } },
  {
    path: '/production',
    subTabs: { MRP: [/순소요$/, /계획 주문$/], MES: [/^표$/, /^간트$/] },
    modal: { tab: 'BOM', button: /^상세보기$/ },
  },
  { path: '/purchase', modal: { button: /^상세$/ } },
  {
    path: '/inventory',
    subTabs: {
      '출고 관리': [/^생산중/, /^출고 준비 완료/],
      '입고 관리': [/^입고 대기/, /^입고 완료/],
    },
    modal: { button: /^상세$/ },
  },
  { path: '/warehouse', modal: { button: /관리$/ } },
  { path: '/low-stock' },
  { path: '/finance', modal: { button: /^상세$/ } },
  {
    path: '/hrm',
    subTabs: {
      직원관리: [/직원정보$/, /부서관리$/],
      근태관리: [/출퇴근 기록$/, /휴가 관리$/],
      교육관리: [/직원별 교육 상태$/, /교육 프로그램 목록$/],
    },
    modal: { button: /^상세보기$/ },
  },
  // 교육 현황의 탭 바는 이름 없는 nav 라 탭 자동 탐색에 안 걸린다
  { path: '/profile', subTabs: { '': [/^수강중인 교육$/, /^신청 가능한 교육$/, /^수료한 교육$/] } },
];

// 등장 페이드나 슬라이드가 끝난 뒤 잰다(끝이 있는 애니메이션만. 도중에 취소된 것은 넘어간다)
const settle = async (page: Page) => {
  await waitForListLoaded(page);
  await page.waitForLoadState('networkidle');
  // 아이콘 글꼴이 늦게 붙으면 버튼 폭과 줄 높이가 바뀐다
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
};

const SCROLLER = 'data-border-scroller';

/** root 안의 세로 스크롤 칸에 번호를 붙이고 개수를 돌려준다. root 가 body 면 문서 스크롤도 넣는다(0번) */
const markScrollers = ({ root, attr }: { root: string; attr: string }) => {
  for (const el of document.querySelectorAll(`[${attr}]`)) el.removeAttribute(attr);
  const box = document.querySelector(root);
  const doc = document.scrollingElement;
  const list: Element[] =
    root === 'body' && doc && doc.scrollHeight > doc.clientHeight + 1 ? [doc] : [];
  for (const el of box ? [box, ...box.querySelectorAll('*')] : []) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    if (el.scrollHeight > el.clientHeight + 1 && el.checkVisibility()) list.push(el);
  }
  list.forEach((el, i) => el.setAttribute(attr, String(i)));
  return list.length;
};

/**
 * 모든 스크롤 칸을 맨 위로 되돌린 뒤 index 번 칸을 step 번째 위치로 내린다. 아직 더 내릴 수 있으면 true.
 * 한 번에 clientHeight 에서 8px 덜 내린다. 앞 위치의 잘린 가장자리 예외(MAX_GAP + 1)에 걸린 선이 다음 위치에서는 안쪽에 온다
 */
const scrollStep = ({ attr, index, step }: { attr: string; index: number; step: number }) => {
  for (const el of document.querySelectorAll(`[${attr}]`))
    el.scrollTo({ top: 0, behavior: 'instant' });
  const el = document.querySelector(`[${attr}="${index}"]`);
  if (!el) return false;
  if (el !== document.scrollingElement)
    el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  el.scrollTo({ top: step * Math.max(el.clientHeight - 8, 1), behavior: 'instant' });
  return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
};

/**
 * 모달이 열려 있으면 모달 안만 본다(뒤 화면은 모달 없이 이미 쟀다).
 * 지금 위치에서 한 번 재고, 스크롤 칸마다 끝까지 내리며 다시 잰다. 같은 쌍(두 요소와 붙은 변)은 한 번만 센다
 */
const scan = async (page: Page, where: string, root = 'body') => {
  const doubles = new Map<string, string>();
  const boxed = new Set<string>();
  const measure = async () => {
    const report = await page.evaluate(inspectBorders, root);
    for (const d of report.doubles) {
      const key = `${d.a} | ${d.b} ${d.sides}`;
      if (!doubles.has(key)) {
        doubles.set(
          key,
          `${where}: ${d.line} ${d.a} | ${d.b} (간격 ${d.gap}px, 길이 ${d.length}px)`,
        );
      }
    }
    for (const b of report.boxedTables) boxed.add(`${where}: ${b}`);
  };
  await measure();
  const count = await page.evaluate(markScrollers, { root, attr: SCROLLER });
  for (let index = 0; index < count; index++) {
    for (let step = 0, more = true; more; step++) {
      more = await page.evaluate(scrollStep, { attr: SCROLLER, index, step });
      await measure();
    }
  }
  await page.evaluate(scrollStep, { attr: SCROLLER, index: -1, step: 0 });
  return [...doubles.values(), ...boxed];
};

const scanScreen = async (page: Page, screen: Screen) => {
  const found: string[] = [];
  await page.goto(screen.path);
  await settle(page);
  const tabBar = page.getByRole('navigation', { name: / 탭$/ });
  const tabNames = (await tabBar.count())
    ? (await tabBar.getByRole('button').allTextContents()).map((n) => n.trim())
    : [''];
  for (const tab of tabNames) {
    if (tab) {
      await tabBar.getByRole('button', { name: tab, exact: true }).click();
      await settle(page);
    }
    const where = tab ? `${screen.path} > ${tab}` : screen.path;
    found.push(...(await scan(page, where)));
    // 모달은 탭을 막 연 상태(첫 세그먼트)에서 연다
    const modal = screen.modal;
    if (modal && (modal.tab ?? tabNames[0]) === tab) {
      await page.getByRole('main').getByRole('button', { name: modal.button }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await settle(page);
      found.push(...(await scan(page, `${where} > 모달`, '[role="dialog"]')));
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
    for (const sub of screen.subTabs?.[tab] ?? []) {
      await page.getByRole('main').getByRole('button', { name: sub }).click();
      await settle(page);
      found.push(...(await scan(page, `${where} > ${sub.source.replace(/[\^$]/g, '')}`)));
    }
  }
  return [...new Set(found)];
};

test('판정 함수는 맞붙은 두 테두리와 표를 감싼 상자를 잡고, 떨어진 선과 같은 픽셀에 겹친 선은 잡지 않는다', async ({
  page,
}) => {
  await page.setContent(`
    <div style="margin:20px;width:300px;border:1px solid #e5e7eb">
      <div style="height:60px;border:1px solid #e5e7eb"></div>
    </div>
    <div style="margin:20px;width:300px;border:1px solid #e5e7eb;padding:3px">
      <div style="height:60px;border:1px solid #e5e7eb"></div>
    </div>
    <div style="margin:20px;width:300px;border-bottom:1px solid #e5e7eb">
      <div style="height:40px;margin-bottom:-1px;border-bottom:2px solid #3b82f6"></div>
    </div>
    <div aria-label="카드" style="margin:20px;width:300px;border:1px solid #e5e7eb;padding:24px">
      <div style="border:1px solid #e5e7eb"><table><tr><td>표</td></tr></table></div>
    </div>
    <div style="margin:20px;width:300px;border:1px solid #e5e7eb">
      <div id="scroller" style="height:100px;overflow:auto">
        ${'<div style="height:49px;border-bottom:1px solid #e5e7eb"></div>'.repeat(5)}
      </div>
    </div>`);
  const { doubles, boxedTables } = await page.evaluate(inspectBorders, 'body');
  // 첫 상자의 네 변만 잡힌다(위, 아래, 왼, 오른). 3px 떨어진 상자와 -1px 로 겹친 밑줄은 잡지 않는다.
  // 스크롤 칸 아래 끝에서 잘리는 자리의 행 선(칸 테두리와 0px)도 잡지 않는다
  expect(doubles).toHaveLength(4);
  expect(doubles.every((d) => d.gap === 0)).toBe(true);
  // 24px 떨어져 맞붙음으로는 안 잡히는 카드가 표를 감싼 것은 따로 잡힌다(표의 자기 테두리는 세지 않는다)
  expect(boxedTables).toHaveLength(1);
  expect(boxedTables[0]).toMatch(/^<div 카드>/);
  // 끝까지 내리면 더 잘리는 내용이 없어 마지막 행 선과 칸 테두리가 붙은 것은 잡는다
  await page.evaluate(() => document.getElementById('scroller')?.scrollTo({ top: 10_000 }));
  const scrolled = await page.evaluate(inspectBorders, 'body');
  expect(scrolled.doubles).toHaveLength(5);
  expect(scrolled.doubles.filter((d) => d.sides === 'Bottom/Bottom')).toHaveLength(2);
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1512, height: 772 },
]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    for (const screen of SCREENS) {
      test(`${screen.path} 의 맞붙는 선은 한 겹이다`, async ({ page }) => {
        test.setTimeout(180_000);
        expect(await scanScreen(page, screen)).toEqual([]);
      });
    }
  });
}
