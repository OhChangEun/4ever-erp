import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok, okNoData } from '@/mocks/utils';
import { WAREHOUSE_ENDPOINTS } from '@/app/types/api';
import { warehouseKeys } from '@/app/(private)/warehouse/warehouse.keys';
import ManageWarehouseModal from './ManageWarehouseModal';

const detail = (name: string, warehouseType = 'RAW') => ({
  warehouseInfo: {
    warehouseName: name,
    warehouseNumber: 'WH-001',
    warehouseType,
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

  // 조회 응답은 RAW 를 주지만 수정 요청 계약(팀 백엔드 WarehouseUpdateRequestDto)은 MATERIAL, ITEM, ETC 다.
  // 예전엔 RAW 와 맞는 옵션이 없어 화면은 첫 옵션(원자재)을 보이면서 요청에는 RAW 를 그대로 보냈다
  // 목록에 없는 값(PRODUCT, 예전 등록 버그가 남긴 빈 값)은 몰래 바꾸지 않고 옵션을 하나 더 둔다.
  // picks 는 저장 전에 고르는 옵션 순서다. 다른 유형을 골랐다가 서버 값으로 되돌리는 경로도 본다
  it.each([
    { served: 'RAW', picks: [], shown: '원자재', sent: 'MATERIAL' },
    { served: 'RAW_MATERIAL', picks: [], shown: '원자재', sent: 'MATERIAL' },
    { served: 'ITEM', picks: [], shown: '부품', sent: 'ITEM' },
    { served: 'PRODUCT', picks: [], shown: '완제품창고', sent: 'PRODUCT' },
    { served: '', picks: [], shown: '미지정', sent: '' },
    { served: 'PRODUCT', picks: ['부품', '완제품창고'], shown: '완제품창고', sent: 'PRODUCT' },
    { served: '', picks: ['부품', '미지정'], shown: '미지정', sent: '' },
  ] satisfies { served: string; picks: string[]; shown: string; sent: string }[])(
    '"$served" 창고를 $picks 순서로 고르고 저장하면 화면에 보인 유형("$sent")으로 보낸다',
    async ({ served, picks, shown, sent }) => {
      const bodies: unknown[] = [];
      server.use(
        http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL('wh-1'), () =>
          ok(detail('1공장 창고', served)),
        ),
        http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGER_INFO, () =>
          ok([
            {
              managerId: 'emp-1',
              managerName: '이자재',
              managerPhone: '010',
              managerEmail: 'a@b.c',
            },
          ]),
        ),
        http.put(WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGE('wh-1'), async ({ request }) => {
          bodies.push(await request.json());
          return okNoData();
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(
        <ManageWarehouseModal id="m" onClose={() => undefined} selectedWarehouseId="wh-1" />,
      );
      const type = await screen.findByRole('combobox', { name: '창고 유형' });
      for (const pick of picks) await user.selectOptions(type, pick);
      expect(within(type).getByRole('option', { name: shown, selected: true })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]).toMatchObject({ warehouseType: sent });
    },
  );
});
