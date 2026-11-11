import { describe, expect, it } from 'vitest';
import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { createTestQueryClient } from '@/test/render';
import { ok } from '@/mocks/utils';
import { PURCHASE_BASE_PATH } from './purchase.endpoints';
import type { CreatePurchaseRequestBody } from '../types/PurchaseRequestType';
import type { CreateSupplierBody, UpdateSupplierBody } from '../types/SupplierType';
import {
  purchaseOrderKeys,
  purchaseRequestKeys,
  purchaseStatsKeys,
  supplierKeys,
} from './purchase.keys';
import {
  PURCHASE_MUTATION_EFFECTS,
  useApprovePurchaseOrder,
  useApprovePurchaseRequest,
  useCreatePurchaseRequest,
  useCreateSupplier,
  useRejectPurchaseOrder,
  useRejectPurchaseRequest,
  useStartPurchaseOrderDelivery,
  useUpdateSupplier,
} from './purchase.mutations';

// 다른 도메인 키. 구매 mutation 이 여기를 건드리면 10월에 잡은 "재고가 인사 목록 무효화" 버그의 재발이다.
const SALES_ORDER_LIST: QueryKey = ['sales', 'orders', 'list'];

const createRequestBody: CreatePurchaseRequestBody = { items: [] };
const createSupplierBody: CreateSupplierBody = {
  supplierInfo: {
    supplierName: '대양상사',
    supplierEmail: 'a@b.c',
    supplierPhone: '02-000-0000',
    supplierBaseAddress: '서울',
    category: 'RAW',
    deliveryLeadTime: 3,
  },
  managerInfo: { managerName: '김담당', managerPhone: '010-0000-0000', managerEmail: 'm@b.c' },
  materialList: [],
};
const updateSupplierBody: UpdateSupplierBody = {
  supplierName: '대양상사',
  supplierEmail: 'a@b.c',
  supplierPhone: '02-000-0000',
  supplierBaseAddress: '서울',
  supplierDetailAddress: '',
  category: 'RAW',
  statusCode: 'ACTIVE',
  deliverLeadTime: 3,
  managerName: '김담당',
  managerPhone: '010-0000-0000',
  managerEmail: 'm@b.c',
};

const ORDER_LIST = purchaseOrderKeys.list({ page: 0, size: 10 });
const ORDER_DETAIL = purchaseOrderKeys.detail('po-001');
const REQUEST_LIST = purchaseRequestKeys.list({ page: 0, size: 10 });
const REQUEST_DETAIL = purchaseRequestKeys.detail('pr-001');
const SUPPLIER_LIST = supplierKeys.list({ page: 0, size: 10 });
const SUPPLIER_DETAIL = supplierKeys.detail('sup-001');
const STATS = purchaseStatsKeys.byRole('ALL_ADMIN');
const ALL_KEYS = [
  ORDER_LIST,
  ORDER_DETAIL,
  REQUEST_LIST,
  REQUEST_DETAIL,
  SUPPLIER_LIST,
  SUPPLIER_DETAIL,
  STATS,
  SALES_ORDER_LIST,
];

const seed = (queryClient: QueryClient) => {
  for (const key of ALL_KEYS) queryClient.setQueryData(key, { seeded: true });
};
const isInvalidated = (queryClient: QueryClient, key: QueryKey) =>
  queryClient.getQueryState(key)?.isInvalidated === true;

const wrapperFor = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

interface Case {
  name: string;
  run: (queryClient: QueryClient) => Promise<unknown>;
  invalidates: QueryKey[];
  keeps: QueryKey[];
}

const runHook = async <TVars,>(
  queryClient: QueryClient,
  useHook: () => { mutateAsync: (vars: TVars) => Promise<unknown> },
  vars: TVars,
) => {
  const { result } = renderHook(useHook, { wrapper: wrapperFor(queryClient) });
  await result.current.mutateAsync(vars);
};

