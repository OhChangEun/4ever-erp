import { type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import ShippingManagementList from './inventory/components/tabs/ShippingManagementList';
import ReceivingManagementList from './inventory/components/tabs/ReceivingManagementList';
import WorkflowStatus from './dashboard/components/WorkflowStatus';
import EmployeeManagement from './hrm/components/tabs/mainTab/EmployeeManagement';
import AttendanceManagement from './hrm/components/tabs/mainTab/AttendanceManagement';
import TrainingManagement from './hrm/components/tabs/mainTab/TrainingManagement';
import MrpTab from './production/components/tabs/MrpTab';

const nav = { search: new URLSearchParams(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => nav.search,
  usePathname: () => '/screen',
}));

/**
 * 디자인 지침 위반 정리 카드. 세그먼트(서브탭)는 공통 TabButtons 다(지침 12장 화면 뼈대 3줄).
 * 선택은 색만이 아니라 aria-pressed 로 알린다. 버튼 이름은 글자 그대로다(아이콘 글자가 붙지 않는다).
 */
const LOCAL_SEGMENTS: {
  screen: string;
  ui: () => ReactElement;
  group: string;
  first: RegExp;
  second: RegExp;
}[] = [
  {
    screen: '출고 관리',
    ui: () => <ShippingManagementList />,
    group: '출고 관리 탭',
    first: /^생산중 \(/,
    second: /^출고 준비 완료 \(/,
  },
  {
    screen: '입고 관리',
    ui: () => <ReceivingManagementList />,
    group: '입고 관리 탭',
    first: /^입고 대기 \(/,
    second: /^입고 완료 \(/,
  },
  {
    screen: '대시보드 워크플로우',
    ui: () => (
      <WorkflowStatus
        workflowData={{
          tabs: [
            { tabCode: 'IN', items: [] },
            { tabCode: 'OUT', items: [] },
          ],
        }}
      />
    ),
    group: '워크플로우 현황 탭',
    first: /^입고 프로세스$/,
    second: /^출고 프로세스$/,
  },
];

describe('화면 안에서 바뀌는 세그먼트', () => {
  it.each(LOCAL_SEGMENTS)('$screen: 누르면 선택이 aria-pressed 로 옮겨 간다', async (seg) => {
    renderWithProviders(seg.ui());
    const first = await screen.findByRole('button', { name: seg.first });
    const second = screen.getByRole('button', { name: seg.second });
    expect(screen.getByRole('group', { name: seg.group })).toContainElement(first);

    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(second).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveAttribute('aria-pressed', 'false');
  });
});

const URL_SEGMENTS: {
  screen: string;
  ui: () => ReactElement;
  group: string;
  names: [string, string];
  secondId: string;
}[] = [
  {
    screen: '인사 직원관리',
    ui: () => <EmployeeManagement />,
    group: '직원관리 탭',
    names: ['직원정보', '부서관리'],
    secondId: 'organization',
  },
  {
    screen: '인사 근태관리',
    ui: () => <AttendanceManagement />,
    group: '근태관리 탭',
    names: ['출퇴근 기록', '휴가 관리'],
    secondId: 'leave',
  },
  {
    screen: '인사 교육관리',
    ui: () => <TrainingManagement />,
    group: '교육관리 탭',
    names: ['직원별 교육 상태', '교육 프로그램 목록'],
    secondId: 'programs',
  },
  {
    screen: '생산 MRP',
    ui: () => <MrpTab />,
    group: 'MRP 탭',
    names: ['순소요', '계획 주문'],
    secondId: 'orders',
  },
];

describe('주소(?subTab=)로 고르는 세그먼트', () => {
  it.each(URL_SEGMENTS)(
    '$screen: 세그먼트 버튼이고 이름은 글자 그대로, 누르면 subTab 을 바꾼다',
    async (seg) => {
      nav.search = new URLSearchParams('tab=x');
      nav.replace.mockClear();
      renderWithProviders(seg.ui());
      const [first, second] = seg.names.map((name) => screen.getByRole('button', { name }));
      expect(screen.getByRole('group', { name: seg.group })).toContainElement(first);

      expect(first).toHaveAttribute('aria-pressed', 'true');
      expect(second).toHaveAttribute('aria-pressed', 'false');
      // 2단 밑줄 탭(nav)으로 쌓지 않는다
      expect(first.closest('nav')).toBeNull();
      await userEvent.click(second);
      expect(nav.replace).toHaveBeenCalledWith(`/screen?tab=x&subTab=${seg.secondId}`);
    },
  );

  it('생산 MRP 도 모르는 subTab 이면 빈 화면 대신 첫 세그먼트(인사와 같은 규칙)', () => {
    nav.search = new URLSearchParams('tab=mrp&subTab=nope');
    renderWithProviders(<MrpTab />);
    expect(screen.getByRole('button', { name: '순소요' })).toHaveAttribute('aria-pressed', 'true');
  });
});
