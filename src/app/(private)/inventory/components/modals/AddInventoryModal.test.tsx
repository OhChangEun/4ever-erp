import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { scenarioResponse } from '@/mocks/scenario';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import InventoryList from '../tabs/InventoryList';
import AddInventoryModal from './AddInventoryModal';

describe('자재 추가 모달', () => {
  it('기본 목의 재고에 없는 자재 6개를 고를 수 있고 고른 품목의 단가와 공급사가 나온다', async () => {
    renderWithProviders(<AddInventoryModal id="m" onClose={() => undefined} />);
    const magnet = await screen.findByRole('option', { name: '영구자석' });
    const [material] = screen.getAllByRole('combobox');
    // 안내 한 줄 + 재고에 없는 자재 6개(카드 "반려 견적과 등록 반영". 예전엔 이미 재고에 있는 14개였다)
    expect(within(material).getAllByRole('option')).toHaveLength(7);
    expect(screen.queryByRole('option', { name: '볼트 M6' })).not.toBeInTheDocument();
    await userEvent.selectOptions(material, magnet);
    expect(await screen.findByDisplayValue('3,100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('대양상사')).toBeInTheDocument();
  });

  it('추가하면 부족 재고 위젯과 재고 목록에 나오고 다시 열면 그 자재는 고를 수 없다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryList />);
    const openAdd = async () => {
      await user.click(await screen.findByRole('button', { name: '원자재 추가' }));
      return within(await screen.findByRole('dialog', { name: '원자재 추가' }));
    };
    await screen.findByRole('row', { name: /모터 A/ }, { timeout: 5000 });
    const dialog = await openAdd();
    const magnet = await dialog.findByRole('option', { name: '영구자석' });
    await user.selectOptions(dialog.getAllByRole('combobox')[0], magnet);
    await dialog.findByRole('option', { name: '2공장 원자재 창고' });
    await user.selectOptions(dialog.getAllByRole('combobox')[1], '2공장 원자재 창고');
    const [safety, current] = dialog.getAllByRole('spinbutton');
    await user.clear(safety);
    await user.type(safety, '40');
    await user.clear(current);
    await user.type(current, '10');
    await user.click(dialog.getByRole('button', { name: '추가' }));

    // 부족 재고 위젯(같은 화면)과 재고 목록 2쪽(번호순 맨 끝)
    expect(await screen.findByText('영구자석', {}, { timeout: 5000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(
      await screen.findByRole('row', { name: /영구자석.*10 EA.*40 EA.*2공장 원자재 창고/ }),
    ).toBeInTheDocument();

    const again = await openAdd();
    await again.findByRole('option', { name: '절연지' });
    expect(again.queryByRole('option', { name: '영구자석' })).not.toBeInTheDocument();
  });

  it('자재 목록 조회가 실패하면 오류 창을 보인다(예전엔 빈 선택 목록만 보였다)', async () => {
    server.use(http.get(INVENTORY_ENDPOINTS.ITEM_TOGGLE, () => scenarioResponse('500')));
    renderWithProviders(<AddInventoryModal id="m" onClose={() => undefined} />);
    expect(
      await screen.findByText(/정보를 불러오는 중 오류가 발생했습니다/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
