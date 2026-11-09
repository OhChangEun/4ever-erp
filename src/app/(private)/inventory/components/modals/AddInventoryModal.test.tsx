import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { scenarioResponse } from '@/mocks/scenario';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import AddInventoryModal from './AddInventoryModal';

describe('자재 추가 모달', () => {
  it('자재 목록 조회가 실패하면 오류 창을 보인다(예전엔 빈 선택 목록만 보였다)', async () => {
    server.use(http.get(INVENTORY_ENDPOINTS.ITEM_TOGGLE, () => scenarioResponse('500')));
    renderWithProviders(<AddInventoryModal id="m" onClose={() => undefined} />);
    expect(
      await screen.findByText(/정보를 불러오는 중 오류가 발생했습니다/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
