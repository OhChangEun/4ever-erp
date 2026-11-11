import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import ProductionClient from './ProductionClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=bom'),
  usePathname: () => '/production',
}));

// 게이트웨이 PATCH /boms/{id} 는 BomCreateRequestDto 를 받아 {statusCode, version} 을 버린다.
// 실백엔드(BACKEND_API_URL)가 붙으면 상태 토글과 충돌 재현 버튼을 숨겨 빈 수정이 가지 않게 한다
const openBomDetail = async (realBackend: boolean) => {
  renderWithProviders(<ProductionClient realBackend={realBackend} />);
  const detailButtons = await screen.findAllByRole('button', { name: '상세보기' });
  await userEvent.click(detailButtons[0]);
  const dialog = await screen.findByRole('dialog', { name: 'BOM 상세 정보' });
  // 상세가 다 받아진 뒤에 버튼 유무를 본다
  await within(dialog).findByText('구성품 리스트');
  return dialog;
};

describe('BOM 상세의 상태 토글과 충돌 재현 버튼', () => {
  it('실백엔드가 붙으면 두 버튼이 없다', async () => {
    const dialog = await openBomDetail(true);
    expect(within(dialog).queryByRole('button', { name: /활성화$/ })).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: '충돌 시뮬레이션' }),
    ).not.toBeInTheDocument();
  });

  it('서버 목이면 두 버튼이 있다', async () => {
    const dialog = await openBomDetail(false);
    expect(within(dialog).getByRole('button', { name: /활성화$/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '충돌 시뮬레이션' })).toBeInTheDocument();
  });
});
