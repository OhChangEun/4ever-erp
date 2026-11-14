import { http } from 'msw';
import { FINANCE_BASE_PATH, FINANCE_ENDPOINTS } from '@/app/types/api';
import { mockState } from '../state';
import { financeMonthlyPoints, monthlyMetric } from './financeAnalytics.handlers';
import {
  ACTIVE_SUPPLIERS,
  CUSTOMERS,
  MATERIALS,
  addDays,
  monthStart,
  seedOrders,
  todayKey,
} from './seed';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  pathSegment,
  paged,
  filterBy,
  hashUnit,
  newestFirst,
  statResponse,
} from './utils';

/**
 * 재무 목이 기억하는 전표 상태(로그인별, `src/mocks/state.ts`).
 * 서버 응답이 Object 라 값은 화면이 비교하는 것에 맞췄다(verified=false, InvoiceList.tsx:130).
 * 매입 전표는 사내가 처리 요청하면 UNPAID → PENDING, 공급사가 완료하면 PAID. 매출 전표는 수금 완료 뒤 PAID.
 */
const invoiceStatus = mockState(() => new Map<string, string>());

type InvoiceLine = {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};
interface Invoice {
  row: {
    invoiceId: string;
    invoiceNumber: string;
    connection: { connectionId: string; connectionCode: string; connectionName: string };
    totalAmount: number;
    issueDate: string;
    dueDate: string;
    statusCode: string;
    referenceNumber: string;
  };
  lines: InvoiceLine[];
}

const DAY = 86_400_000;
const daysSince = (date: string, today: string) => (Date.parse(today) - Date.parse(date)) / DAY;
const byNewest = newestFirst<Invoice>(
  ({ row }) => row.issueDate,
  ({ row }) => row.invoiceId,
);

/**
 * 매출 전표(카드 "데모 목록 인사 재무" 결정 1). 기본 주문(`seedOrders`) 하나에 전표 하나. 발행일 = 주문일,
 * 금액과 품목 줄 = 주문, 참조 번호 = 주문 번호. 그래서 달마다 전표 합이 재무 월별 손익의 매출이다.
 * id 는 주문 순번을 따른다(so-001 → inv-ar-001). 상태는 발행 뒤 지난 날(verified=false, 서버의 수금 흐름을 모른다):
 * 45일까지는 순번 짝수가 미납, 홀수가 수금 대기(고객이 입금 확인을 요청함), 그 뒤 완납. 오래된 것 중 몇 건(so-001 포함)은
 * 수금 대기로 남은 연체다. 짝홀로 나눠 첫 쪽에 늘 처리할 수 있는 전표(수금 대기)가 있다
 */
const arInvoices = (today = todayKey()): Invoice[] =>
  seedOrders(today)
    .map(({ order, lines }) => {
      const serial = order.salesOrderId.slice('so-'.length);
      const customer = CUSTOMERS.find(
        ({ customer: row }) => row.customerName === order.customerName,
      )?.customer;
      const age = daysSince(order.orderDate, today);
      const overdue = serial === '001' || hashUnit(`ar:${serial}`) < 0.04;
      return {
        row: {
          invoiceId: `inv-ar-${serial}`,
          invoiceNumber: `AR-${order.orderDate.slice(0, 4)}-${serial}`,
          connection: {
            connectionId: customer?.customerId ?? '',
            connectionCode: customer?.customerNumber ?? '',
            connectionName: order.customerName,
          },
          totalAmount: order.totalAmount,
          issueDate: order.orderDate,
          dueDate: addDays(order.orderDate, 30),
          statusCode:
            age <= 45 ? (Number(serial) % 2 ? 'PENDING' : 'UNPAID') : overdue ? 'PENDING' : 'PAID',
          referenceNumber: order.salesOrderNumber,
        },
        lines: lines.map(({ amount, ...item }) => ({ ...item, totalPrice: amount })),
      };
    })
    .sort(byNewest);

/** 매입 전표 품목 줄의 마지막 줄. 단가 1,000 이라 만 원 단위 금액의 나머지를 늘 채운다 */
const COPPER = MATERIALS[0];
/**
 * 공급사 한 곳의 한 달 매입(만 원 단위)을 품목 줄로. 자재 둘을 20개 단위로 금액의 30%씩 채우고 구리선이 나머지다.
 * 20개 × 단가(50원 단위)는 1,000원 단위라 나머지가 늘 구리선 단가로 나누어진다
 */
