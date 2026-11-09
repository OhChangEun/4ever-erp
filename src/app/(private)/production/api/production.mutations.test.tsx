import { describe, expect, it } from 'vitest';
import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { createTestQueryClient } from '@/test/render';
import { ok } from '@/mocks/utils';
import { PRODUCTION_BASE_PATH } from './production.endpoints';
import {
  bomKeys,
  mesKeys,
  mrpOrderKeys,
  mrpPlannedOrderKeys,
  productionStatsKeys,
  quotationKeys,
} from './production.keys';
import { purchaseRequestKeys, purchaseStatsKeys } from '@/app/(private)/purchase/api/purchase.keys';
import {
  PRODUCTION_MUTATION_EFFECTS,
  useCompleteMes,
  useCompleteMesOperation,
  useConfirmQuotations,
  useConvertMrpOrders,
  useCreateBom,
  useCreateStockPurchaseRequest,
  useSimulateBomConflict,
  useStartMes,
  useStartMesOperation,
  useUpdateBomStatus,
} from './production.mutations';

const HRM_EMPLOYEE_LIST: QueryKey = ['hrm', 'employees', 'list'];
const BOM_LIST = bomKeys.list({ page: 0, size: 10 });
const BOM_DETAIL = bomKeys.detail('bom-001');
const MES_LIST = mesKeys.list({ page: 0, size: 10 });
const MES_DETAIL = mesKeys.detail('mes-001');
const MRP_ORDER_LIST = mrpOrderKeys.list({ page: 0, size: 10 });
const MRP_PLANNED_LIST = mrpPlannedOrderKeys.list({ page: 0, size: 10 });
const QUOTATION_LIST = quotationKeys.list({ page: 0, size: 10 });
const STATS = productionStatsKeys.all;
const PURCHASE_REQUEST_LIST = purchaseRequestKeys.list({ page: 0, size: 10 });
const PURCHASE_STATS = purchaseStatsKeys.byRole('ALL_ADMIN');
const ALL_KEYS = [
  BOM_LIST,
  BOM_DETAIL,
  MES_LIST,
  MES_DETAIL,
  MRP_ORDER_LIST,
  MRP_PLANNED_LIST,
  QUOTATION_LIST,
  STATS,
  PURCHASE_REQUEST_LIST,
  PURCHASE_STATS,
  HRM_EMPLOYEE_LIST,
];

const seed = (qc: QueryClient) => {
  for (const key of ALL_KEYS) qc.setQueryData(key, { seeded: true });
};
const isInvalidated = (qc: QueryClient, key: QueryKey) =>
  qc.getQueryState(key)?.isInvalidated === true;
const wrapperFor = (qc: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
};
const runHook = async <TVars,>(
  qc: QueryClient,
  useHook: () => { mutateAsync: (vars: TVars) => Promise<unknown> },
  vars: TVars,
) => {
  const { result } = renderHook(useHook, { wrapper: wrapperFor(qc) });
  await result.current.mutateAsync(vars);
};

interface Case {
  name: string;
  run: (qc: QueryClient) => Promise<unknown>;
  invalidates: QueryKey[];
  keeps: QueryKey[];
}

const MES_EFFECT = [MES_DETAIL, MES_LIST, STATS];
const cases: Case[] = [
  {
    name: 'BOM 상태 변경 → 상세, 목록',
    run: (qc) =>
      runHook(qc, useUpdateBomStatus, { bomId: 'bom-001', statusCode: '비활성', version: 'v1' }),
    invalidates: [BOM_DETAIL, BOM_LIST],
    keeps: [MES_LIST, STATS, HRM_EMPLOYEE_LIST],
  },
  {
    name: 'BOM 충돌 시뮬레이션(테스트 전용) → 아무것도 안 바꿈',
    run: (qc) => runHook(qc, useSimulateBomConflict, 'bom-001'),
    invalidates: [],
    keeps: [BOM_DETAIL, BOM_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: 'BOM 생성 → 목록, 통계',
    run: (qc) => runHook(qc, useCreateBom, { productName: '모터 A', unit: 'EA', items: [] }),
    invalidates: [BOM_LIST, STATS],
    keeps: [BOM_DETAIL, MES_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: '자재 구매 요청 → 계획 주문 목록 + 구매 요청 목록, 구매 통계(의도한 도메인 교차)',
    run: (qc) => runHook(qc, useCreateStockPurchaseRequest, { items: [] }),
    invalidates: [MRP_PLANNED_LIST, PURCHASE_REQUEST_LIST, PURCHASE_STATS],
    keeps: [MRP_ORDER_LIST, BOM_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: '계획 주문 전환 → MRP 주문 목록, 계획 주문 목록',
    run: (qc) => runHook(qc, useConvertMrpOrders, { items: [] }),
    invalidates: [MRP_ORDER_LIST, MRP_PLANNED_LIST],
    keeps: [QUOTATION_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: '제안납기 확정 → 견적 목록',
    run: (qc) => runHook(qc, useConfirmQuotations, ['q-1']),
    invalidates: [QUOTATION_LIST],
    keeps: [MRP_ORDER_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: 'MES 시작 → 상세, 목록, 통계',
    run: (qc) => runHook(qc, useStartMes, 'mes-001'),
    invalidates: MES_EFFECT,
    keeps: [BOM_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: 'MES 완료 → 상세, 목록, 통계',
    run: (qc) => runHook(qc, useCompleteMes, 'mes-001'),
    invalidates: MES_EFFECT,
    keeps: [BOM_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: '공정 시작 → 상세, 목록, 통계',
    run: (qc) => runHook(qc, useStartMesOperation, { mesId: 'mes-001', operationId: 'op-1' }),
    invalidates: MES_EFFECT,
    keeps: [BOM_LIST, HRM_EMPLOYEE_LIST],
  },
  {
    name: '공정 완료 → 상세, 목록, 통계',
    run: (qc) => runHook(qc, useCompleteMesOperation, { mesId: 'mes-001', operationId: 'op-1' }),
    invalidates: MES_EFFECT,
    keeps: [BOM_LIST, HRM_EMPLOYEE_LIST],
  },
];

describe('생산 mutation 훅의 무효화 범위는 매트릭스와 같다', () => {
  it.each(cases)('$name', async ({ run, invalidates, keeps }) => {
    // BOM patch 핸들러는 version 을 비교해 409 를 낸다. 여기선 무효화 범위만 보므로 성공으로 고정한다.
    server.use(http.patch(`${PRODUCTION_BASE_PATH}/boms/:bomId`, () => ok(null)));
    const qc = createTestQueryClient();
    seed(qc);
    await run(qc);
    await waitFor(() => {
      for (const key of invalidates) expect(isInvalidated(qc, key), String(key)).toBe(true);
    });
    for (const key of keeps) expect(isInvalidated(qc, key), String(key)).toBe(false);
  });

  it('매트릭스는 훅 10개를 전부 다룬다', () => {
    expect(Object.keys(PRODUCTION_MUTATION_EFFECTS)).toHaveLength(10);
  });
});
