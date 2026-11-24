import { http } from 'msw';
import { DASHBOARD_ENDPOINTS } from '@/app/types/api';
import type { InvoiceAction } from '@/app/(private)/finance/finance.mutations';
import { canProcessInvoice } from '@/app/(private)/finance/finance.service';
import { canProcessQuote } from '@/app/(private)/sales/sales.service';
import type { DashboardWorkflowRes } from '@/app/(private)/dashboard/types/DashboardWorkflowType';
import { HEADCOUNT, attendanceDays } from './attendanceSummary.handlers';
import { apRowsOf, arRowsOf } from './finance.handlers';
import { monthlyMetric } from './financeAnalytics.handlers';
import { leavesOf, timeRecordsOf } from './hrm.handlers';
import { readyRows, receivingRowsOf } from './inventory.handlers';
import { mesListOf, productionQuotesOf } from './production.handlers';
import { purchaseOrdersOf, requisitionsOf } from './purchase.handlers';
import { ordersOf, quotesOf } from './sales.handlers';
import { ok, error, shouldError, level, statResponse } from './utils';

/**
 * 역할 앞 글자(MM_ADMIN 의 MM)별 워크플로우 탭 코드. 게이트웨이 DashboardServiceImpl.java:56 의 switch 와 같은 코드, 같은 순서다
 * (SUPPLIER :57, CUSTOMER :81, MM :105, SD :135, FCM :159, IM :172, HRM :196, PP :220).
 */
const WORKFLOW_TABS: Partial<Record<string, readonly [string, string]>> = {
  SUPPLIER: ['PO', 'AR'],
  CUSTOMER: ['QT', 'AP'],
  MM: ['PO', 'SO'],
  SD: ['QT', 'SO'],
  FCM: ['AR', 'AP'],
  IM: ['IN', 'OUT'],
  HRM: ['ATT', 'LV'],
  PP: ['QT', 'MES'],
};
// 게이트웨이 default(:244). ALL_ADMIN 과 모르는 역할은 재무와 같은 전표 탭
const DEFAULT_WORKFLOW_TABS = ['AR', 'AP'] as const;

/**
 * 역할은 프록시가 서버 목으로 넘길 때 세션에서 붙이는 x-session-role 헤더로 안다(src/app/api/proxy/[...path]/route.ts).
 * 브라우저 MSW(워커)와 단위 테스트는 헤더가 없어 기본 탭을 받는다.
 */
const roleOf = (request: Request) => request.headers.get('x-session-role')?.split('_')[0] ?? '';

type WorkflowItem = DashboardWorkflowRes['tabs'][number]['items'][number];
type Source = (request: Request) => WorkflowItem | undefined;

/** 목록에서 고른 행 하나를 작업 현황 행으로. date 는 마감 시각(게이트웨이 DashboardWorkflowItemDto.java) */
const item = (
  itemTitle: string,
  itemId: string,
  itemNumber: string,
  name: string,
  statusCode: string,
  day: string,
): WorkflowItem => ({
  itemId,
  itemTitle,
  itemNumber,
  name,
  statusCode,
  date: `${day}T00:00:00`,
});

/** 전표는 재무 화면의 처리 버튼과 같은 조건(`canProcessInvoice`)으로 고른다 */
const invoiceItem = (
  title: string,
  rows: ReturnType<typeof arRowsOf>,
  action: InvoiceAction,
): WorkflowItem | undefined => {
  const row = rows.find(({ statusCode }) => canProcessInvoice(action, statusCode));
  return (
    row &&
    item(
      title,
      row.invoiceId,
      row.invoiceNumber,
      row.connection.connectionName,
      row.statusCode,
      row.dueDate,
    )
  );
};
const purchaseOrderItem = (request: Request, title: string, statuses: string[]) => {
  const row = purchaseOrdersOf(request).find(({ statusCode }) => statuses.includes(statusCode));
  return (
    row &&
    item(
      title,
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.supplierName,
      row.statusCode,
      row.dueDate,
    )
  );
};

/**
 * 탭마다 그 로그인의 실제 목록에서 그 역할이 화면에서 처리할 수 있는 첫 행 하나(카드 "날짜가 지나도 같은 데모 데이터",
 * 리뷰 A1, A2). 처리할 행이 없으면 빈 탭. 화면에 처리 버튼이 없는 탭(SO, IN, ATT)은 끝나지 않은 첫 행이다.
 * 전표는 공급사와 고객사도 자기 재무 화면이 부르는 목록(공급사 매출 = /invoice/ar, 고객사 매입 = /invoice/ap)에서 고른다.
 * 출퇴근과 휴가 목록에는 번호 칸이 없어 id 를 번호로 쓴다. 이름과 번호 칸에 무엇이 오는지는 verified=false
 */
