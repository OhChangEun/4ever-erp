// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi } from '@/test/mockApi';
import { financeMonthlyPoints } from './financeAnalytics.handlers';
import { addDays, mondayOf, seedOrders } from './seed';

/**
 * 카드 "데모 데이터 채우기". 목록이 2쪽 이상이고 상태가 섞이며, 같은 견적, 품목, 거래처가 도메인을 넘어 같은 값이고,
 * 영업 통계와 매출 분석과 주문 목록이 같은 주문에서 나오는지 본다. 테스트끼리는 vitest.setup.ts 가 목 상태를 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const PageSchema = z.object({ totalElements: z.number(), totalPages: z.number() });

const get = async (path: string): Promise<Row> =>
  RecordSchema.parse(z.object({ data: z.unknown() }).parse(await mockApi('GET', path)).data);
const post = async (path: string, body?: unknown): Promise<unknown> =>
  z.object({ data: z.unknown().optional() }).parse(await mockApi('POST', path, { body })).data;
const rows = async (path: string, key = 'content') => RowsSchema.parse((await get(path))[key]);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);
/**
 * 시계를 2026-11-13(금) 한국 12시로 고정한다(리뷰 M2). Date 만 가짜이고 다른 타이머는 실제다.
 * 목의 "오늘"은 한국 날짜다(화면이 브라우저의 한국 날짜로 기간을 보낸다, 리뷰 M1)
 */
const NOW = '2026-11-13T03:00:00Z';
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.useRealTimers();
});

/** 목록 전부. 총 건수를 먼저 받아 그만큼 한 쪽으로 받는다(리뷰 M3, 예전엔 size=5000) */
const allRows = async (path: string, key = 'content') => {
  const sep = path.includes('?') ? '&' : '?';
  const total = PageSchema.parse((await get(`${path}${sep}page=0&size=1`)).page).totalElements;
  return rows(`${path}${sep}page=0&size=${Math.max(total, 1)}`, key);
};
const withQuery = (path: string, query: string) =>
  `${path}${path.includes('?') ? '&' : '?'}${query}`;

/** 브리프의 여섯 곳과 영업 견적, 주문. [이름, 경로, 행 배열 칸] */
const LISTS: Array<[string, string, string]> = [
  ['직원', '/business/hrm/employee', 'content'],
  ['구매 요청', '/scm-pp/mm/purchase-requisitions', 'content'],
  ['발주', '/scm-pp/mm/purchase-orders', 'content'],
  ['고객', '/business/sd/customers', 'customers'],
  ['BOM', '/scm-pp/pp/boms', 'content'],
  ['창고', '/scm-pp/iv/warehouses', 'content'],
  ['영업 견적', '/business/sd/quotations', 'content'],
  ['영업 주문', '/business/sd/orders', 'content'],
];

describe('목록이 2쪽 이상이고 상태가 섞인다', () => {
  it.each(LISTS)('%s: 12행 이상, 기본 크기로 2쪽, 2쪽은 1쪽과 다른 행', async (_, path, key) => {
    const first = await get(withQuery(path, 'page=0&size=10'));
    const page = PageSchema.parse(first.page);
    expect(page.totalElements).toBeGreaterThanOrEqual(12);
    expect(page.totalPages).toBeGreaterThanOrEqual(2);
    const firstRows = RowsSchema.parse(first[key]).map((row) => JSON.stringify(row));
    const secondRows = (await rows(withQuery(path, 'page=1&size=10'), key)).map((row) =>
      JSON.stringify(row),
    );
    expect(firstRows).toHaveLength(10);
    expect(secondRows.length).toBeGreaterThan(0);
    expect(secondRows.filter((row) => firstRows.includes(row))).toEqual([]);
  });

  it.each(LISTS)('%s: 상태 값이 2종 이상', async (_, path, key) => {
    const all = await rows(withQuery(path, 'page=0&size=1000'), key);
    expect(new Set(all.map((row) => row.statusCode)).size).toBeGreaterThanOrEqual(2);
  });
});

