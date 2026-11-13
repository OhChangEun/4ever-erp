import { http } from 'msw';
import { FINANCE_BASE_PATH, FINANCE_ENDPOINTS } from '@/app/types/api';
import { mockState } from '../state';
import { BEARING, MOTOR, line } from './catalog';
import { monthlyMetric } from './financeAnalytics.handlers';
import { PURCHASE_ORDER_LINES } from './purchase.handlers';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  pathSegment,
  makePage,
  flow,
  statResponse,
} from './utils';

/**
 * 재무 목이 기억하는 전표 상태(로그인별, `src/mocks/state.ts`).
 * 서버 응답이 Object 라 값은 화면이 비교하는 것에 맞췄다(verified=false, InvoiceList.tsx:130).
 * 매입 전표는 사내가 처리 요청하면 UNPAID → PENDING, 공급사가 완료하면 PAID. 매출 전표는 수금 완료 뒤 PAID.
 */
const invoiceStatus = mockState(() => new Map<string, string>());

/** 전표 총액. 고객사와 공급사 통계의 주 값이 이 금액이다 */
const AP_TOTAL = 4200000;
const AR_TOTAL = 8200000;
/** 매출 전표의 품목 줄. 단가는 품목표 값이고 합이 총액이다 */
const AR_LINES = [line(MOTOR, 550), line(BEARING, 200)];

export const financeHandlers = [
  http.get(FINANCE_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load finance stats', 500);
    // 재무 월별 손익(재무 현황 그래프)과 같은 값
    return ok(
      statResponse({
        total_purchases: monthlyMetric('purchases'),
        net_profit: monthlyMetric('netProfit'),
        total_sales: monthlyMetric('sales'),
      }),
    );
  }),
  http.get(FINANCE_ENDPOINTS.CUSTOMER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customer stats', 500);
    // 고객사의 총 구매액은 그 고객의 매출 전표 금액
    return ok(statResponse({ total_amount: flow(AR_TOTAL) }));
  }),
  http.get(FINANCE_ENDPOINTS.SUPPLIER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier stats', 500);
    // 공급사의 총 매출액은 그 공급사의 매입 전표 금액
    return ok(statResponse({ total_amount: flow(AP_TOTAL) }));
  }),
  http.get(FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase invoices', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          invoiceId: 'inv-ap-001',
          invoiceNumber: 'AP-2026-001',
          connection: {
            connectionId: 'sup-001',
            connectionCode: 'SUP-001',
            connectionName: '대양상사',
          },
          totalAmount: AP_TOTAL,
          issueDate: '2026-01-15',
          dueDate: '2026-02-15',
          statusCode: invoiceStatus(request).get('inv-ap-001') ?? 'UNPAID',
          referenceNumber: 'REF-AP-001',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get<{
    invoiceId: string;
  }>(`${FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST}/:invoiceId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load purchase invoice detail', 500);
    // 매입 전표 목록은 inv-ap-001 한 행이다(카드 "없는 건은 404")
    if (params.invoiceId !== 'inv-ap-001') return notFound('AP 전표 상세 조회');
    return ok({
      invoiceId: params.invoiceId,
      invoiceNumber: 'AP-2026-001',
      invoiceType: 'AP',
      statusCode: invoiceStatus(request).get(params.invoiceId) ?? 'UNPAID',
      issueDate: '2026-01-15',
      dueDate: '2026-02-15',
      name: '대양상사',
      referenceNumber: 'REF-AP-001',
      totalAmount: AP_TOTAL,
      note: '납기 준수 요청',
      // 같은 거래의 발주(PO-2026-001)와 같은 품목
      items: PURCHASE_ORDER_LINES.map(({ uomName, ...item }) => ({
        ...item,
        unitOfMaterialName: uomName,
      })),
    });
  }),
  http.post(new RegExp(`${FINANCE_BASE_PATH}/invoice/ap/receivable/request`), ({ request }) => {
    if (shouldError(request)) return error('Failed to request AP', 500);
    const invoiceId = new URL(request.url).searchParams.get('invoiceId');
    if (invoiceId) invoiceStatus(request).set(invoiceId, 'PENDING');
    return okNoData();
  }),
  http.post(new RegExp(`${FINANCE_BASE_PATH}/invoice/ar/.+/receivable/complete`), ({ request }) => {
    if (shouldError(request)) return error('Failed to complete AR', 500);
    // 주소가 .../invoice/ar/{id}/receivable/complete 라 id 는 뒤에서 셋째 조각
    invoiceStatus(request).set(pathSegment(request, 3), 'PAID');
    return okNoData();
  }),
  http.post(new RegExp(`${FINANCE_BASE_PATH}/invoice/ap/.+/payable/complete`), ({ request }) => {
    if (shouldError(request)) return error('Failed to complete supplier AP', 500);
    invoiceStatus(request).set(pathSegment(request, 3), 'PAID');
    return okNoData();
  }),
  http.get(FINANCE_ENDPOINTS.SALES_INVOICES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load sales invoices', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          invoiceId: 'inv-ar-001',
          invoiceNumber: 'AR-2026-001',
          connection: {
            connectionId: 'cus-001',
            connectionCode: 'CUS-001',
            connectionName: '한빛전자',
          },
          totalAmount: AR_TOTAL,
          issueDate: '2026-01-20',
          dueDate: '2026-02-20',
          statusCode: invoiceStatus(request).get('inv-ar-001') ?? 'PENDING',
          referenceNumber: 'REF-AR-001',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get<{
    invoiceId: string;
  }>(`${FINANCE_ENDPOINTS.SALES_INVOICES_LIST}/:invoiceId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load sales invoice detail', 500);
    // 매출 전표 목록은 inv-ar-001 한 행이다
    if (params.invoiceId !== 'inv-ar-001') return notFound('AR 전표 상세 조회');
    return ok({
      invoiceId: params.invoiceId,
      invoiceNumber: 'AR-2026-001',
      invoiceType: 'AR',
      statusCode: invoiceStatus(request).get(params.invoiceId) ?? 'PENDING',
      issueDate: '2026-01-20',
      dueDate: '2026-02-20',
      name: '한빛전자',
      referenceNumber: 'REF-AR-001',
      totalAmount: AR_TOTAL,
      note: '입금 대기',
      items: AR_LINES.map(({ amount, ...item }) => ({
        ...item,
        unitOfMaterialName: 'EA',
        totalPrice: amount,
      })),
    });
  }),
];