const WORKFLOW_SOURCES: Partial<Record<string, Source>> = {
  // 발주를 처리하는 것은 공급사다(승인과 반려, 배송 시작)
  PO: (request) => purchaseOrderItem(request, '발주서 처리', ['PENDING', 'APPROVAL']),
  SO: (request) => {
    const row = ordersOf(request).find(({ statusCode }) => statusCode !== 'DELIVERED');
    return (
      row &&
      item(
        '주문서 확인',
        row.salesOrderId,
        row.salesOrderNumber,
        row.manager.managerName,
        row.statusCode,
        row.dueDate,
      )
    );
  },
  QT: (request) => {
    const row = quotesOf(request).find(({ statusCode }) => canProcessQuote(statusCode));
    return (
      row &&
      item(
        '견적서 검토',
        row.quotationId,
        row.quotationNumber,
        row.managerName,
        row.statusCode,
        row.dueDate,
      )
    );
  },
  AR: (request) => invoiceItem('매출 전표 확인', arRowsOf(request), 'ar'),
  AP: (request) => invoiceItem('매입 전표 확인', apRowsOf(request), 'ap'),
  IN: (request) => {
    const row = receivingRowsOf(request, 'DELIVERING').at(0);
    return (
      row &&
      item(
        '입고 대기',
        row.purchaseOrderId,
        row.purchaseOrderNumber,
        row.supplierCompanyName,
        row.statusCode,
        row.dueDate,
      )
    );
  },
  OUT: (request) => {
    const row = readyRows(request).at(0);
    return (
      row &&
      item(
        '출고 준비',
        row.salesOrderId,
        row.salesOrderNumber,
        row.customerName,
        row.statusCode,
        row.dueDate,
      )
    );
  },
  ATT: (request) => {
    // 출퇴근 목록의 기본 날(마지막 근무일)
    const date = attendanceDays().days.at(-1)?.date ?? '';
    const row = timeRecordsOf(request, date).at(0);
    return (
      row &&
      item(
        '출퇴근 기록 확인',
        row.timerecordId,
        row.timerecordId,
        row.employee.employeeName,
        row.statusCode,
        row.workDate,
      )
    );
  },
  LV: (request) => {
    const row = leavesOf(request).find(({ status }) => status === 'PENDING');
    return (
      row &&
      item(
        '휴가 신청',
        row.leaveRequestId,
        row.leaveRequestId,
        row.employee.employeeName,
        row.status,
        row.startDate,
      )
    );
  },
  MES: (request) => {
    // 대기 작업은 시작, 진행 중 작업은 공정을 처리할 수 있다(ProcessDetailModal)
    const row = mesListOf(request).find(({ status }) => status !== 'COMPLETED');
    return (
      row &&
      item('생산 작업 진행', row.mesId, row.mesNumber, row.productName, row.status, row.endDate)
    );
  },
};
/** 같은 탭 코드라도 역할마다 화면이나 처리 동작이 다른 것 */
const ROLE_SOURCES: Partial<Record<string, Source>> = {
  'SUPPLIER:AR': (request) => invoiceItem('매출 전표 확인', arRowsOf(request), 'supplierAp'),
  // 게이트웨이는 MM 의 PO 에 구매 요청, SO 에 발주를 넣는다(DashboardServiceImpl.java:124-129). 구매팀이 처리하는 것도 구매 요청이다
  'MM:PO': (request) => {
    const row = requisitionsOf(request).find(({ statusCode }) => statusCode === 'PENDING');
    return (
      row &&
      item(
        '구매 요청 승인 대기',
        row.purchaseRequisitionId,
        row.purchaseRequisitionNumber,
        row.requesterName,
        row.statusCode,
        row.requestDate,
      )
    );
  },
  'MM:SO': (request) =>
    purchaseOrderItem(request, '발주서 확인', ['PENDING', 'APPROVAL', 'DELIVERING']),
  // 생산팀은 미확인 견적만 시뮬레이션하고 납기를 확정한다
  'PP:QT': (request) => {
    const row = productionQuotesOf(request).find(
      ({ availableStatus }) => availableStatus === 'UNCHECKED',
    );
    return (
      row &&
      item(
        '견적서 검토',
        row.quotationId,
        row.quotationNumber,
        row.customerName,
        row.availableStatus,
        row.dueDate,
      )
    );
  },
};

const workflowTab = (request: Request, role: string, tabCode: string) => {
  const source = ROLE_SOURCES[`${role}:${tabCode}`] ?? WORKFLOW_SOURCES[tabCode];
  const found = source?.(request);
  return { tabCode, items: found ? [found] : [] };
};

export const dashboardHandlers = [
  http.get(DASHBOARD_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load dashboard stats', 500);
    // 금액은 재무 월별 손익(재무 화면과 같은 값), 직원 수는 근태 집계의 인원
    return ok(
      statResponse({
        total_sales: monthlyMetric('sales'),
        total_purchases: monthlyMetric('purchases'),
        net_profit: monthlyMetric('netProfit'),
        total_employees: level(HEADCOUNT),
      }),
    );
  }),
  http.get(DASHBOARD_ENDPOINTS.WORKFLOW_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load workflow status', 500);
    const role = roleOf(request);
    const codes = WORKFLOW_TABS[role] ?? DEFAULT_WORKFLOW_TABS;
    return ok({ tabs: codes.map((tabCode) => workflowTab(request, role, tabCode)) });
  }),
];