const cases: Case[] = [
  {
    name: '발주 승인',
    run: (qc) => runHook(qc, useApprovePurchaseOrder, 'po-001'),
    invalidates: [ORDER_LIST, ORDER_DETAIL, STATS],
    keeps: [REQUEST_LIST, SUPPLIER_LIST, SALES_ORDER_LIST],
  },
  {
    name: '발주 반려',
    run: (qc) => runHook(qc, useRejectPurchaseOrder, { purchaseOrderId: 'po-001', reason: '' }),
    invalidates: [ORDER_LIST, ORDER_DETAIL, STATS],
    keeps: [REQUEST_LIST, SUPPLIER_LIST, SALES_ORDER_LIST],
  },
  {
    name: '배송 시작',
    run: (qc) => runHook(qc, useStartPurchaseOrderDelivery, 'po-001'),
    invalidates: [ORDER_LIST, ORDER_DETAIL, STATS],
    keeps: [REQUEST_LIST, SUPPLIER_LIST, SALES_ORDER_LIST],
  },
  {
    name: '구매 요청 승인 (발주가 생길 수 있어 발주 목록도)',
    run: (qc) => runHook(qc, useApprovePurchaseRequest, 'pr-001'),
    invalidates: [REQUEST_LIST, REQUEST_DETAIL, ORDER_LIST, STATS],
    keeps: [SUPPLIER_LIST, SALES_ORDER_LIST],
  },
  {
    name: '구매 요청 반려',
    run: (qc) =>
      runHook(qc, useRejectPurchaseRequest, { purchaseRequestId: 'pr-001', comment: '' }),
    invalidates: [REQUEST_LIST, REQUEST_DETAIL, STATS],
    keeps: [ORDER_LIST, SUPPLIER_LIST, SALES_ORDER_LIST],
  },
  {
    name: '구매 요청 생성',
    run: (qc) => runHook(qc, useCreatePurchaseRequest, createRequestBody),
    invalidates: [REQUEST_LIST, STATS],
    keeps: [ORDER_LIST, SUPPLIER_LIST, SALES_ORDER_LIST],
  },
  {
    name: '공급사 등록',
    run: (qc) => runHook(qc, useCreateSupplier, createSupplierBody),
    invalidates: [SUPPLIER_LIST],
    keeps: [ORDER_LIST, REQUEST_LIST, STATS, SALES_ORDER_LIST],
  },
  {
    name: '공급사 수정',
    run: (qc) =>
      runHook(qc, useUpdateSupplier, { supplierId: 'sup-001', body: updateSupplierBody }),
    invalidates: [SUPPLIER_LIST, SUPPLIER_DETAIL],
    keeps: [ORDER_LIST, REQUEST_LIST, STATS, SALES_ORDER_LIST],
  },
];

describe('구매 mutation 훅의 무효화 범위는 매트릭스와 같다', () => {
  it.each(cases)('$name', async ({ run, invalidates, keeps }) => {
    const queryClient = createTestQueryClient();
    seed(queryClient);
    await run(queryClient);
    await waitFor(() => {
      for (const key of invalidates)
        expect(isInvalidated(queryClient, key), String(key)).toBe(true);
    });
    for (const key of keeps) expect(isInvalidated(queryClient, key), String(key)).toBe(false);
  });

  it('매트릭스는 훅 8개를 전부 다룬다', () => {
    expect(Object.keys(PURCHASE_MUTATION_EFFECTS).sort()).toEqual(
      [
        'approveOrder',
        'approveRequest',
        'createRequest',
        'createSupplier',
        'rejectOrder',
        'rejectRequest',
        'startDelivery',
        'updateSupplier',
      ].sort(),
    );
  });
});

describe('발주 반려 URL', () => {
  it('경로가 /purchase-orders/:id/reject 로 끝난다 (쉼표 없음)', async () => {
    let seen = '';
    server.use(
      http.post(
        new RegExp(`${PURCHASE_BASE_PATH}/purchase-orders/po-001/reject`),
        ({ request }) => {
          seen = new URL(request.url).pathname;
          return ok(null);
        },
      ),
    );
    const queryClient = createTestQueryClient();
    await runHook(queryClient, useRejectPurchaseOrder, { purchaseOrderId: 'po-001', reason: '' });
    expect(seen).toMatch(/\/purchase-orders\/po-001\/reject$/);
  });
});

describe('발주 반려 본문', () => {
  // 게이트웨이 PurchaseOrderRejectRequestDto 의 필드는 reason 하나다. body 로 보내면 사유가 null 로 들어간다
  it('반려 사유를 reason 으로 보낸다', async () => {
    let sent: unknown;
    server.use(
      http.post(
        new RegExp(`${PURCHASE_BASE_PATH}/purchase-orders/po-001/reject$`),
        async ({ request }) => {
          sent = await request.json();
          return ok(null);
        },
      ),
    );
    const queryClient = createTestQueryClient();
    await runHook(queryClient, useRejectPurchaseOrder, {
      purchaseOrderId: 'po-001',
      reason: '단가 오류',
    });
    expect(sent).toEqual({ reason: '단가 오류' });
  });

  it('목 서버는 예전 필드 이름(body)을 400 으로 막는다', async () => {
    const response = await fetch(`${PURCHASE_BASE_PATH}/purchase-orders/po-001/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '단가 오류' }),
    });
    expect(response.status).toBe(400);
  });
});
