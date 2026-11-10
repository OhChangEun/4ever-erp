import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok, okNoData } from '@/mocks/utils';
import { WAREHOUSE_ENDPOINTS } from '@/app/types/api';
import AddWarehouseModal from './AddWarehouseModal';

describe('창고 등록 모달', () => {
  // 등록 요청 계약(팀 백엔드 WarehouseCreateRequestDto)은 MATERIAL, ITEM, ETC 다.
  // 예전엔 초기값이 빈 문자열이라 화면은 첫 옵션(원자재)을 보이면서 요청에는 빈 값을 보냈다
  it.each([
    { pick: undefined, shown: '원자재', sent: 'MATERIAL' },
    { pick: '부품', shown: '부품', sent: 'ITEM' },
  ])('유형을 $shown 으로 보고 등록하면 $sent 를 보낸다', async ({ pick, shown, sent }) => {
    const bodies: unknown[] = [];
    server.use(
      http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGER_INFO, () =>
        ok([
          { managerId: 'emp-1', managerName: '이자재', managerPhone: '010', managerEmail: 'a@b.c' },
        ]),
      ),
      http.post(WAREHOUSE_ENDPOINTS.ADD_WAREHOUSE, async ({ request }) => {
        bodies.push(await request.json());
        return okNoData();
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<AddWarehouseModal id="m" onClose={() => undefined} />);
    const type = await screen.findByRole('combobox', { name: '창고 유형' });
    if (pick) await user.selectOptions(type, pick);
    expect(within(type).getByRole('option', { name: shown, selected: true })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: '창고명' }), '2공장 창고');
    await user.click(screen.getByRole('button', { name: '새 창고 추가' }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ warehouseType: sent });
  });
});
