import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { NextRequest } from 'next/server';
import * as z from 'zod/mini';
import { serveMock } from '@/server/serverMock';
import { renderWithProviders } from '@/test/render';
import { ROLES } from '@/lib/authz/policy';
import { canProcessInvoice } from '@/app/(private)/finance/finance.service';
import { canProcessQuote } from '@/app/(private)/sales/sales.service';
import { workflowStatusSchema } from './dashboard.schemas';
import { workflowTabKey } from './dashboard.utils';
import DashboardClient from './DashboardClient';

/**
 * 남은 표시 결함 3 카드. 목이 로그인한 역할에 맞는 워크플로우 탭을 준다.
 * 기대값은 게이트웨이 DashboardServiceImpl.java:56 의 switch(역할 앞 글자) 그대로다.
 * 역할은 x-session-role 헤더로 안다. 서버 목 라우트가 프록시 증명에 든 역할로 이 헤더를 정해 어댑터에 넘긴다
 * (증명 확인과 헤더 덮어쓰기는 `src/app/api/[...slug]/route.test.ts`). 여기서는 어댑터부터 본다.
 */
const serve = async (path: string, role?: string) => {
  const request = new NextRequest(`${location.origin}/api/${path}`, {
    headers: role ? { 'x-session-role': role } : {},
  });
  const response = await serveMock(request, path.split('?')[0].split('/'));
  const body: unknown = await response.json();
  return body;
};
const tabsFor = async (role?: string) =>
  z.parse(z.object({ data: workflowStatusSchema }), await serve('dashboard/workflows', role)).data
    .tabs;
const tabCodesFor = async (role?: string) => (await tabsFor(role)).map((tab) => tab.tabCode);

describe('대시보드 워크플로우 목은 역할별 탭을 준다', () => {
  it.each([
    ['SUPPLIER_ADMIN', ['PO', 'AR']],
    ['CUSTOMER_ADMIN', ['QT', 'AP']],
    ['MM_USER', ['PO', 'SO']],
    ['MM_ADMIN', ['PO', 'SO']],
    ['SD_ADMIN', ['QT', 'SO']],
    ['FCM_ADMIN', ['AR', 'AP']],
    ['IM_ADMIN', ['IN', 'OUT']],
    ['HRM_ADMIN', ['ATT', 'LV']],
    ['PP_ADMIN', ['QT', 'MES']],
    ['ALL_ADMIN', ['AR', 'AP']],
    ['NOT_A_ROLE', ['AR', 'AP']],
    [undefined, ['AR', 'AP']],
  ])('%s → %j', async (role, expected) => {
    expect(await tabCodesFor(role)).toEqual(expected);
  });

  it.each(ROLES)('%s 의 탭 코드는 모두 메시지 표에 있다', async (role) => {
    const codes = await tabCodesFor(role);
    expect(codes).toHaveLength(2);
    expect(codes.map(workflowTabKey)).not.toContain('unknown');
  });
});

/**
 * 카드 "날짜가 지나도 같은 데모 데이터". 예전엔 id 가 `wf-AR`, 번호가 고정 글자라 실제 목록에 없었다.
 * 행은 그 역할의 화면이 부르는 목록에서, 그 화면에서 처리할 수 있는 첫 행이다(리뷰 A1, A2).
 * 화면에 처리 버튼이 없는 탭(SO, IN, ATT)은 끝나지 않은 첫 행이다. 전표는 아래 workflowFinance.test.tsx 가 실제 화면으로 본다
 */
type ListRow = Record<string, unknown>;
interface ListRule {
  path: string;
  id: string;
  number: string;
  status: string;
  open: (status: unknown) => boolean;
}
const rule = (
  path: string,
  id: string,
  number: string,
  open: (status: unknown) => boolean,
  status = 'statusCode',
): ListRule => ({ path, id, number, status, open });
const is =
  (...statuses: string[]) =>
  (status: unknown) =>
    statuses.some((wanted) => wanted === status);
