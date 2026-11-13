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
 * - 아이콘: 사이드바 메뉴, 입력 접두사(검색 돋보기, 달력), 모달 닫기(×)와 드롭다운 화살표 세 곳뿐(남은 접근성과 디자인 카드).
 *   아이콘 글꼴 클래스 `ri-*` 를 센다. 지침이 허용한 곳은 `ICON_HOMES`, 나머지 남기는 곳은 `ALLOWED`.
 * 주석도 센다. 지운 코드를 주석으로 남기지 않는다.
 */
type Rule = 'shadow' | 'gradient' | 'purple' | 'tabIcon' | 'outlineNone' | 'icon';

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
  icon: /(?<![\w-])ri-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g,
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
interface Allowance {
  file: string;
  rule: Rule;
  count: number;
  reason: string;
}

/** 아이콘 허용 줄 여러 개를 [파일, 개수, 무엇] 으로 적는다 */
const iconRows = (rows: [string, number, string][], why: (what: string) => string): Allowance[] =>
  rows.map(([file, count, what]) => ({ file, rule: 'icon', count, reason: why(what) }));

/** 지침 12장 아이콘 절이 허용한 세 곳. 개수는 ALLOWED 와 같이 정확히 맞아야 한다 */
const ICON_HOMES: Allowance[] = [
  {
    file: 'src/app/components/sidebar/SidebarNavigation.tsx',
    rule: 'icon',
    count: 7,
    reason: '허용 1 사이드바 메뉴',
  },
  {
    file: 'src/app/components/sidebar/Sidebar.tsx',
    rule: 'icon',
    count: 3,
    reason: '허용 1 사이드바 메뉴(모바일 메뉴 열기, 접기와 펼치기)',
  },
  {
    file: 'src/app/components/sidebar/SidebarProfile.tsx',
    rule: 'icon',
    count: 5,
    reason: '허용 1 사이드바 메뉴(프로필 메뉴)',
  },
  {
    file: 'src/app/components/header/Notification/NotificationBell.tsx',
    rule: 'icon',
    count: 1,
    reason: '허용 1 사이드바 메뉴(알림)',
  },
  { file: 'packages/ui/src/SearchBar.tsx', rule: 'icon', count: 1, reason: '허용 2 검색 돋보기' },
  {
    file: 'src/app/components/common/CalendarButton.tsx',
    rule: 'icon',
    count: 1,
    reason: '허용 2 달력',
  },
  ...iconRows(
    [
      'src/app/(private)/hrm/components/tabs/subTab/attendanceTab/AttendanceTab.tsx',
      'src/app/(private)/hrm/components/tabs/subTab/attendanceTab/LeaveTab.tsx',
      'src/app/(private)/hrm/components/tabs/subTab/employeeTab/EmployeesTab.tsx',
      'src/app/(private)/hrm/components/tabs/subTab/trainingTab/EmployeeTrainingTab.tsx',
      'src/app/(private)/hrm/components/tabs/mainTab/PayrollManagement.tsx',
    ].map((file) => [file, 1, '']),
    () => '허용 2 검색 입력 돋보기',
  ),
  {
    file: 'packages/ui/src/Dropdown.tsx',
    rule: 'icon',
    count: 1,
    reason: '허용 3 드롭다운 화살표',
  },
  {
    file: 'src/app/(public)/profile/components/AttendanceRecord.tsx',
    rule: 'icon',
    count: 1,
    reason: '허용 3 휴가 신청 창 닫기(×)',
  },
];

