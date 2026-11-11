import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import QuotationTab from './components/tabs/QuotationTab';
import OrdersTab from './components/tabs/OrdersTab';
import PlannedOrdersTab from './components/tabs/PlannedOrdersTab';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/production',
}));

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

/** 표가 그려진 뒤 버튼이 있는지 본다(목록 로딩 중에도 버튼 줄은 그려지지만 데이터까지 기다린다) */
const buttonShown = async (name: string) => {
  await screen.findAllByRole('row');
  return screen.queryByRole('button', { name }) !== null;
};

// 게이트웨이 @PreAuthorize 가 403 을 주는 역할에게는 버튼을 숨긴다(생산 버튼 권한 카드)
describe('생산 화면 버튼은 게이트웨이 권한을 따른다', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  describe.each([
    ['견적 시뮬레이션(PpController 488)', QuotationTab, '시뮬레이션'],
    ['MRP 계획 주문 전환(PpController 326)', OrdersTab, '계획 주문 전환'],
  ])('%s', (_, Tab, label) => {
    it.each(['MM_USER', 'SD_ADMIN', 'IM_USER'])('%s 에게는 안 보인다', async (role) => {
      loginAs(role);
      renderWithProviders(<Tab />);
      expect(await buttonShown(label)).toBe(false);
    });

    it.each(['PP_USER', 'PP_ADMIN', 'ALL_ADMIN'])('%s 에게는 보인다', async (role) => {
      loginAs(role);
      renderWithProviders(<Tab />);
      expect(await buttonShown(label)).toBe(true);
    });
  });

  describe('계획 주문 자재 구매 요청(IM items/info 다음 MM stock-purchase-requisitions)', () => {
    it.each(['MM_USER', 'SD_USER', 'IM_ADMIN', 'PP_USER', 'PP_ADMIN'])(
      '%s 에게는 안 보인다(두 API 중 하나가 403)',
      async (role) => {
        loginAs(role);
        renderWithProviders(<PlannedOrdersTab />);
        expect(await buttonShown('자재 구매 요청')).toBe(false);
      },
    );

    it('ALL_ADMIN 에게는 보인다', async () => {
      loginAs('ALL_ADMIN');
      renderWithProviders(<PlannedOrdersTab />);
      expect(await buttonShown('자재 구매 요청')).toBe(true);
    });
  });
});