const ORDERS = 'scm-pp/mm/purchase-orders';
const RULES = {
  AR: rule('business/fcm/invoice/ar', 'invoiceId', 'invoiceNumber', (status) =>
    canProcessInvoice('ar', String(status)),
  ),
  AP: rule('business/fcm/invoice/ap', 'invoiceId', 'invoiceNumber', (status) =>
    canProcessInvoice('ap', String(status)),
  ),
  // 공급사: 승인과 반려(PENDING), 배송 시작(APPROVAL). PurchaseOrderTable.tsx
  SUPPLIER_PO: rule(ORDERS, 'purchaseOrderId', 'purchaseOrderNumber', is('PENDING', 'APPROVAL')),
  // 구매팀: 처리할 수 있는 것은 구매 요청뿐이다. PurchaseRequestListTab.tsx, 게이트웨이 DashboardServiceImpl.java:124-125
  MM_PO: rule(
    'scm-pp/mm/purchase-requisitions',
    'purchaseRequisitionId',
    'purchaseRequisitionNumber',
    is('PENDING'),
  ),
  MM_SO: rule(
    ORDERS,
    'purchaseOrderId',
    'purchaseOrderNumber',
    (status) => !is('DELIVERED', 'REJECTED')(status),
  ),
  SO: rule(
    'business/sd/orders',
    'salesOrderId',
    'salesOrderNumber',
    (status) => status !== 'DELIVERED',
  ),
  QT: rule('business/sd/quotations', 'quotationId', 'quotationNumber', (status) =>
    canProcessQuote(String(status)),
  ),
  // 생산팀: 시뮬레이션과 납기 확정은 미확인 견적만. QuotationTab.tsx
  PP_QT: rule(
    'scm-pp/pp/quotations',
    'quotationId',
    'quotationNumber',
    is('UNCHECKED'),
    'availableStatus',
  ),
  IN: rule(
    'scm-pp/purchase-orders/receiving',
    'purchaseOrderId',
    'purchaseOrderNumber',
    is('PENDING'),
  ),
  OUT: rule(
    'scm-pp/sales-orders/ready-to-ship',
    'salesOrderId',
    'salesOrderNumber',
    is('READY_TO_SHIP'),
  ),
  // 출퇴근과 휴가 목록에는 번호 칸이 없어 id 를 번호로 쓴다
  ATT: rule('business/hrm/time-record', 'timerecordId', 'timerecordId', () => true),
  LV: rule(
    'business/hrm/leave-request',
    'leaveRequestId',
    'leaveRequestId',
    is('PENDING'),
    'status',
  ),
  // 대기 작업도 상세에서 시작할 수 있다(재리뷰)
  MES: rule('scm-pp/pp/mes', 'mesId', 'mesNumber', (status) => status !== 'COMPLETED', 'status'),
} as const;
const RowsBody = z.object({
  data: z.object({ content: z.array(z.record(z.string(), z.unknown())) }),
});
const listOf = async (path: string): Promise<ListRow[]> =>
  z.parse(RowsBody, await serve(`${path}?page=0&size=5000`)).data.content;
const write = (method: string, path: string) =>
  serveMock(
    new NextRequest(`${location.origin}/api/${path}`, { method }),
    path.split('?')[0].split('/'),
  );

