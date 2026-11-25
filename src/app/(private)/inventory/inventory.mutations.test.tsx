import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { delay, http } from 'msw';
import { server } from '@/test/msw-server';
import { createTestQueryClient } from '@/test/render';
import { expectMatrix } from '@/test/mutationMatrix';
import { scenarioResponse } from '@/mocks/scenario';
import {
  inventoryKeys,
  inventoryStatsKeys,
  itemInfoKeys,
  lowStockItemKeys,
  shippingKeys,
  stockMovementKeys,
  warehouseInfoKeys,
} from './inventory.keys';
import { lowStockKeys, lowStockStatsKeys } from '@/app/(private)/low-stock/lowStock.keys';
import { purchaseRequestKeys, purchaseStatsKeys } from '@/app/(private)/purchase/api/purchase.keys';
import { salesOrderKeys } from '@/app/(private)/sales/sales.keys';
import type { InventoryDetailResponse } from './types/InventoryDetailModalType';
import type { InventoryResponse } from './types/InventoryListType';
import type { Page } from '@/app/types/Page';
import {
  useAddMaterial,
  useMarkReadyToShip,
  useMoveStock,
  useRequestPurchaseForLowStock,
  useUpdateSafetyStock,
} from './inventory.mutations';

const FOREIGN = ['hrm', 'employees', 'list'];
const LIST_0 = inventoryKeys.list({ page: 0, size: 10 });
const LIST_1 = inventoryKeys.list({ page: 1, size: 10 });
const LOW_STOCK_LIST = lowStockKeys.list({ page: 0, size: 10 });
const WAREHOUSE_INFO = warehouseInfoKeys.list({ warehouseId: 'wh-1' });

describe('재고 mutation 훅 무효화 범위', () => {
  // 안전재고 화면에서만 열린다. 그 화면이 읽는 키는 목록 하나이고 나머지 화면은 들어갈 때 다시 받는다(카드 "화면끼리 캐시")
  it('부족 재고 구매 요청 → 부족 재고 페이지 목록만', () =>
    expectMatrix({
      name: '',
      useHook: useRequestPurchaseForLowStock,
      variables: [{ productId: 'item-1001', quantity: 10 }],
      invalidates: [LOW_STOCK_LIST],
      keeps: [
        LIST_0,
        lowStockItemKeys.all,
        purchaseRequestKeys.lists(),
        purchaseStatsKeys.all,
        FOREIGN,
      ],
    }));

  it('자재 추가(생성, 낙관적 없음) → 재고 목록, 재고 통계, 자재 선택, 부족 재고 위젯', () =>
    expectMatrix({
      name: '',
      useHook: useAddMaterial,
      variables: {
        itemId: 'item-wh-015',
        safetyStock: 5,
        currentStock: 10,
        warehouseId: 'wh-003',
      },
      invalidates: [LIST_0, inventoryStatsKeys.all, itemInfoKeys.all, lowStockItemKeys.all],
      keeps: [
        inventoryKeys.detail('item-1'),
        stockMovementKeys.all,
        WAREHOUSE_INFO,
        LOW_STOCK_LIST,
        lowStockStatsKeys.all,
        FOREIGN,
      ],
    }));

  it('안전재고 수정 → 상세, 재고 목록, 부족 재고 위젯', () =>
    expectMatrix({
      name: '',
      useHook: useUpdateSafetyStock,
      variables: { itemId: 'item-1', safetyStock: 7 },
      invalidates: [inventoryKeys.detail('item-1'), LIST_0, lowStockItemKeys.all],
      keeps: [
        inventoryKeys.detail('item-2'),
        stockMovementKeys.all,
        LOW_STOCK_LIST,
        lowStockStatsKeys.all,
        FOREIGN,
      ],
    }));

  // 목의 총 재고 가치는 옮긴 수량에 따라 바뀐다(카드 "화면끼리 캐시" 별도 보고 1)
  it('재고 이동 → 상세, 재고 목록, 재고 통계, 이동 기록, 창고 토글, 부족 재고 위젯', () =>
    expectMatrix({
      name: '',
      useHook: useMoveStock,
      variables: {
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        itemId: 'item-1',
        stockQuantity: 3,
        uomName: 'EA',
        reason: '',
      },
      invalidates: [
        inventoryKeys.detail('item-1'),
        LIST_0,
        inventoryStatsKeys.all,
        stockMovementKeys.all,
        WAREHOUSE_INFO,
        lowStockItemKeys.all,
      ],
      keeps: [inventoryKeys.detail('item-2'), LOW_STOCK_LIST, lowStockStatsKeys.all, FOREIGN],
    }));
});

describe('재고 추이(시각화 2)', () => {
  it('재고 이동은 그 품목의 추이도 다시 받는다(추이 키가 상세 키 아래)', () =>
    expectMatrix({
      name: '',
      useHook: useMoveStock,
      variables: {
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        itemId: 'item-1',
        stockQuantity: 3,
        uomName: 'EA',
        reason: '',
      },
      invalidates: [inventoryKeys.history('item-1')],
      keeps: [inventoryKeys.history('item-2')],
    }));
});

