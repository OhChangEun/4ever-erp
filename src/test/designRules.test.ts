// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 디자인 지침 12장(DESIGN_GUIDELINES.md)을 화면 코드에서 센다(디자인 지침 위반 정리 카드).
 * - 그림자: 모달, 드롭다운, 팝오버, 토스트에만. Tailwind 그림자 유틸리티(`shadow`, `shadow-sm`, `hover:shadow-md`
 *   ...)를 센다. `shadow-none` 과 three.js 속성 `shadow-mapSize` 는 안 센다.
 * - 그라데이션: 쓰지 않는다. `bg-gradient-*` 와 Tailwind v4 이름 `bg-linear-*`, `bg-radial-*`, `bg-conic-*`.
 * - 보라색: 이유 없는 보라색 테마 금지. `purple`, `violet`.
 * - 탭 아이콘: 탭과 세그먼트에는 아이콘을 쓰지 않는다. `*_TABS` 배열 안의 `icon:` 키.
 * - 포커스 링 끄기: `focus:outline-none` 금지. Tailwind 4 에서 이것이 `--tw-outline-style:none` 을 넣어
 *   `focus-visible:outline-*` 와 전역 `:focus-visible` 링(src/styles/globals.css)을 같이 끈다. 다른 표시(입력칸 테두리,
 *   ring)를 그리는 곳만 허용 목록에 둔다.
 * 주석도 센다. 지운 코드를 주석으로 남기지 않는다.
 */
type Rule = 'shadow' | 'gradient' | 'purple' | 'tabIcon' | 'outlineNone';

const ROOTS = ['src/app', 'packages/ui/src'];
const SKIP = /\.(test|stories)\.tsx?$/;

const PATTERNS: Record<Exclude<Rule, 'tabIcon'>, RegExp> = {
  // box-shadow 와 v4 의 drop-shadow(filter), text-shadow, inset-shadow 계열. `*-none` 은 안 센다
  shadow:
    /(?<![\w-])(?:drop-|text-|inset-)?shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|3xl|inner|\[[^\]\s]*\]|\([^)\s]*\)|[a-z]+-\d{2,3}(?:\/\d+)?))?(?![\w-])/g,
  // 접미사형(bg-linear-to-r)과 v4 기본형(bg-radial, bg-conic)
  gradient: /(?<![\w-])bg-(?:gradient|linear|radial|conic)(?:-|(?![\w-]))/g,
  purple: /(?<!\w)(?:purple|violet)(?!\w)/g,
  outlineNone: /(?<![\w-])focus:outline-none(?![\w-])/g,
};

