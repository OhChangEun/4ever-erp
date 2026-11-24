import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { scenarioResponse } from '@/mocks/scenario';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import AddInventoryModal from './AddInventoryModal';

describe('자재 추가 모달', () => {
  it('기본 목의 품목 14개를 고를 수 있고 고른 품목의 단가와 공급사가 나온다', async () => {
    renderWithProviders(<AddInventoryModal id="m" onClose={() => undefined} />);
    const bolt = await screen.findByRole('option', { name: '볼트 M6' });
    const [material] = screen.getAllByRole('combobox');
    // 안내 한 줄 + 품목표 14개
    expect(within(material).getAllByRole('option')).toHaveLength(15);
    await userEvent.selectOptions(material, bolt);
    expect(await screen.findByDisplayValue('1,300')).toBeInTheDocument();
    expect(screen.getByDisplayValue('대양상사')).toBeInTheDocument();
  });

  it('자재 목록 조회가 실패하면 오류 창을 보인다(예전엔 빈 선택 목록만 보였다)', async () => {
    server.use(http.get(INVENTORY_ENDPOINTS.ITEM_TOGGLE, () => scenarioResponse('500')));
    renderWithProviders(<AddInventoryModal id="m" onClose={() => undefined} />);
    expect(
      await screen.findByText(/정보를 불러오는 중 오류가 발생했습니다/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