const ALLOWED: Allowance[] = [
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
  // 아이콘(남은 접근성과 디자인 카드). 모달 파일과 모달 안 화면은 모달 규칙(사용자 결정 대기) 카드에서 본다
  ...iconRows(
    [
      [
        'src/app/components/common/modal/ModalContainer.tsx',
        2,
        '닫기(×, 허용 3)와 오류 상자 아이콘',
      ],
      ['src/app/components/header/ProfileInfoModal.tsx', 6, '닫기와 연락처 행 아이콘'],
      [
        'src/app/(private)/sales/components/modals/QuoteReviewModal.tsx',
        9,
        '재고 확인 버튼과 결과',
      ],
      ['src/app/(private)/sales/components/modals/NewOrderModal.tsx', 2, '행 추가, 삭제 버튼'],
      ['src/app/(private)/sales/components/modals/CustomerDetailModal.tsx', 2, '연락처 행'],
      [
        'src/app/(private)/production/components/modals/ProcessDetailModal.tsx',
        5,
        '공정 버튼과 결과',
      ],
      ['src/app/(private)/production/components/modals/BomDetailModal.tsx', 5, '로딩, 오류, 버튼'],
      ['src/app/(private)/production/components/modals/BomInputFormModal.tsx', 2, '끌기 손잡이'],
      ['src/app/(private)/purchase/components/modals/PurchaseRequestFormModal.tsx', 1, '행 삭제'],
      ['src/app/(private)/purchase/components/modals/SupplierFormModal.tsx', 1, '행 삭제'],
      ['src/app/(private)/purchase/components/modals/SupplierDetailModal.tsx', 1, '수정 버튼'],
      ['src/app/(private)/inventory/components/modals/InventoryMoveModal.tsx', 1, '닫기(×)'],
      ['src/app/(private)/inventory/components/modals/InventorySafetyStockModal.tsx', 1, '닫기(×)'],
      ['src/app/(private)/warehouse/components/modals/WarehouseDetailModal.tsx', 1, '관리 버튼'],
      [
        'src/app/(private)/warehouse/components/warehouseVisualizer/components/WarehouseVisualizer.tsx',
        4,
        '3D 보기 안 이동 버튼',
      ],
      [
        'src/app/(private)/inventory/inventory.utils.ts',
        3,
        '재고 상세 모달의 이동 기록 아이콘(목록 위 최근 이동에서는 지웠다)',
      ],
      ['packages/ui/src/ModalStatusBox.tsx', 1, '모달 안 오류 상자'],
      ['packages/ui/src/ConflictDialog.tsx', 1, '409 충돌 대화상자 경고'],
    ],
    (what) => `모달 안 ${what}. 모달 규칙 대기`,
  ),
  // 대시보드 재구성(지침 적용 순서 7)에서 링크 목록과 표로 바뀐다
  ...iconRows(
    [
      ['src/app/(private)/dashboard/dashboard.utils.ts', 26, ''],
      ['src/app/(private)/dashboard/components/QuickActions.tsx', 1, ''],
      ['src/app/(private)/dashboard/components/ActionCard.tsx', 1, ''],
      ['src/app/(private)/dashboard/components/WorkflowStatus.tsx', 2, ''],
    ],
    () => '빠른 작업 아이콘 타일, 워크플로우 제목과 행 아이콘. 지침 적용 순서 7 대시보드 재구성',
  ),
  // 이 카드 범위 밖. 지침 문장을 바꿀지 화면을 바꿀지 정할 곳(카드 별도 보고)
  ...iconRows(
    [
      ['packages/ui/src/Pagination.tsx', 2, '쪽 이동 이전, 다음 화살표(aria-label 있음)'],
      ['packages/ui/src/SimplePagination.tsx', 2, '쪽 이동 이전, 다음 화살표'],
      ['src/app/components/common/CalendarGrid.tsx', 2, '달력 팝오버의 달 이동 화살표'],
      ['src/app/components/common/toast/ToastProvider.tsx', 5, '토스트 종류 아이콘과 닫기(×)'],
      ['src/app/components/common/TableStatusBox.tsx', 1, '표 안 오류 상자 경고'],
      ['packages/ui/src/LoadingMessage.tsx', 1, '로딩 회전 표시'],
      ['src/app/error.tsx', 1, '오류 화면 경고 그림(버튼 아이콘은 지웠다)'],
      ['src/app/(private)/error.tsx', 1, '화면 오류 경고 그림(버튼 아이콘은 지웠다)'],
      ['src/app/(public)/unauthorized/page.tsx', 1, '권한 없음 경고 그림'],
      ['src/app/(public)/login/page.tsx', 1, '데모 계정 행 끝 화살표'],
      [
        'src/app/(private)/production/components/tabs/MesTab.tsx',
        2,
        'MES 공정 점의 완료, 진행 표시',
      ],
      ['src/app/(private)/production/components/tabs/BomTab.tsx', 2, 'BOM 트리 로딩, 오류 그림'],
      ['src/app/(private)/finance/components/tabs/InvoiceList.tsx', 1, '전표 목록 제목 아이콘'],
      ['src/app/(private)/sales/components/tabs/SalesChart.tsx', 1, '차트 빈 상태 그림'],
      ['src/app/(private)/inventory/components/StockMovement.tsx', 1, '최근 이동 빈 상태 그림'],
      ['src/app/(private)/inventory/components/LowStockAlert.tsx', 1, '부족 알림 빈 상태 그림'],
      ['src/app/components/header/Notification/NotificationList.tsx', 1, '알림 빈 상태 그림'],
      [
        'src/app/components/header/Notification/NotificationHeader.tsx',
        1,
        '알림 팝오버 제목 아이콘',
      ],
      ['packages/ui/src/InputList.tsx', 2, '앱에서 안 쓰는 목록 입력의 추가, 지우기 버튼'],
      ['packages/ui/src/DropdownInputModal.tsx', 1, '입력 팝오버 여는 연필 버튼'],
      ['packages/ui/src/DropdownInputListModal.tsx', 1, '입력 목록 팝오버 여는 연필 버튼'],
    ],
    (what) => `${what}. 이 카드 범위 밖, 카드 별도 보고`,
  ),
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
    ).toEqual({ tabIcon: 1, icon: 2 });
    expect(countRules('"ri-arrow-down-line text-sm" icon="ri-search-line" `${a} ri-x`')).toEqual({
      icon: 3,
    });
    expect(countRules('"pri-1 ri- ri-A" scrollbar-none henri-x')).toEqual({});
  });

  it('화면 코드의 그림자, 그라데이션, 보라색, 탭 아이콘, 아이콘은 허용 목록과 정확히 같다', () => {
    const found = screenFiles().flatMap((file) =>
      Object.entries(countRules(readFileSync(path.join(REPO, file), 'utf8'))).map(
        ([rule, count]) => `${file} ${rule} ${count}`,
      ),
    );
    const allowed = [...ICON_HOMES, ...ALLOWED].map(
      ({ file, rule, count }) => `${file} ${rule} ${count}`,
    );
    expect(
      found.sort(),
      '허용 파일에서 위반을 줄였으면 ALLOWED 의 count 를 낮추거나 항목을 지운다. 늘려야 하면 이유와 함께 항목을 더한다. ' +
        '아이콘(icon)은 예외를 더하기 전에 글자로 뜻을 전한다. 허용은 사이드바 메뉴, 입력 접두사, 모달 닫기와 드롭다운 화살표 세 곳(DESIGN_GUIDELINES.md 12장)',
    ).toEqual(allowed.sort());
  });

  it('허용 목록마다 이유가 있고 같은 파일, 규칙이 두 번 나오지 않는다', () => {
    const all = [...ICON_HOMES, ...ALLOWED];
    expect(all.filter(({ reason }) => reason.trim() === '')).toEqual([]);
    const keys = all.map(({ file, rule }) => `${file} ${rule}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