describe('영업 견적과 생산 견적', () => {
  it('영업 견적의 모든 id 가 생산 견적에 같은 번호, 고객, 첫 품목, 날짜로 있다', async () => {
    const sales = await rows('/business/sd/quotations?page=0&size=1000');
    const production = await rows('/scm-pp/pp/quotations?page=0&size=1000');
    expect(sales.length).toBeGreaterThanOrEqual(12);
    for (const quote of sales) {
      const id = str(quote.quotationId);
      const detail = await get(`/business/sd/quotations/${id}`);
      const firstItem = RowsSchema.parse(detail.items)[0];
      const match = production.find((row) => row.quotationId === id);
      expect(match, id).toMatchObject({
        quotationNumber: quote.quotationNumber,
        customerName: quote.customerName,
        productName: firstItem.itemName,
        requestDate: quote.quotationDate,
      });
    }
  });

  it('시뮬레이션도 같은 견적의 고객과 제품을 쓴다', async () => {
    const sales = await rows('/business/sd/quotations?page=0&size=1000');
    const ids = sales.map((quote) => str(quote.quotationId));
    const simulated = RowsSchema.parse(
      RecordSchema.parse(await post('/scm-pp/pp/quotations/simulate', { quotationIds: ids }))
        .content,
    );
    for (const quote of sales) {
      const id = str(quote.quotationId);
      const detail = await get(`/business/sd/quotations/${id}`);
      const firstItem = RowsSchema.parse(detail.items)[0];
      expect(
        simulated.find((row) => row.quotationId === id),
        id,
      ).toMatchObject({
        quotationNumber: quote.quotationNumber,
        customerCompanyName: quote.customerName,
        productName: firstItem.itemName,
        requestQuantity: firstItem.quantity,
      });
    }
  });
});