describe('출하 준비', () => {
  it('출하 준비 → 출하 키 전부, 재고 통계', () =>
    expectMatrix({
      name: '',
      useHook: useMarkReadyToShip,
      variables: { orderId: 'so-1', itemIds: { itemIds: ['item-1'] } },
      invalidates: [
        shippingKeys.productionList({ page: 0, size: 10 }),
        shippingKeys.readyToShipList({ page: 0, size: 10 }),
        shippingKeys.detail('producing', 'so-1'),
        shippingKeys.detail('readyToShip', 'so-1'),
        inventoryStatsKeys.all,
      ],
      keeps: [
        LIST_0,
        salesOrderKeys.lists(),
        salesOrderKeys.detail('so-1'),
        salesOrderKeys.detail('so-2'),
        FOREIGN,
      ],
    }));
});

const detail = (overrides: Partial<InventoryDetailResponse> = {}): InventoryDetailResponse => ({
  itemId: 'item-1',
  itemNumber: 'ITM-1',
  itemName: '모터 A',
  category: 'RAW',
  supplierCompanyName: '대양상사',
  statusCode: 'NORMAL',
  currentStock: 100,
  safetyStock: 10,
  uomName: 'EA',
  unitPrice: 1000,
  totalAmount: 100000,
  warehouseId: 'wh-1',
  warehouseName: '본관',
  warehouseNumber: 'WH-1',
  location: 'A-1',
  lastModified: '2026-11-09',
  description: '',
  stockMovement: [],
  ...overrides,
});
const row = (itemId: string, safetyStock: number): InventoryResponse => ({
  itemId,
  itemNumber: itemId,
  itemName: itemId,
  category: 'RAW',
  currentStock: 100,
  forShipmentStock: 0,
  reservedStock: 0,
  safetyStock,
  uomName: 'EA',
  unitPrice: 1000,
  totalAmount: 100000,
  warehouseName: '본관',
  warehouseType: 'RAW',
  statusCode: 'NORMAL',
});
const page: Page = { number: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false };
type ListCache = { data: InventoryResponse[]; pageData: Page };

const wrapperFor = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('재고 낙관적 업데이트', () => {
  it('안전재고: 응답 전에 상세와 목록 행(같은 itemId)만 바꾸고, 500 이면 되돌린다', async () => {
    // 응답을 늦춰 낙관적 값이 보이는 순간을 확인한다
    server.use(
      http.all('*', async () => {
        await delay(200);
        return scenarioResponse('500');
      }),
    );
    const qc = createTestQueryClient();
    qc.setQueryData(inventoryKeys.detail('item-1'), detail());
    qc.setQueryData<ListCache>(LIST_0, { data: [row('item-1', 10)], pageData: page });
    qc.setQueryData<ListCache>(LIST_1, { data: [row('item-2', 20)], pageData: page });
    const { result } = renderHook(() => useUpdateSafetyStock(), { wrapper: wrapperFor(qc) });

    act(() => result.current.mutate({ itemId: 'item-1', safetyStock: 7 }));
    await waitFor(() =>
      expect(
        qc.getQueryData<InventoryDetailResponse>(inventoryKeys.detail('item-1'))?.safetyStock,
      ).toBe(7),
    );
    expect(qc.getQueryData<ListCache>(LIST_0)?.data[0]?.safetyStock).toBe(7);
    expect(qc.getQueryData<ListCache>(LIST_1)?.data[0]?.safetyStock).toBe(20);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      qc.getQueryData<InventoryDetailResponse>(inventoryKeys.detail('item-1'))?.safetyStock,
    ).toBe(10);
    expect(qc.getQueryData<ListCache>(LIST_0)?.data[0]?.safetyStock).toBe(10);
  });

  it('재고 이동: 출발 창고 상세의 현재고를 이동 수량만큼 줄인다', async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(
      inventoryKeys.detail('item-1'),
      detail({ currentStock: 100, warehouseId: 'wh-1' }),
    );
    const { result } = renderHook(() => useMoveStock(), { wrapper: wrapperFor(qc) });
    act(() =>
      result.current.mutate({
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        itemId: 'item-1',
        stockQuantity: 30,
        uomName: 'EA',
        reason: '',
      }),
    );
    await waitFor(() =>
      expect(
        qc.getQueryData<InventoryDetailResponse>(inventoryKeys.detail('item-1'))?.currentStock,
      ).toBe(70),
    );
  });

  it('재고 이동: 상세의 창고가 출발 창고가 아니면 건드리지 않는다', async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(
      inventoryKeys.detail('item-1'),
      detail({ currentStock: 100, warehouseId: 'wh-9' }),
    );
    const { result } = renderHook(() => useMoveStock(), { wrapper: wrapperFor(qc) });
    act(() =>
      result.current.mutate({
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        itemId: 'item-1',
        stockQuantity: 30,
        uomName: 'EA',
        reason: '',
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 낙관적 단계에서 안 바뀌었고, 끝난 뒤엔 무효화만 됐다
    expect(qc.getQueryState(inventoryKeys.detail('item-1'))?.isInvalidated).toBe(true);
  });
});
