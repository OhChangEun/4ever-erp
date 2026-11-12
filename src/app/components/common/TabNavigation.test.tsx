import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import TabNavigation from './TabNavigation';

const nav = vi.hoisted(() => ({ search: 'tab=chart' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/sales',
}));

const tabs = [
  { id: 'list', name: '견적 관리', component: () => <p>목록</p> },
  { id: 'chart', name: '매출 분석', component: () => <p>차트</p> },
];

describe('TabNavigation', () => {
  // 카드 화면 아래가 잘리는 곳. 높이는 jsdom 이 계산하지 못해 e2e/clipped-content.spec.ts 가 본다.
  // 여기서는 내용 칸이 스크롤 칸이고 키보드로 닿는 이름 있는 영역인지만 본다
  it('탭 내용 칸은 활성 탭 이름이 붙은 영역이고 키보드 포커스를 받는 스크롤 칸이다', () => {
    nav.search = 'tab=chart';
    renderWithProviders(<TabNavigation tabs={tabs} />);
    const region = screen.getByRole('region', { name: '매출 분석' });
    expect(region).toHaveTextContent('차트');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('overflow-auto');
    expect(region).not.toHaveClass('overflow-hidden');
  });

  // 리뷰 P3: ?tab= 에 없는 값이면 내용이 없다. 이름 없는 빈 칸이 Tab 정지가 되면 안 된다
  it('주소의 탭이 없는 값이면 탭 버튼 뒤에 포커스 받는 빈 칸이 없다', async () => {
    nav.search = 'tab=missing';
    const user = userEvent.setup();
    renderWithProviders(<TabNavigation tabs={tabs} />);
    await user.tab();
    expect(screen.getByRole('button', { name: '견적 관리' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: '매출 분석' })).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });
});