describe('MRP 품목', () => {
  it.each([
    ['순소요', '/scm-pp/pp/quotations/mrp?page=0&size=1000'],
    ['계획 주문', '/scm-pp/pp/mrp/runs?page=0&size=1000'],
  ])('%s: 모든 품목 id 가 재고 품목표에 있고 이름이 같다', async (_, path) => {
    const items = new Map<string, string>();
    for (const row of await rows(path)) items.set(str(row.itemId), str(row.itemName));
    expect(items.size).toBeGreaterThan(5);
    for (const [itemId, itemName] of items) {
      const detail = await get(`/scm-pp/iv/items/${itemId}`);
      expect(detail.itemName, itemId).toBe(itemName);
    }
  });

  it('순소요의 견적과 품목 짝은 겹치지 않고, 전환은 그 짝 하나만 바꾼다', async () => {
    const all = await rows('/scm-pp/pp/quotations/mrp?page=0&size=1000');
    const pairs = all.map((row) => `${str(row.quotationId)}/${str(row.itemId)}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    const target = all.find((row) => row.convertStatus === 'NOT_CONVERTED') ?? {};
    const sameItem = all.filter(
      (row) => row.itemId === target.itemId && row.quotationId !== target.quotationId,
    );
    expect(sameItem.length).toBeGreaterThan(0);
    await post('/scm-pp/pp/mrp/convert', {
      items: [{ quotationId: target.quotationId, itemId: target.itemId, quantity: 1 }],
    });
    const after = await rows('/scm-pp/pp/quotations/mrp?page=0&size=1000');
    const status = (row: Row) =>
      after.find((r) => r.quotationId === row.quotationId && r.itemId === row.itemId)
        ?.convertStatus;
    expect(status(target)).toBe('CONVERTED');
    for (const row of sameItem) expect(status(row)).toBe(row.convertStatus);
  });
});

describe('재고 확인', () => {
  const check = async (items: Array<{ itemId: string; requiredQuantity: number }>) =>
    RowsSchema.parse(
      RecordSchema.parse(await post('/business/sd/quotations/inventory/check', { items })).items,
    );

  it('요청 수량이 품목표 재고 이하면 충족, 넘으면 부족과 모자란 수량', async () => {
    expect(await check([{ itemId: 'item-1001', requiredQuantity: 120 }])).toMatchObject([
      {
        itemId: 'item-1001',
        itemName: '모터 A',
        requiredQuantity: 120,
        inventoryQuantity: 120,
        shortageQuantity: 0,
        productionRequired: false,
      },
    ]);
    expect(
      await check([
        { itemId: 'item-1001', requiredQuantity: 121 },
        { itemId: 'item-1002', requiredQuantity: 5 },
      ]),
    ).toMatchObject([
      {
        itemId: 'item-1001',
        inventoryQuantity: 120,
        shortageQuantity: 1,
        productionRequired: true,
      },
      {
        itemId: 'item-1002',
        itemName: '베어링 B',
        inventoryQuantity: 20,
        productionRequired: false,
      },
    ]);
  });

  it('재고 이동으로 기본 창고에서 나간 수량을 뺀다', async () => {
    await post('/scm-pp/iv/stock-transfers', {
      fromWarehouseId: 'wh-001',
      toWarehouseId: 'wh-002',
      itemId: 'item-1001',
      stockQuantity: 3,
      uomName: 'EA',
      reason: '재배치',
    });
    expect(await check([{ itemId: 'item-1001', requiredQuantity: 118 }])).toMatchObject([
      { inventoryQuantity: 117, shortageQuantity: 1, productionRequired: true },
    ]);
  });

  it('대기 견적 중 재고가 충족되는 견적과 부족한 견적이 둘 다 있다', async () => {
    const pending = (await rows('/business/sd/quotations?page=0&size=1000')).filter(
      (quote) => quote.statusCode === 'PENDING',
    );
    const outcomes = new Set<boolean>();
    for (const quote of pending) {
      const detail = await get(`/business/sd/quotations/${str(quote.quotationId)}`);
      const result = await check(
        RowsSchema.parse(detail.items).map((item) => ({
          itemId: str(item.itemId),
          requiredQuantity: num(item.quantity),
        })),
      );
      outcomes.add(result.some((item) => item.productionRequired === true));
    }
    expect([...outcomes].sort()).toEqual([false, true]);
  });
});

describe('고객 마스터', () => {
  it('즉시 납품으로 만든 대성기계 주문 상세에 주소와 담당자가 있다', async () => {
    await post('/business/sd/quotations/qt-002/approve-order');
    const order = await get('/business/sd/orders/so-qt-002');
    expect(order.customer).toMatchObject({
      customerName: '대성기계',
      customerId: expect.stringMatching(/^cus-/),
      customerBaseAddress: expect.stringMatching(/\S/),
      manager: { managerName: expect.stringMatching(/\S/) },
    });
  });

  it('견적, 주문, 생산 견적, 매출 분석의 고객 이름이 전부 고객 목록에 있다', async () => {
    const customers = new Set(
      (await rows('/business/sd/customers?page=0&size=1000', 'customers')).map((row) =>
        str(row.customerName),
      ),
    );
    const names = [
      ...(await rows('/business/sd/quotations?page=0&size=1000')).map((r) => r.customerName),
      ...(await allRows('/business/sd/orders')).map((r) => r.customerName),
      ...(await rows('/scm-pp/pp/quotations?page=0&size=1000')).map((r) => r.customerName),
      ...RowsSchema.parse(
        (await get('/business/sd/analytics/sales?startDate=2026-06-12&endDate=2026-11-12'))
          .topCustomers,
      ).map((r) => r.customerName),
    ].map(str);
    expect(names.filter((name) => !customers.has(name))).toEqual([]);
  });

  it('고객의 주문 수와 거래 금액은 주문 목록에서 그 고객의 합이다', async () => {
    const orders = await allRows('/business/sd/orders');
    for (const customer of await rows('/business/sd/customers?page=0&size=1000', 'customers')) {
      const own = orders.filter((order) => order.customerName === customer.customerName);
      expect(customer.orderCount, str(customer.customerName)).toBe(own.length);
      expect(customer.totalTransactionAmount).toBe(
        own.reduce((sum, order) => sum + num(order.totalAmount), 0),
      );
    }
  });
});

describe('영업 통계 = 매출 분석 = 주문 목록', () => {
  // 고정한 시계(NOW)의 한국 날짜
  const today = '2026-11-13';
  const monday = '2026-11-09';
  const start = '2026-09-04';

  const weekStat = async () => {
    const week = RecordSchema.parse((await get('/business/sd/statistics')).week);
    return {
      count: num(RecordSchema.parse(week.new_orders_count).value),
      sale: num(RecordSchema.parse(week.sales_amount).value),
    };
  };
  const lastPoint = async (end = today) => {
    const data = await get(`/business/sd/analytics/sales?startDate=${start}&endDate=${end}`);
    const point = RowsSchema.parse(data.trend).at(-1) ?? {};
    return { count: num(point.orderCount), sale: num(point.sale) };
  };
  const thisWeekOrders = (from = monday, to = today) =>
    allRows(`/business/sd/orders?startDate=${from}&endDate=${to}`);

  it('신규 주문 주 값 = 매출 분석 이번 주 건수 = 주문 목록의 이번 주 주문 수. 매출도 같다', async () => {
    const stat = await weekStat();
    const orders = await thisWeekOrders();
    expect(stat).toEqual(await lastPoint());
    expect(stat.count).toBe(orders.length);
    expect(stat.sale).toBe(orders.reduce((sum, order) => sum + num(order.totalAmount), 0));
  });

  it('즉시 납품으로 주문이 생기면 통계와 차트가 같이 한 건 는다', async () => {
    const before = await weekStat();
    await post('/business/sd/quotations/qt-002/approve-order');
    const after = await weekStat();
    expect(after.count).toBe(before.count + 1);
    expect(after).toEqual(await lastPoint());
  });

  it('월 매출 = 재무 월별 손익의 이번 달 매출 = 주문 목록의 이번 달 합', async () => {
    const month = RecordSchema.parse((await get('/business/sd/statistics')).month);
    const orders = await allRows(
      `/business/sd/orders?startDate=${today.slice(0, 8)}01&endDate=${today}`,
    );
    const sale = num(RecordSchema.parse(month.sales_amount).value);
    expect(sale).toBe(orders.reduce((sum, order) => sum + num(order.totalAmount), 0));
    expect(sale).toBe(financeMonthlyPoints().at(-1)?.sales);
  });

  it('주문 목록은 최신순이고 오늘 뒤 날짜가 없다', async () => {
    const dates = (await allRows('/business/sd/orders')).map((r) => str(r.orderDate));
    expect(dates.every((date) => date <= today)).toBe(true);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('한국 월요일 새벽(UTC 로는 일요일)에도 이번 주는 한국 월요일부터이고 0건이 아니다(리뷰 M1)', async () => {
    vi.setSystemTime(new Date('2026-11-15T16:00:00Z'));
    const stat = await weekStat();
    expect(stat.count).toBeGreaterThan(0);
    expect(stat).toEqual(await lastPoint('2026-11-16'));
    expect(stat.count).toBe((await thisWeekOrders('2026-11-16', '2026-11-16')).length);
  });
});

describe('주마다 만든 주문(리뷰 M1, M3)', () => {
  it('2025-11-03 주부터 2027-12-27 주까지 113주 모두 월요일 주문이 1건 이상이다', () => {
    const mondays = new Map<string, number>();
    for (const day of ['2026-11-13', '2027-06-30', '2027-12-31']) {
      // 기본 주문(so-001, so-002 고정 행 말고)의 가장 이른 날이 그 날의 창 시작
      const windowStart = seedOrders(day)
        .filter(({ order }) => !['so-001', 'so-002'].includes(order.salesOrderId))
        .reduce((min, { order }) => (order.orderDate < min ? order.orderDate : min), day);
      for (let week = mondayOf(windowStart); week <= day; week = addDays(week, 7)) {
        const count = seedOrders(day).filter(({ order }) => order.orderDate === week).length;
        mondays.set(week, Math.max(mondays.get(week) ?? 0, count));
      }
    }
    const weeks = [...mondays.keys()].filter(
      (week) => week >= '2025-11-03' && week <= '2027-12-27',
    );
    expect(weeks).toHaveLength(113);
    expect(weeks.filter((week) => (mondays.get(week) ?? 0) < 1)).toEqual([]);
  });

  it('주문은 오늘이 든 주에서 53주 안쪽만 만들고, 오늘이 바뀌어도 같은 id 는 같은 주문이다', () => {
    const later = seedOrders('2027-12-31');
    const generated = later.filter(
      ({ order }) => !['so-001', 'so-002'].includes(order.salesOrderId),
    );
    const oldest = generated.reduce(
      (min, { order }) => (order.orderDate < min ? order.orderDate : min),
      '9999-12-31',
    );
    expect(oldest >= addDays(mondayOf('2027-12-31'), -53 * 7)).toBe(true);
    const earlier = seedOrders('2027-06-30');
    const shared = earlier.filter(
      ({ order }) => order.orderDate >= oldest && order.orderDate <= '2027-06-20',
    );
    expect(shared.length).toBeGreaterThan(100);
    for (const { order } of shared) {
      const same = later.find((row) => row.order.salesOrderId === order.salesOrderId)?.order;
      expect(same && { ...same, statusCode: order.statusCode }, order.salesOrderId).toEqual(order);
    }
  });
});
