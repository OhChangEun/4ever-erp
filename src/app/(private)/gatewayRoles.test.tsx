import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ReactElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import LowStockList from './low-stock/components/LowStockList';
import PurchaseRequestListTab from './purchase/components/tabs/PurchaseRequestListTab';
import SupplierListTab from './purchase/components/tabs/SupplierListTab';
import WarehouseList from './warehouse/components/WarehouseList';
import InventoryDetailModal from './inventory/components/modals/InventoryDetailModal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

interface Case {
  name: string;
  render: () => ReactElement;
  /** 화면이 다 그려졌다는 표시. 이것이 보인 뒤 버튼 유무를 본다 */
  ready: () => Promise<unknown>;
  label: string;
  allowed: string[];
  denied: string[];
}

const rows = () => screen.findAllByRole('row');
const MM_ONLY = {
  allowed: ['MM_USER', 'MM_ADMIN', 'ALL_ADMIN'],
  denied: ['SD_USER', 'IM_USER', 'PP_ADMIN'],
};
const IM_ONLY = {
  allowed: ['IM_USER', 'IM_ADMIN', 'ALL_ADMIN'],
  denied: ['MM_USER', 'SD_ADMIN', 'PP_USER'],
};

// 게이트웨이 @PreAuthorize 가 403 을 주는 역할에게는 버튼을 숨긴다(생산 버튼 권한 카드 리뷰)
const CASES: Case[] = [
  {
    name: '안전재고 선택 품목 발주(MmController 184-185 stock-purchase-requisitions)',
    render: () => <LowStockList />,
    ready: rows,
    label: '선택 품목 발주',
    ...MM_ONLY,
  },
  {
    name: '구매 요청 승인(MmController 335)',
    render: () => <PurchaseRequestListTab />,
    // 목록 첫 쪽 맨 위의 대기 요청(기본 15건, 최신순. 카드 "데모 데이터 채우기")
    ready: () => screen.findByText('PR-2026-015'),
    label: '승인',
    ...MM_ONLY,
  },
  {
    name: '구매 요청 반려(MmController 371)',
    render: () => <PurchaseRequestListTab />,
    // 목록 첫 쪽 맨 위의 대기 요청(기본 15건, 최신순. 카드 "데모 데이터 채우기")
    ready: () => screen.findByText('PR-2026-015'),
    label: '반려',
    ...MM_ONLY,
  },
  {
    name: '공급업체 등록(MmController 111)',
    render: () => <SupplierListTab />,
    ready: rows,
    label: '공급업체 등록',
    ...MM_ONLY,
  },
  {
    name: '창고 추가(ImController 423)',
    render: () => <WarehouseList />,
    ready: () => screen.findAllByRole('button', { name: '상세보기' }),
    label: '창고 추가',
    ...IM_ONLY,
  },
  {
    name: '재고 이동(ImController 297)',
    render: () => (
      <InventoryDetailModal id="detail" onClose={() => {}} selectedItemId="item-1001" />
    ),
    ready: () => screen.findByRole('button', { name: '안전 재고 수정' }),
    label: '재고 이동',
    ...IM_ONLY,
  },
];

describe('게이트웨이가 역할로 막는 쓰기 버튼', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  describe.each(CASES)('$name', ({ render, ready, label, allowed, denied }) => {
    it.each(denied)('%s 에게는 안 보인다', async (role) => {
      loginAs(role);
      renderWithProviders(render());
      await ready();
      expect(screen.queryAllByRole('button', { name: label })).toHaveLength(0);
    });

    it.each(allowed)('%s 에게는 보인다', async (role) => {
      loginAs(role);
      renderWithProviders(render());
      await ready();
      expect(screen.getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
    });
  });
});
