import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import SidebarNavigation from '@/app/components/sidebar/SidebarNavigation';
import { getRoleLabel } from '@/app/components/header/roleLabel';
import QuickActions from './dashboard/components/QuickActions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

// 데모 계정 pp_admin 이 생기면서 처음 화면으로 보게 되는 역할이다(카드 로그인 아이디와 생산 데모 계정).
// 역할로 갈라지는 세 곳의 지금 동작을 고정한다
describe('PP_ADMIN 으로 본 메뉴와 대시보드', () => {
  afterEach(() => useAuthStore.getState().clearUserInfo());

  const loginAsPpAdmin = () =>
    useAuthStore
      .getState()
      .setUserInfo({ id: 7, name: '생산 관리자', email: 'pp_admin@everp.local', role: 'PP_ADMIN' });

  it('사이드바에 대시보드, 영업, 생산, 구매, 재고만 보인다', () => {
    loginAsPpAdmin();
    renderWithProviders(<SidebarNavigation isExpanded />);
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/sales',
      '/production',
      '/purchase',
      '/inventory',
    ]);
  });

  it('대시보드 빠른 작업에 구매 요청과 생산 다섯 개가 보인다', () => {
    loginAsPpAdmin();
    renderWithProviders(<QuickActions />);
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/purchase',
      '/production?tab=quotations',
      '/production?tab=mps',
      '/production?tab=mrp',
      '/production?tab=mes',
      '/production?tab=bom',
    ]);
  });

  it('역할 표시는 생산 부서 관리자', () => {
    expect(getRoleLabel('PP_ADMIN')).toEqual({
      kind: 'department',
      key: 'ADMIN',
      department: 'production',
    });
  });
});
