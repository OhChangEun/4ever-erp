import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok } from '@/mocks/utils';
import { WAREHOUSE_ENDPOINTS } from '@/app/types/api';
import { warehouseKeys } from '@/app/(private)/warehouse/warehouse.keys';
import ManageWarehouseModal from './ManageWarehouseModal';

const detail = (name: string) => ({
  warehouseInfo: {
    warehouseName: name,
    warehouseNumber: 'WH-001',
    warehouseType: 'RAW',
    statusCode: 'ACTIVE',
    location: '서울',
    description: '',
  },
  manager: {
    managerId: 'emp-1',
    managerName: '이자재',
    managerPhoneNumber: '010-2222-3333',
    managerEmail: 'a@b.c',
  },
});

describe('창고 수정 모달', () => {
  it('재조회가 다른 값을 줘도 입력 중인 값이 덮이지 않는다', async () => {
    let serverName = '1공장 창고';
    server.use(
      http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL('wh-1'), () => ok(detail(serverName))),
      http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGER_INFO, () =>
        ok([
          { managerId: 'emp-1', managerName: '이자재', managerPhone: '010', managerEmail: 'a@b.c' },
        ]),
      ),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <ManageWarehouseModal id="m" onClose={() => undefined} selectedWarehouseId="wh-1" />,
    );
    const name = await screen.findByDisplayValue('1공장 창고', {}, { timeout: 5000 });
    await user.clear(name);
    await user.type(name, '입력 중');

    serverName = '다른 사용자가 바꾼 이름';
    await queryClient.invalidateQueries({ queryKey: warehouseKeys.detail('wh-1') });
    await waitFor(() =>
      expect(queryClient.getQueryState(warehouseKeys.detail('wh-1'))?.isInvalidated).toBe(false),
    );
    // 재조회 결과가 그려지고 effect 가 돌 시간을 준다. 예전 코드는 여기서 입력을 서버 값으로 덮었다
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByDisplayValue('다른 사용자가 바꾼 이름')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('입력 중')).toBeInTheDocument();
  });
});