const apLines = (amount: number, seed: number): InvoiceLine[] => {
  const others = MATERIALS.slice(1);
  const lines = [0, 1].flatMap((k) => {
    const item = others[(seed + k * 5) % others.length];
    const quantity = 20 * Math.floor((amount * 0.3) / (20 * item.unitPrice));
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
  const rest = amount - lines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return [...lines, { ...COPPER, quantity: rest / COPPER.unitPrice }].map((item) => ({
    itemId: item.itemId,
    itemName: item.itemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.quantity * item.unitPrice,
  }));
};

/**
 * 매입 전표(카드 "데모 목록 인사 재무" 결정 2). 활성 공급사마다 달마다 한 장(월 마감). 금액은 재무 월별 손익의 그 달
 * 매입을 공급사 몫(5:4:3:2:1)으로 나눈 것이라 달마다 합이 매입과 같다. 발행일은 그 달 말일, 이번 달은 오늘.
 * 상태는 이번 달 미납, 지난달은 공급사 하나 걸러 처리 요청(대기)과 미납, 그 앞은 완납(verified=false)
 */
const apInvoices = (today = todayKey()): Invoice[] => {
  const points = financeMonthlyPoints(today);
  const weights = ACTIVE_SUPPLIERS.map((_, s) => ACTIVE_SUPPLIERS.length - s);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  return points
    .flatMap((point, i) => {
      const monthsAgo = points.length - 1 - i;
      const issueDate = monthsAgo === 0 ? today : addDays(monthStart(today, monthsAgo - 1), -1);
      const yyyymm = point.month.replace('-', '');
      let left = point.purchases;
      return ACTIVE_SUPPLIERS.map(({ supplierInfo }, s) => {
        // 만 원 단위로 나누고 마지막 공급사가 나머지를 받는다(합이 매입과 정확히 같게)
        const amount =
          s === ACTIVE_SUPPLIERS.length - 1
            ? left
            : Math.round((point.purchases * weights[s]) / weightSum / 10_000) * 10_000;
        left -= amount;
        const serial = supplierInfo.supplierId.slice('sup-'.length);
        const lines = apLines(amount, s * 3 + i);
        return {
          row: {
            invoiceId: `inv-ap-${yyyymm}-${serial}`,
            invoiceNumber: `AP-${yyyymm}-${serial}`,
            connection: {
              connectionId: supplierInfo.supplierId,
              connectionCode: supplierInfo.supplierNumber,
              connectionName: supplierInfo.supplierName,
            },
            totalAmount: lines.reduce((sum, item) => sum + item.totalPrice, 0),
            issueDate,
            dueDate: addDays(issueDate, 30),
            statusCode:
              monthsAgo === 0 ? 'UNPAID' : monthsAgo > 1 ? 'PAID' : s % 2 ? 'UNPAID' : 'PENDING',
            referenceNumber: `REF-AP-${yyyymm}-${serial}`,
          },
          lines,
        };
      });
    })
    .sort(byNewest);
};

/** 쓰기(처리 요청, 완료)를 덮은 전표 */
const withStatus = (request: Request, invoices: Invoice[]) => {
  const status = invoiceStatus(request);
  return invoices.map(({ row, lines }) => ({
    row: { ...row, statusCode: status.get(row.invoiceId) ?? row.statusCode },
    lines,
  }));
};

/** 전표 목록 필터. 화면은 상태만 보낸다(게이트웨이의 company, startDate, endDate 는 안 보낸다, FcmController.java:62-65) */
const INVOICE_FILTER = { equals: { status: (row: { statusCode: string }) => row.statusCode } };
const invoiceList = (request: Request, invoices: Invoice[]) =>
  ok(
    paged(
      request,
      filterBy(
        request,
        withStatus(request, invoices).map(({ row }) => row),
        INVOICE_FILTER,
      ),
    ),
  );
/** 상세의 비고. 상태로 정한다 */
const INVOICE_NOTES: Partial<Record<string, string>> = {
  UNPAID: '처리 요청 전',
  PENDING: '입금 확인 대기',
  PAID: '정산 완료',
};
/** 목록의 그 전표로 만든 상세. 목록에 없으면 undefined */
const invoiceDetail = (
  request: Request,
  invoices: Invoice[],
  invoiceId: string,
  invoiceType: 'AP' | 'AR',
) => {
  const found = withStatus(request, invoices).find(({ row }) => row.invoiceId === invoiceId);
  if (!found) return undefined;
  const { row, lines } = found;
  return {
    invoiceId: row.invoiceId,
    invoiceNumber: row.invoiceNumber,
    invoiceType,
    statusCode: row.statusCode,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    name: row.connection.connectionName,
    referenceNumber: row.referenceNumber,
    totalAmount: row.totalAmount,
    note: INVOICE_NOTES[row.statusCode] ?? '',
    items: lines.map((item) => ({ ...item, unitOfMaterialName: 'EA' })),
  };
};

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
    // 고객사의 총 구매액은 매출 전표 금액이다. 매출 전표가 주문과 같은 날, 같은 금액이라 재무 매출과 같다
    return ok(statResponse({ total_amount: monthlyMetric('sales') }));
  }),
  http.get(FINANCE_ENDPOINTS.SUPPLIER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier stats', 500);
    // 공급사의 총 매출액은 매입 전표 금액이다. 매입 전표의 달 합이 재무 매입이다
    return ok(statResponse({ total_amount: monthlyMetric('purchases') }));
  }),
  http.get(FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase invoices', 500);
    return invoiceList(request, apInvoices());
  }),
  http.get<{
    invoiceId: string;
  }>(`${FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST}/:invoiceId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load purchase invoice detail', 500);
    // 목록에 없는 전표는 404(카드 "없는 건은 404")
    const detail = invoiceDetail(request, apInvoices(), params.invoiceId, 'AP');
    return detail ? ok(detail) : notFound('AP 전표 상세 조회');
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
    return invoiceList(request, arInvoices());
  }),
  http.get<{
    invoiceId: string;
  }>(`${FINANCE_ENDPOINTS.SALES_INVOICES_LIST}/:invoiceId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load sales invoice detail', 500);
    const detail = invoiceDetail(request, arInvoices(), params.invoiceId, 'AR');
    return detail ? ok(detail) : notFound('AR 전표 상세 조회');
  }),
];
