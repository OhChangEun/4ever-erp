import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import { formatNumber } from '@/app/utils/number';
import { monthlyMetric } from '@/mocks/handlers/financeAnalytics.handlers';
import PurchaseClient from './PurchaseClient';
import PurchaseRequestListTab from './components/tabs/PurchaseRequestListTab';
import SupplierListTab from './components/tabs/SupplierListTab';
import PurchaseOrderDetailModal from './components/modals/PurchaseOrderDetailModal';
import SupplierFormModal from './components/modals/SupplierFormModal';
import PurchaseOrderListTab from './components/tabs/PurchaseOrderListTab';
import { chromeHangul } from '@/test/chromeHangul';
import { hangulOptions } from '@/test/dropdownOptions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/purchase',
}));

/** 발주 금액 카드의 주 값(재무 월별 손익 목의 이번 달 매입 7/30) */
const weekPurchases = () => `₩${formatNumber(monthlyMetric('purchases').week)}`;

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

describe('구매 화면 영어(i18n 5)', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  it('탭 이름과 통계 카드 제목이 영어, 건수에 단위 "건"이 붙지 않는다', async () => {
    loginAs('ALL_ADMIN');
    renderWithProviders(<PurchaseClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(within(metrics).getByText('Purchase requests')).toBeInTheDocument();
    expect(within(metrics).getByText('Purchase order amount')).toBeInTheDocument();
    // 구매 요청은 목록 15건, 발주 금액은 재무 월별 손익의 이번 달 매입의 7/30(카드 "목 데이터 현실성").
    // 매입은 이번 달 주문 합에서 나와 날마다 달라 목에서 꺼낸다(카드 "데모 데이터 채우기")
    expect(within(metrics).getByText('15')).toBeInTheDocument();
    expect(within(metrics).getByText(weekPurchases())).toBeInTheDocument();
    expect(within(metrics).queryByText(/건/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase requests' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suppliers' })).toBeInTheDocument();
  });

  it('한국어 탭과 통계 카드는 예전과 같다(구매 요청 15건)', async () => {
    loginAs('ALL_ADMIN');
    renderWithProviders(<PurchaseClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(within(metrics).getByText('구매 요청')).toBeInTheDocument();
    expect(within(metrics).getByText('15건')).toBeInTheDocument();
    expect(within(metrics).getByText(weekPurchases())).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '공급업체 관리' })).toBeInTheDocument();
  });

  it('공급사는 발주서 탭 하나와 발주 건수 카드만 영어로 본다', async () => {
    loginAs('SUPPLIER_ADMIN');
    renderWithProviders(<PurchaseClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(within(metrics).getByText('Purchase orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase orders' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suppliers' })).not.toBeInTheDocument();
  });

  it('구매 요청 목록의 표 머리와 버튼이 영어, 작성 모달도 영어', async () => {
    loginAs('MM_USER'); // 승인과 반려는 MM 과 ALL_ADMIN 에게만 보인다
    renderWithProviders(<PurchaseRequestListTab />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Request no.' })).toBeInTheDocument();
    expect(await screen.findByText('PR-2026-015')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reject' }).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'New purchase request' }));
    const dialog = await screen.findByRole('dialog', { name: 'New purchase request' });
    expect(within(dialog).getByRole('columnheader', { name: 'Est. unit price' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Submit request' })).toBeInTheDocument();
    expect(within(dialog).getByText('Estimated total:')).toBeInTheDocument();
  });

  // 남은 한국어 문자열 카드: 서버가 코드와 글자를 같이 주는 검색 타입과 상태 드롭다운
  it.each([
    ['구매 요청', PurchaseRequestListTab],
    ['발주서', PurchaseOrderListTab],
    ['공급업체', SupplierListTab],
  ])('%s 목록의 필터와 검색 타입 드롭다운이 영어', async (_, Tab) => {
    loginAs('ALL_ADMIN');
    const user = userEvent.setup();
    renderWithProviders(<Tab />, { locale: 'en' });
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));
    expect(chromeHangul(document.body)).toEqual([]);
    expect(await hangulOptions(user)).toEqual([]);
  });

  it('검색 타입 기본값(첫 항목)이 영어, 한국어는 서버 글자와 같다', async () => {
    loginAs('ALL_ADMIN');
    const { unmount } = renderWithProviders(<PurchaseRequestListTab />, { locale: 'en' });
    const combobox = await screen.findByRole('combobox', { name: 'Search type' });
    await waitFor(() => expect(combobox).toHaveTextContent('Request no.'));
    unmount();
    renderWithProviders(<PurchaseRequestListTab />);
    const ko = await screen.findByRole('combobox', { name: '검색 타입' });
    await waitFor(() => expect(ko).toHaveTextContent('요청 번호'));
  });

  it('공급업체 목록의 배송 기간이 영어 복수형', async () => {
    loginAs('MM_USER'); // 공급업체 등록은 MM 과 ALL_ADMIN 에게만 보인다
    renderWithProviders(<SupplierListTab />, { locale: 'en' });
    expect(await screen.findByRole('heading', { name: 'Suppliers' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '5 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add supplier' })).toBeInTheDocument();
  });

  it('한국어 공급업체 목록 배송 기간은 예전과 같다(5일)', async () => {
    renderWithProviders(<SupplierListTab />);
    expect(await screen.findByRole('cell', { name: '5일' })).toBeInTheDocument();
  });

  it('공급업체 등록 폼의 라벨, 당일 배송, 자재 수가 영어', () => {
    renderWithProviders(<SupplierFormModal onClose={() => {}} id="m" />, { locale: 'en' });
    // 공통 Input 의 label 은 입력과 이어져 있지 않아 글자로 찾는다
    expect(screen.getByText('Company email')).toBeInTheDocument();
    expect(screen.getByText('(Same-day delivery)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Available materials (0 entered)' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add supplier' })).toBeInTheDocument();
  });

  it('한국어 공급업체 등록 폼 문구는 예전과 같다', () => {
    renderWithProviders(<SupplierFormModal onClose={() => {}} id="m" />);
    expect(screen.getByText('(당일 배송)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '제공 가능한 자재 목록 (0건 입력)' })).toBeVisible();
  });

  it('발주서 상세의 라벨과 품목 표 머리가 영어', async () => {
    renderWithProviders(<PurchaseOrderDetailModal purchaseOrderId="po-001" onClose={() => {}} />, {
      locale: 'en',
    });
    expect(await screen.findByText('PO no.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Unit price' })).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
  });
});