const countTabIcons = (source: string) => {
  let count = 0;
  for (const match of source.matchAll(/export const \w*_TABS\b[^=]*=\s*\[/g)) {
    const start = match.index + match[0].length;
    const end = source.indexOf('\n];', start);
    count += source.slice(start, end === -1 ? undefined : end).match(/\bicon\s*:/g)?.length ?? 0;
  }
  return count;
};

const countRules = (source: string): Partial<Record<Rule, number>> => {
  const counts: Partial<Record<Rule, number>> = {};
  for (const [rule, re] of Object.entries(PATTERNS)) {
    const n = source.match(re)?.length ?? 0;
    if (n > 0) counts[rule as Rule] = n;
  }
  const icons = countTabIcons(source);
  if (icons > 0) counts.tabIcon = icons;
  return counts;
};

const REPO = path.resolve(__dirname, '../..');
const screenFiles = () =>
  ROOTS.flatMap((root) =>
    readdirSync(path.join(REPO, root), { recursive: true, encoding: 'utf8' })
      .filter((name) => /\.tsx?$/.test(name) && !SKIP.test(name))
      .map((name) => path.posix.join(root, name.split(path.sep).join('/'))),
  );

/**
 * 지침 밖이지만 남기는 곳. 파일, 규칙마다 개수가 정확히 같아야 한다(줄어도 실패, 고쳤으면 여기서 지운다).
 * 늘릴 때는 이유를 적는다. 모달은 모달 규칙(사용자 결정 대기)이 정해질 때 같이 본다.
 */
const ALLOWED: { file: string; rule: Rule; count: number; reason: string }[] = [
  // 계층이 필요한 층: 모달, 드롭다운, 팝오버, 토스트(지침 "그림자는 모달·드롭다운 외 0", 2.4절 팝오버)
  {
    file: 'src/app/components/common/modal/ModalContainer.tsx',
    rule: 'shadow',
    count: 1,
    reason: '공통 모달 상자',
  },
  {
    file: 'src/app/components/common/toast/ToastProvider.tsx',
    rule: 'shadow',
    count: 1,
    reason: '토스트',
  },
  {
    file: 'src/app/components/common/CalendarButton.tsx',
    rule: 'shadow',
    count: 1,
    reason: '달력 팝오버',
  },
  {
    file: 'src/app/components/sidebar/SidebarProfile.tsx',
    rule: 'shadow',
    count: 1,
    reason: '프로필 메뉴 팝오버',
  },
  {
    file: 'src/app/components/header/Notification/NotificationBell.tsx',
    rule: 'shadow',
    count: 1,
    reason: '알림 팝오버',
  },
  { file: 'packages/ui/src/Dropdown.tsx', rule: 'shadow', count: 1, reason: '드롭다운 목록' },
  {
    file: 'packages/ui/src/DropdownInputModal.tsx',
    rule: 'shadow',
    count: 1,
    reason: '입력 팝오버',
  },
  {
    file: 'packages/ui/src/DropdownInputListModal.tsx',
    rule: 'shadow',
    count: 1,
    reason: '입력 목록 팝오버',
  },
  { file: 'packages/ui/src/Modal.tsx', rule: 'shadow', count: 1, reason: '패키지 모달 상자' },
  {
    file: 'packages/ui/src/ConflictDialog.tsx',
    rule: 'shadow',
    count: 1,
    reason: '409 충돌 대화상자',
  },
  {
    file: 'src/app/components/sidebar/SidebarNavigation.tsx',
    rule: 'shadow',
    count: 1,
    reason:
      '사이드바 활성 메뉴 왼쪽 3px 선(inset). 그림자가 아니라 선이고 글자 위치를 밀지 않으려고 쓴다',
  },
  // 모달 안. 모달 규칙(사용자 결정 대기) 카드에서 같이 본다
  {
    file: 'src/app/components/header/ProfileInfoModal.tsx',
    rule: 'shadow',
    count: 1,
    reason: '모달 상자. 모달 규칙 대기',
  },
  {
    file: 'src/app/components/header/ProfileInfoModal.tsx',
    rule: 'gradient',
    count: 1,
    reason: '모달 제목 띠. 모달 규칙 대기',
  },
  {
    file: 'src/app/components/header/ProfileInfoModal.tsx',
    rule: 'purple',
    count: 1,
    reason: '모달 안 아이콘. 모달 규칙 대기',
  },
  {
    file: 'src/app/(private)/production/components/modals/MrpPurchaseRequestModal.tsx',
    rule: 'shadow',
    count: 1,
    reason: '모달 안 표 칸. 모달 규칙 대기',
  },
  {
    file: 'src/app/(private)/production/components/modals/ProcessDetailModal.tsx',
    rule: 'shadow',
    count: 1,
    reason: '모달 안 상자. 모달 규칙 대기',
  },
  {
    file: 'src/app/(private)/hrm/components/modals/PayrollDetailModal.tsx',
    rule: 'purple',
    count: 1,
    reason: '모달 안 실수령액 글자. 모달 규칙 대기',
  },
  {
    file: 'src/app/(private)/warehouse/components/warehouseVisualizer/components/WarehouseVisualizer.tsx',
    rule: 'shadow',
    count: 9,
    reason: '3D 보기 모달 안. 모달 규칙 대기',
  },
  {
    file: 'src/app/(private)/warehouse/components/warehouseVisualizer/components/WarehouseVisualizer.tsx',
    rule: 'gradient',
    count: 1,
    reason: '3D 보기 모달 안 캔버스 바탕. 모달 규칙 대기',
  },
  {
    file: 'src/app/(private)/warehouse/components/warehouseVisualizer/components/WarehouseScene.tsx',
    rule: 'shadow',
    count: 1,
    reason: '3D 보기 모달 안 캔버스 위 라벨. 모달 규칙 대기',
  },
  {
    file: 'src/app/(public)/profile/components/AttendanceRecord.tsx',
    rule: 'shadow',
    count: 1,
    reason: '휴가 신청 창(공통 모달 틀이 아님). 모달 규칙 대기',
  },
  {
    file: 'src/app/(public)/profile/components/AttendanceRecord.tsx',
    rule: 'purple',
    count: 8,
    reason: '휴가 신청 창의 입력 포커스 색과 제출 버튼. 모달 규칙 대기',
  },
  // 포커스 링을 끄고 다른 표시를 그리는 곳(진1 리뷰). 버튼류는 지워서 전역 :focus-visible 링을 쓴다
  {
    file: 'src/app/components/common/modal/ModalContainer.tsx',
    rule: 'outlineNone',
    count: 1,
    reason:
      '모달 상자(tabIndex=-1)에 프로그램으로 주는 포커스. 상자 둘레 링 대신 안의 요소가 링을 그린다. 모달 규칙 대기',
  },
  {
    file: 'src/app/components/header/Notification/NotificationBell.tsx',
    rule: 'outlineNone',
    count: 1,
    reason:
      '알림 팝오버 상자(tabIndex=-1)에 프로그램으로 주는 포커스. 안의 행과 버튼이 링을 그린다',
  },
  {
    file: 'packages/ui/src/Dropdown.tsx',
    rule: 'outlineNone',
    count: 1,
    reason: '열린 목록(listbox) 상자. 고른 항목은 배경색으로 보인다',
  },
  {
    file: 'packages/ui/src/Input.tsx',
    rule: 'outlineNone',
    count: 1,
    reason: '입력칸. 포커스는 테두리 색(focus:border-blue-500)으로 보인다',
  },
  {
    file: 'packages/ui/src/DropdownInputModal.tsx',
    rule: 'outlineNone',
    count: 1,
    reason: '입력 팝오버의 글상자. 포커스는 테두리 색으로 보인다',
  },
  {
    file: 'src/app/(public)/login/page.tsx',
    rule: 'outlineNone',
    count: 1,
    reason: '입력칸. 포커스는 테두리 색과 focus:ring-1 로 보인다',
  },
  {
    file: 'src/app/(public)/profile/components/EmploymentInfo.tsx',
    rule: 'outlineNone',
    count: 1,
    reason: '프로필 편집 입력칸. 포커스는 테두리 색과 focus:ring-2 로 보인다',
  },
  {
    file: 'src/app/(public)/profile/components/AttendanceRecord.tsx',
    rule: 'outlineNone',
    count: 3,
    reason: '휴가 신청 창 입력칸. 포커스는 focus:ring-2 로 보인다. 모달 규칙 대기',
  },
  // 모달 밖, 다른 카드에서 본다
  {
    file: 'src/app/(private)/dashboard/dashboard.utils.ts',
    rule: 'purple',
    count: 8,
    reason:
      '빠른 작업 아이콘 타일 색. 지침 적용 순서 7 "대시보드 재구성" 에서 링크 목록으로 바뀐다',
  },
  {
    file: 'src/app/components/header/Notification/NotificationList.tsx',
    rule: 'purple',
    count: 1,
    reason: '알림 출처(재무) 구분 색. 알림 목록의 출처 아이콘과 색은 별도 보고',
  },
];

describe('디자인 지침 12장 정적 검사', () => {
  it('세는 규칙이 클래스만 잡는다', () => {
    expect(countRules('"p-2 shadow-sm hover:shadow-md shadow shadow-[inset_3px_0_0_red]"')).toEqual(
      {
        shadow: 4,
      },
    );
    expect(countRules('"shadow-none transition-shadow" castShadow shadow-mapSize={1024}')).toEqual(
      {},
    );
    expect(countRules('"shadow-xl shadow-slate-200/60"')).toEqual({ shadow: 2 });
    expect(countRules('"bg-gradient-to-r bg-linear-to-r from-blue-400"')).toEqual({ gradient: 2 });
    expect(
      countRules('"bg-radial bg-conic from-blue-500 bg-radial-[at_50%_75%] bg-conic-180"'),
    ).toEqual({ gradient: 4 });
    expect(countRules('"bg-radius bg-linearity"')).toEqual({});
    expect(
      countRules(
        '"drop-shadow-md text-shadow-sm inset-shadow-xs drop-shadow shadow-(--my-shadow)"',
      ),
    ).toEqual({ shadow: 5 });
    expect(countRules('"drop-shadow-none text-shadow-none inset-shadow-none"')).toEqual({});
    expect(countRules("'text-purple-600' violet: 1, purpleish")).toEqual({ purple: 2 });
    expect(countRules('"focus:outline-none focus-visible:outline-none outline-none"')).toEqual({
      outlineNone: 1,
    });
    expect(
      countRules(
        "export const A_TABS: Tab[] = [\n  { id: 'a', icon: 'ri-x' },\n];\nconst NAV = [{ icon: 'ri-y' }];",
      ),
    ).toEqual({ tabIcon: 1 });
  });

  it('화면 코드의 그림자, 그라데이션, 보라색, 탭 아이콘은 허용 목록과 정확히 같다', () => {
    const found = screenFiles().flatMap((file) =>
      Object.entries(countRules(readFileSync(path.join(REPO, file), 'utf8'))).map(
        ([rule, count]) => `${file} ${rule} ${count}`,
      ),
    );
    const allowed = ALLOWED.map(({ file, rule, count }) => `${file} ${rule} ${count}`);
    expect(
      found.sort(),
      '허용 파일에서 위반을 줄였으면 ALLOWED 의 count 를 낮추거나 항목을 지운다. 늘려야 하면 이유와 함께 항목을 더한다',
    ).toEqual(allowed.sort());
  });

  it('허용 목록마다 이유가 있고 같은 파일, 규칙이 두 번 나오지 않는다', () => {
    expect(ALLOWED.filter(({ reason }) => reason.trim() === '')).toEqual([]);
    const keys = ALLOWED.map(({ file, rule }) => `${file} ${rule}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
