import { describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { useQueries, type QueryKey } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import ko from '@/i18n/messages/ko.json';
import RouteProviders from './_RouteProviders';
import {
  inventoryStatsKeys,
  lowStockItemKeys,
  receivingKeys,
  shippingKeys,
} from './inventory/inventory.keys';
import { lowStockKeys, lowStockStatsKeys } from './low-stock/lowStock.keys';
import { purchaseRequestKeys, purchaseStatsKeys } from './purchase/api/purchase.keys';
import { salesOrderKeys } from './sales/sales.keys';
import { attendanceKeys, leaveKeys, trainingKeys } from './hrm/api/hrm.keys';
import { useStartPurchaseOrderDelivery } from './purchase/api/purchase.mutations';
import { useProcessDelivery } from './sales/sales.mutations';
import { useCreateStockPurchaseRequest } from './production/api/production.mutations';
import {
  useAddMaterial,
  useMarkReadyToShip,
  useMoveStock,
  useRequestPurchaseForLowStock,
  useUpdateSafetyStock,
} from './inventory/inventory.mutations';
import {
  useCheckIn,
  useCheckOut,
  useRegisterTraining,
  useRequestVacation,
} from '@/app/(public)/profile/profile.mutations';

/**
 * 카드 "화면끼리 캐시". 도메인 레이아웃마다 앱의 실제 Provider(`_RouteProviders`)가 QueryClient 를 새로 만든다.
 * 그래서 다른 도메인에서 쓴 뒤 들어가면 무효화 없이도 다시 받는다. 예전에는 클라이언트 하나에 두 도메인 키를 심고
 * 교차 무효화를 봤는데 앱에서는 일어나지 않는 일이었다. 같은 쓰기 12개, 23칸을 앱처럼 도메인마다 Provider 를 따로 두고 본다.
 */
const Layout = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="ko" timeZone="Asia/Seoul" messages={ko}>
    <RouteProviders>{children}</RouteProviders>
  </NextIntlClientProvider>
);

/** 도메인 화면을 한 번 열었다 나간다. 그 화면이 읽는 키를 실제로 요청한 횟수가 `fetched` 에 쌓인다 */
const visit = async (keys: readonly QueryKey[], fetched: (key: QueryKey) => void) => {
  const Screen = () => {
    const results = useQueries({
      queries: keys.map((queryKey) => ({
        queryKey,
        queryFn: () => {
          fetched(queryKey);
          return true;
        },
      })),
    });
    return results.every((result) => result.isSuccess) ? <p>받음</p> : null;
  };
  const view = render(<Screen />, { wrapper: Layout });
  expect(await view.findByText('받음')).toBeInTheDocument();
  view.unmount();
};

const write = async <TVariables,>(
  useHook: () => { mutateAsync: (variables: TVariables) => Promise<unknown> },
  variables: TVariables,
) => {
  const { result, unmount } = renderHook(useHook, { wrapper: Layout });
  await act(() => result.current.mutateAsync(variables));
  unmount();
};

const LOW_STOCK = [lowStockKeys.list({ page: 0, size: 10 }), lowStockStatsKeys.all];
const PURCHASE = [purchaseRequestKeys.list({ page: 0, size: 10 }), purchaseStatsKeys.all];
const ATTENDANCE = [
  attendanceKeys.list({ page: 0, size: 10, date: '2026-11-09' }),
  attendanceKeys.summary(),
];

const CASES: { name: string; run: () => Promise<void>; destination: QueryKey[] }[] = [
  {
    name: '발주 배송 시작 → 재고',
    run: () => write(() => useStartPurchaseOrderDelivery(), 'po-001'),
    destination: [receivingKeys.pendingList({ page: 0, size: 10 }), inventoryStatsKeys.all],
  },
  {
    name: '즉시 납품 → 재고',
    run: () => write(() => useProcessDelivery(), 'qt-016'),
    destination: [shippingKeys.readyToShipList({ page: 0, size: 10 }), inventoryStatsKeys.all],
  },
  {
    name: '출하 준비 → 영업',
    run: () =>
      write(() => useMarkReadyToShip(), { orderId: 'so-1', itemIds: { itemIds: ['item-1'] } }),
    destination: [salesOrderKeys.lists(), salesOrderKeys.detail('so-1')],
  },
  {
    name: '안전재고 구매 요청 → 재고, 구매',
    run: () =>
      write(() => useRequestPurchaseForLowStock(), [{ productId: 'item-1001', quantity: 10 }]),
    destination: [lowStockItemKeys.all, ...PURCHASE],
  },
  {
    name: '자재 추가 → 안전재고',
    run: () =>
      write(() => useAddMaterial(), {
        itemId: 'item-wh-015',
        safetyStock: 5,
        currentStock: 10,
        warehouseId: 'wh-003',
      }),
    destination: LOW_STOCK,
  },
  {
    name: '안전재고 수정 → 안전재고',
    run: () => write(() => useUpdateSafetyStock(), { itemId: 'item-1001', safetyStock: 7 }),
    destination: LOW_STOCK,
  },
  {
    name: '재고 이동 → 안전재고',
    run: () =>
      write(() => useMoveStock(), {
        fromWarehouseId: 'wh-001',
        toWarehouseId: 'wh-002',
        itemId: 'item-1001',
        stockQuantity: 3,
        uomName: 'EA',
        reason: '',
      }),
    destination: LOW_STOCK,
  },
  {
    name: '자재 구매 요청 → 구매',
    run: () => write(() => useCreateStockPurchaseRequest(), { items: [] }),
    destination: PURCHASE,
  },
  {
    name: '휴가 신청 → 인사',
    run: () =>
      write(() => useRequestVacation(), {
        leaveType: 'ANNUAL',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
      }),
    destination: [leaveKeys.list({ page: 0, size: 10 })],
  },
  { name: '출근 → 인사', run: () => write(() => useCheckIn(), undefined), destination: ATTENDANCE },
  {
    name: '퇴근 → 인사',
    run: () => write(() => useCheckOut(), undefined),
    destination: ATTENDANCE,
  },
  {
    name: '교육 신청 → 인사',
    run: () => write(() => useRegisterTraining(), 'tr-1'),
    destination: [trainingKeys.list({ page: 0, size: 10 })],
  },
];

describe('다른 도메인에서 쓰고 30초 안에 들어가도 그 화면을 다시 받는다', () => {
  it.each(CASES)('$name', async ({ run, destination }) => {
    const fetched = vi.fn<(key: QueryKey) => void>();
    await visit(destination, fetched);
    await run();
    await visit(destination, fetched);
    for (const key of destination) {
      expect(
        fetched.mock.calls.filter(([seen]) => seen === key),
        String(key),
      ).toHaveLength(2);
    }
  });

  it('옮긴 23칸을 전부 본다', () => {
    expect(CASES).toHaveLength(12);
    expect(CASES.flatMap(({ destination }) => destination)).toHaveLength(23);
  });
});