describe('대시보드 워크플로우의 행은 그 역할이 처리할 첫 행이다', () => {
  it.each([
    ['ALL_ADMIN', ['AR', 'AP']],
    ['SUPPLIER_ADMIN', ['SUPPLIER_PO', 'AR']],
    ['CUSTOMER_ADMIN', ['QT', 'AP']],
    ['MM_ADMIN', ['MM_PO', 'MM_SO']],
    ['SD_ADMIN', ['QT', 'SO']],
    ['FCM_ADMIN', ['AR', 'AP']],
    ['IM_ADMIN', ['IN', 'OUT']],
    ['HRM_ADMIN', ['ATT', 'LV']],
    ['PP_ADMIN', ['PP_QT', 'MES']],
  ] as const)('%s: 목록에서 처리할 수 있는 첫 행의 id, 번호, 상태다', async (role, sources) => {
    const tabs = await tabsFor(role);
    for (const [i, source] of sources.entries()) {
      const { path, id, number, status, open } = RULES[source];
      const first = (await listOf(path)).find((row) => open(row[status]));
      expect(first, source).toBeDefined();
      expect(tabs[i].items, source).toEqual([
        expect.objectContaining({
          itemId: first?.[id],
          itemNumber: first?.[number],
          statusCode: first?.[status],
        }),
      ]);
      const [item] = tabs[i].items;
      expect(item.name).not.toBe('');
      expect(Number.isNaN(Date.parse(item.date)), item.date).toBe(false);
    }
  });

  it('처리한 건은 작업 현황에서 빠지고 다음 건이 온다', async () => {
    const [before] = (await tabsFor('HRM_ADMIN'))[1].items;
    await write('PATCH', `business/hrm/leave/request/${before.itemId}/release`);
    const after = (await tabsFor('HRM_ADMIN'))[1].items;
    expect(after).toHaveLength(1);
    expect(after[0].itemId).not.toBe(before.itemId);
  });

  it.each([
    ['FCM_ADMIN', 0, 'business/fcm/invoice/ar/ID/receivable/complete'],
    ['SUPPLIER_ADMIN', 1, 'business/fcm/invoice/ap/ID/payable/complete'],
  ] as const)('%s: 처리하면 미납을 건너뛰고 다음 수금 대기 전표다', async (role, tab, path) => {
    // 전표 번호 짝수는 미납, 홀수는 수금 대기라 처리 전이나 뒤 중 한 번은 미납이 맨 앞이다
    const expectFirstPending = async () => {
      const list = await listOf('business/fcm/invoice/ar');
      const first = list.find((row) => row.statusCode === 'PENDING');
      const items = (await tabsFor(role))[tab].items;
      expect(items.map((item) => item.itemId)).toEqual([first?.invoiceId]);
      return items[0];
    };
    const before = await expectFirstPending();
    await write('POST', path.replace('ID', before.itemId));
    expect((await expectFirstPending()).itemId).not.toBe(before.itemId);
  });

  it('진행 중 작업이 앞에 없어도 시작할 대기 작업이 온다(재리뷰)', async () => {
    const list = await listOf('scm-pp/pp/mes');
    const waiting = list.findIndex((row) => row.status === 'WAITING');
    expect(waiting).toBeGreaterThanOrEqual(0);
    for (const row of list.slice(0, waiting))
      if (row.status === 'IN_PROGRESS')
        await write('PUT', `scm-pp/pp/mes/${String(row.mesId)}/complete`);
    const now = await listOf('scm-pp/pp/mes');
    const first = now.find((row) => row.status !== 'COMPLETED');
    expect(first?.status).toBe('WAITING');
    expect((await tabsFor('PP_ADMIN'))[1].items[0].itemId).toBe(first?.mesId);
  });

  it('공급사는 승인할 발주가 없으면 배송을 시작할 발주가 온다', async () => {
    for (const row of await listOf(ORDERS))
      if (row.statusCode === 'PENDING')
        await write('POST', `${ORDERS}/${String(row.purchaseOrderId)}/approve`);
    const first = (await listOf(ORDERS)).find((row) => row.statusCode === 'APPROVAL');
    const items = (await tabsFor('SUPPLIER_ADMIN'))[0].items;
    expect(items.map((item) => item.itemId)).toEqual([first?.purchaseOrderId]);
  });

  it('처리할 전표가 없으면 빈 탭이다(대기 전표가 남아 있어도 사내는 처리할 수 없다)', async () => {
    const ap = 'business/fcm/invoice/ap';
    for (const row of await listOf(ap))
      if (row.statusCode === 'UNPAID')
        await write('POST', `${ap}/receivable/request?invoiceId=${String(row.invoiceId)}`);
    expect((await listOf(ap)).some((row) => row.statusCode === 'PENDING')).toBe(true);
    expect((await tabsFor('FCM_ADMIN'))[1].items).toEqual([]);
  });
});

describe('대시보드 화면', () => {
  it.each([
    { locale: 'ko', tabs: ['매출 프로세스', '매입 프로세스'], unknown: '알 수 없는 프로세스' },
    { locale: 'en', tabs: ['Receivables', 'Payables'], unknown: 'Unknown process' },
  ] as const)('$locale: 탭 두 개에 이름이 붙는다', async ({ locale, tabs, unknown }) => {
    renderWithProviders(<DashboardClient />, { locale });
    for (const name of tabs) {
      expect(await screen.findByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: unknown })).not.toBeInTheDocument();
  });
});
