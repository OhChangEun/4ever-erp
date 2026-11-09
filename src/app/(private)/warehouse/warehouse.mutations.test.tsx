import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { createTestQueryClient } from '@/test/render';
import { expectMatrix } from '@/test/mutationMatrix';
import { scenarioResponse } from '@/mocks/scenario';
import { warehouseKeys, warehouseStatsKeys } from './warehouse.keys';
import { warehouseInfoKeys } from '@/app/(private)/inventory';
import type { WarehouseListResponse } from './types/WarehouseListType';
import type { Page } from '@/app/types/Page';
import { useAddWarehouse, useEditWarehouse } from './warehouse.mutations';

const FOREIGN = ['sales', 'quotes', 'list'];
const LIST_0 = warehouseKeys.list({ page: 0, size: 10 });
const LIST_1 = warehouseKeys.list({ page: 1, size: 10 });
const WAREHOUSE_INFO = warehouseInfoKeys.list({ warehouseId: 'wh-1' });
const payload = {
  warehouseName: '새 이름',
  warehouseType: 'PRODUCT',
  location: '부산',
  managerId: 'emp-2',
  warehouseStatusCode: 'INACTIVE',
  note: '',
};

describe('창고 mutation 훅 무효화 범위', () => {
  it('창고 등록(생성, 낙관적 없음) → 목록, 통계, 재고 쪽 창고 토글', () =>
    expectMatrix({
      name: '',
      useHook: useAddWarehouse,
      variables: {
        warehouseName: '신규',
        warehouseType: 'RAW',
        location: '서울',
        managerId: 'emp-1',
        note: '',
      },
      invalidates: [LIST_0, warehouseStatsKeys.all, WAREHOUSE_INFO],
      keeps: [warehouseKeys.detail('wh-1'), FOREIGN],
    }));

  it('창고 수정 → 목록, 상세, 통계, 재고 쪽 창고 토글', () =>
    expectMatrix({
      name: '',
      useHook: useEditWarehouse,
      variables: { warehouseId: 'wh-1', payload },
      invalidates: [LIST_0, warehouseKeys.detail('wh-1'), warehouseStatsKeys.all, WAREHOUSE_INFO],
      keeps: [warehouseKeys.detail('wh-2'), FOREIGN],
    }));
});

const row = (warehouseId: string, warehouseName: string): WarehouseListResponse => ({
  warehouseId,
  warehouseNumber: warehouseId.toUpperCase(),
  warehouseName,
  statusCode: 'ACTIVE',
  warehouseType: 'RAW',
  location: '서울',
  manager: '김담당',
  managerPhone: '010-0000-0000',
});
const page: Page = { number: 0, size: 10, totalElements: 2, totalPages: 2, hasNext: true };
type ListCache = { data: WarehouseListResponse[]; pageData: Page };

describe('창고 수정 낙관적 업데이트', () => {
  const setup = () => {
    const qc = createTestQueryClient();
    qc.setQueryData<ListCache>(LIST_0, {
      data: [row('wh-1', '옛 이름'), row('wh-3', '그대로')],
      pageData: page,
    });
    qc.setQueryData<ListCache>(LIST_1, { data: [row('wh-2', '다른 페이지')], pageData: page });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return { qc, Wrapper };
  };
  const rows = (qc: QueryClient, key: readonly unknown[]) =>
    qc.getQueryData<ListCache>(key)?.data ?? [];

  it('그 창고 행의 이름, 유형, 위치, 상태만 바꾸고 행 수는 그대로다', async () => {
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useEditWarehouse(), { wrapper: Wrapper });
    act(() => result.current.mutate({ warehouseId: 'wh-1', payload }));
    await waitFor(() => expect(rows(qc, LIST_0)[0]?.warehouseName).toBe('새 이름'));
    const edited = rows(qc, LIST_0)[0];
    expect(edited).toMatchObject({
      warehouseType: 'PRODUCT',
      location: '부산',
      statusCode: 'INACTIVE',
      manager: '김담당', // 서버가 채우는 값은 안 건드린다
    });
    expect(rows(qc, LIST_0)).toHaveLength(2);
    expect(rows(qc, LIST_0)[1]?.warehouseName).toBe('그대로');
    expect(rows(qc, LIST_1)[0]?.warehouseName).toBe('다른 페이지');
  });

  it('500 이면 되돌린다', async () => {
    server.use(http.all('*', () => scenarioResponse('500')));
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useEditWarehouse(), { wrapper: Wrapper });
    act(() => result.current.mutate({ warehouseId: 'wh-1', payload }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rows(qc, LIST_0)[0]?.warehouseName).toBe('옛 이름');
    expect(rows(qc, LIST_0)[0]?.statusCode).toBe('ACTIVE');
  });
});
