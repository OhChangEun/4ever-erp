// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi, mockCall } from '@/test/mockApi';
import { WAREHOUSE_ITEMS } from './catalog';
import { EMPLOYEES, addDays, mondayOf } from './seed';

/**
 * 카드 "데모 목록 재고 물류". 재고 목록, 안전재고, 재고 이동, 생산중과 출고 준비, 입고 대기와 완료, MPS 가
 * 손으로 적은 한 줄이 아니라 품목표, 영업 주문, 발주, 견적에서 나오고, 쓰기(배송 시작, 발주 배송 시작, 안전재고, 재고 이동)를
 * 따라 행이 목록 사이를 옮겨 가는지 본다. 테스트끼리는 vitest.setup.ts 가 목 상태를 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const PageSchema = z.object({ totalElements: z.number(), totalPages: z.number() });

const get = async (path: string): Promise<Row> =>
  RecordSchema.parse(z.object({ data: z.unknown() }).parse(await mockApi('GET', path)).data);
const post = async (path: string, body?: unknown): Promise<unknown> =>
  z.object({ data: z.unknown().optional() }).parse(await mockApi('POST', path, { body })).data;
const patch = (path: string, body?: unknown) => mockApi('PATCH', path, { body });
const rows = async (path: string, key = 'content') => RowsSchema.parse((await get(path))[key]);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);
const withQuery = (path: string, query: string) =>
  `${path}${path.includes('?') ? '&' : '?'}${query}`;
const totalOf = async (path: string) =>
  PageSchema.parse((await get(withQuery(path, 'page=0&size=1'))).page).totalElements;
/** 목록 전부. 총 건수를 먼저 받아 그만큼 한 쪽으로 받는다 */
const allRows = async (path: string) =>
  rows(withQuery(path, `page=0&size=${Math.max(await totalOf(path), 1)}`));
const ids = (list: Row[], key: string) => list.map((row) => str(row[key]));
const pick = (row: Row, keys: string[]) => Object.fromEntries(keys.map((key) => [key, row[key]]));

/** 시계를 2026-11-13(금) 한국 12시로 고정한다(seed.test.ts 와 같다) */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T03:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const INV = '/scm-pp/iv/inventory-items';
const SHORTAGE = '/scm-pp/iv/shortage';
const PREVIEW = '/scm-pp/iv/shortage/preview';
const TRANSFERS = '/scm-pp/iv/stock-transfers';
const ITEM = (itemId: string) => `/scm-pp/iv/items/${itemId}`;
const IV_STATS = '/scm-pp/iv/statistic';
const LOW_STATS = '/scm-pp/iv/shortage/count/critical/statistic';
const PRODUCTION = '/scm-pp/sales-orders/production';
const READY = '/scm-pp/sales-orders/ready-to-ship';
const SHIP = (orderId: string) => `/scm-pp/sales-orders/${orderId}/status`;
const RECEIVING = '/scm-pp/purchase-orders/receiving';
const RECEIVED = '/scm-pp/purchase-orders/received';
const SO = '/business/sd/orders';
const PO = '/scm-pp/mm/purchase-orders';
const MRP = '/scm-pp/pp/quotations/mrp';
const MPS = '/scm-pp/pp/quotations/mps';
const PQ = '/scm-pp/pp/quotations';
const QUOTE = (quotationId: string) => `/business/sd/quotations/${quotationId}`;

/** 통계의 주 값 */
const week = async (path: string, key: string) =>
  num(RecordSchema.parse(RecordSchema.parse((await get(path)).week)[key]).value);
/** 재고 상태 규칙(게이트웨이 옛 목 ImController.java:669-671) */
const statusOf = (current: number, safety: number) =>
  current < safety * 0.5 ? 'URGENT' : current < safety ? 'CAUTION' : 'NORMAL';
const transfer = (itemId: string, stockQuantity: number) =>
  post(TRANSFERS, {
    fromWarehouseId: 'wh-001',
    toWarehouseId: 'wh-002',
    itemId,
    stockQuantity,
    uomName: 'EA',
    reason: '재배치',
  });

describe('재고 목록은 품목표 전부다', () => {
  it('14개 품목, 기본 크기로 2쪽, 2쪽은 1쪽과 다른 행, 상태 2종 이상', async () => {
    const all = await allRows(INV);
    expect(ids(all, 'itemId').sort()).toEqual(WAREHOUSE_ITEMS.map((item) => item.itemId).sort());
    const first = await get(withQuery(INV, 'page=0&size=10'));
    expect(PageSchema.parse(first.page)).toMatchObject({ totalElements: 14, totalPages: 2 });
    const second = await rows(withQuery(INV, 'page=1&size=10'));
    expect(second).toHaveLength(4);
    const firstIds = ids(RowsSchema.parse(first.content), 'itemId');
    expect(ids(second, 'itemId').filter((id) => firstIds.includes(id))).toEqual([]);
    expect(new Set(all.map((row) => row.statusCode)).size).toBeGreaterThanOrEqual(2);
  });

  it('현재고와 안전재고가 견적 재고 확인, MRP 순소요, 재고 상세와 같다(재고 이동과 안전재고 수정 뒤에도)', async () => {
    await transfer('item-wh-003', 7);
    await patch(`${ITEM('item-wh-004')}/safety-stock?safetyStock=999`);
    const mrp = await allRows(MRP);
    for (const row of await allRows(INV)) {
      const itemId = str(row.itemId);
      const check = RowsSchema.parse(
        RecordSchema.parse(
          await post('/business/sd/quotations/inventory/check', {
            items: [{ itemId, requiredQuantity: 1 }],
          }),
        ).items,
      )[0];
      expect(check.inventoryQuantity).toBe(row.currentStock);
      expect(pick(await get(ITEM(itemId)), ['currentStock', 'safetyStock'])).toEqual(
        pick(row, ['currentStock', 'safetyStock']),
      );
      for (const material of mrp.filter((line) => line.itemId === itemId))
        expect(pick(material, ['currentStock', 'safetyStock'])).toEqual(
          pick(row, ['currentStock', 'safetyStock']),
        );
    }
    const moved = (await allRows(INV)).find((row) => row.itemId === 'item-wh-003');
    const raised = (await allRows(INV)).find((row) => row.itemId === 'item-wh-004');
    expect(moved?.currentStock).toBe(
      (WAREHOUSE_ITEMS.find((item) => item.itemId === 'item-wh-003')?.current ?? 0) - 7,
    );
    expect(raised?.safetyStock).toBe(999);
  });

  it('상태는 지금 현재고와 안전재고로 정한다(절반 미만 URGENT, 미만 CAUTION, 그 밖 NORMAL)', async () => {
    await patch(`${ITEM('item-1001')}/safety-stock?safetyStock=300`);
    for (const row of await allRows(INV))
      expect(row.statusCode).toBe(statusOf(num(row.currentStock), num(row.safetyStock)));
    expect((await allRows(INV)).find((row) => row.itemId === 'item-1001')?.statusCode).toBe(
      'URGENT',
    );
  });

  it('재고 금액 통계는 재고 목록 전부의 금액 합이다', async () => {
    const all = await allRows(INV);
    expect(await week(IV_STATS, 'total_stock')).toBe(
      all.reduce((sum, row) => sum + num(row.totalAmount), 0),
    );
  });
});

describe('안전재고 부족은 재고 목록에서 나온다', () => {
  const shortOf = async () =>
    (await allRows(INV)).filter((row) => num(row.currentStock) < num(row.safetyStock));

  it('부족 목록과 미리보기 = 현재고가 안전재고보다 적은 품목, 같은 값과 상태. 상태 2종 이상', async () => {
    const expected = await shortOf();
    const shortage = await allRows(SHORTAGE);
    expect(ids(shortage, 'itemId').sort()).toEqual(ids(expected, 'itemId').sort());
    const keys = ['itemId', 'itemNumber', 'itemName', 'currentStock', 'safetyStock', 'statusCode'];
    for (const row of shortage)
      expect(pick(row, keys)).toEqual(
        pick(expected.find((e) => e.itemId === row.itemId) ?? {}, keys),
      );
    expect(new Set(shortage.map((row) => row.statusCode)).size).toBeGreaterThanOrEqual(2);
    const preview = await rows(PREVIEW);
    expect(ids(preview, 'itemId').sort()).toEqual(ids(expected, 'itemId').sort());
  });

  it('안전재고를 올리면 부족에 들고 내리면 빠진다. 긴급, 주의 통계가 그 건수다', async () => {
    await patch(`${ITEM('item-1001')}/safety-stock?safetyStock=300`);
    await patch(`${ITEM('item-1002')}/safety-stock?safetyStock=10`);
    const shortage = await allRows(SHORTAGE);
    expect(ids(shortage, 'itemId')).toContain('item-1001');
    expect(ids(shortage, 'itemId')).not.toContain('item-1002');
    expect(ids(await rows(PREVIEW), 'itemId')).toContain('item-1001');
    expect(await week(LOW_STATS, 'total_emergency')).toBe(
      shortage.filter((row) => row.statusCode === 'URGENT').length,
    );
    expect(await week(LOW_STATS, 'total_warning')).toBe(
      shortage.filter((row) => row.statusCode === 'CAUTION').length,
    );
  });

  it('상태 필터는 그 상태 행만 준다', async () => {
    const all = await allRows(SHORTAGE);
    const caution = await allRows(withQuery(SHORTAGE, 'statusCode=CAUTION'));
    expect(caution).toEqual(all.filter((row) => row.statusCode === 'CAUTION'));
    expect(caution.length).toBeGreaterThan(0);
  });
});

describe('재고 이동 기록', () => {
  const activeNames = EMPLOYEES.filter((row) => row.statusCode === 'ACTIVE').map((row) => row.name);
  const catalogNames = WAREHOUSE_ITEMS.map((item) => item.itemName);

  it('12건 이상, 품목은 품목표, 담당자는 재직 직원, 이동 종류 2종 이상, 최근 것이 위', async () => {
    const movements = await rows(TRANSFERS);
    expect(movements.length).toBeGreaterThanOrEqual(12);
    for (const row of movements) {
      expect(catalogNames).toContain(row.itemName);
      expect(activeNames).toContain(row.managerName);
      expect(num(row.quantity)).toBeGreaterThan(0);
    }
    expect(new Set(movements.map((row) => row.type)).size).toBeGreaterThanOrEqual(2);
    // 최근 것이 위
    const dates = movements.map((row) => str(row.workDate));
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('재고를 옮길 때마다 맨 위에 그 품목의 이동 행이 생긴다(같은 품목도 따로)', async () => {
    const before = (await rows(TRANSFERS)).length;
    await transfer('item-1001', 3);
    await transfer('item-1001', 5);
    const movements = await rows(TRANSFERS);
    expect(movements).toHaveLength(before + 2);
    expect(movements.slice(0, 2)).toMatchObject([
      { type: 'MOVE', itemName: '모터 A', quantity: 5 },
      { type: 'MOVE', itemName: '모터 A', quantity: 3 },
    ]);
  });
});

describe('출고와 입고 목록은 영업 주문과 발주에서 나온다', () => {
  const ordersIn = (status: string) => allRows(withQuery(SO, `status=${status}`));
  const posIn = (status: string) => allRows(withQuery(PO, `statusCode=${status}`));

  it('생산중 = 영업 주문 생산중, 출고 준비 = 영업 주문 출고 준비(so-002 포함), 같은 번호, 고객, 날짜, 금액', async () => {
    for (const [list, status] of [
      [PRODUCTION, 'IN_PRODUCTION'],
      [READY, 'READY_FOR_SHIPMENT'],
    ]) {
      const orders = await ordersIn(status);
      const listed = await allRows(list);
      expect(ids(listed, 'salesOrderId')).toEqual(ids(orders, 'salesOrderId'));
      for (const row of listed) {
        const order = orders.find((o) => o.salesOrderId === row.salesOrderId) ?? {};
        const keys = ['salesOrderNumber', 'customerName', 'orderDate', 'dueDate', 'totalAmount'];
        expect(pick(row, keys)).toEqual(pick(order, keys));
      }
    }
    expect(ids(await allRows(READY), 'salesOrderId')).toContain('so-002');
    expect(ids(await allRows(PRODUCTION), 'salesOrderId')).toContain('so-001');
    expect(await totalOf(READY)).toBeGreaterThanOrEqual(12);
  });

  it('입고 대기 = 배송중 발주, 입고 완료 = 입고 완료 발주, 같은 번호, 공급사, 날짜, 금액', async () => {
    for (const [list, status] of [
      [RECEIVING, 'DELIVERING'],
      [RECEIVED, 'DELIVERED'],
    ]) {
      const orders = await posIn(status);
      const listed = await allRows(list);
      expect(orders.length).toBeGreaterThan(0);
      expect(ids(listed, 'purchaseOrderId')).toEqual(ids(orders, 'purchaseOrderId'));
      for (const row of listed) {
        const order = orders.find((o) => o.purchaseOrderId === row.purchaseOrderId) ?? {};
        const keys = ['purchaseOrderNumber', 'orderDate', 'dueDate', 'totalAmount'];
        expect(pick(row, keys)).toEqual(pick(order, keys));
        expect(row.supplierCompanyName).toBe(order.supplierName);
      }
    }
  });

  it('쪽을 자른다. 출고 준비 2쪽은 1쪽과 다른 행', async () => {
    const first = ids(await rows(withQuery(READY, 'page=0&size=10')), 'salesOrderId');
    const second = ids(await rows(withQuery(READY, 'page=1&size=10')), 'salesOrderId');
    expect(first).toHaveLength(10);
    expect(second.length).toBeGreaterThan(0);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it('생산중, 출고 준비 상세의 품목 줄은 그 영업 주문의 품목 줄이다', async () => {
    for (const list of [PRODUCTION, READY]) {
      for (const row of (await allRows(list)).slice(0, 5)) {
        const id = str(row.salesOrderId);
        const detail = await get(`${list}/${id}`);
        const order = await get(`${SO}/${id}`);
        expect(
          RowsSchema.parse(detail.orderItems).map((item) => pick(item, ['itemId', 'quantity'])),
        ).toEqual(RowsSchema.parse(order.items).map((item) => pick(item, ['itemId', 'quantity'])));
      }
    }
  });

  it('통계: 출고 대기 = 출고 준비, 입고 대기 = 입고 대기, 입고 완료 = 입고 완료, 출고 완료 = 배송중 주문 건수', async () => {
    expect(await week(IV_STATS, 'delivery_pending')).toBe(await totalOf(READY));
    expect(await week(IV_STATS, 'store_pending')).toBe(await totalOf(RECEIVING));
    expect(await week(IV_STATS, 'store_complete')).toBe(await totalOf(RECEIVED));
    expect(await week(IV_STATS, 'delivery_complete')).toBe(
      await totalOf(withQuery(SO, 'status=DELIVERING')),
    );
  });

  it('다른 목록의 주문 id 로 상세를 부르면 404 다', async () => {
    expect((await mockCall('GET', `${READY}/so-001`)).status).toBe(404);
    expect((await mockCall('GET', `${PRODUCTION}/so-002`)).status).toBe(404);
  });
});

describe('쓰기가 행을 목록 사이로 옮긴다', () => {
  it('배송을 시작하면 출고 준비에서 빠지고 영업 주문은 배송중, 통계도 따른다', async () => {
    const ready = await totalOf(READY);
    const shipped = await week(IV_STATS, 'delivery_complete');
    await patch(SHIP('so-002'), { itemIds: ['item-1002'] });
    expect(ids(await allRows(READY), 'salesOrderId')).not.toContain('so-002');
    expect(await totalOf(READY)).toBe(ready - 1);
    expect((await get(`${SO}/so-002`)).order).toMatchObject({ statusCode: 'DELIVERING' });
    expect(ids(await allRows(withQuery(SO, 'status=DELIVERING')), 'salesOrderId')).toContain(
      'so-002',
    );
    expect(await week(IV_STATS, 'delivery_pending')).toBe(ready - 1);
    expect(await week(IV_STATS, 'delivery_complete')).toBe(shipped + 1);
  });

  it('출고 준비가 아닌 주문에 배송 시작을 보내도 상태는 그대로다', async () => {
    await patch(SHIP('so-001'), { itemIds: [] });
    expect(ids(await allRows(PRODUCTION), 'salesOrderId')).toContain('so-001');
    expect((await get(`${SO}/so-001`)).order).toMatchObject({ statusCode: 'IN_PRODUCTION' });
  });

  it('즉시 납품으로 만든 주문은 출고 준비에 들고 상세는 견적의 품목 줄이다', async () => {
    await post('/business/sd/quotations/qt-016/approve-order');
    const row = (await allRows(READY)).find((r) => r.salesOrderId === 'so-qt-016');
    expect(row).toMatchObject({ salesOrderNumber: 'SO-QT-2026-016', customerName: '대성기계' });
    const detail = await get(`${READY}/so-qt-016`);
    const quote = await get(QUOTE('qt-016'));
    expect(
      RowsSchema.parse(detail.orderItems).map((item) => pick(item, ['itemId', 'quantity'])),
    ).toEqual(RowsSchema.parse(quote.items).map((item) => pick(item, ['itemId', 'quantity'])));
  });

  it('승인한 발주의 배송을 시작하면 입고 대기에 든다', async () => {
    const approved = await allRows(withQuery(PO, 'statusCode=APPROVAL'));
    const target = str(approved[0].purchaseOrderId);
    const before = await totalOf(RECEIVING);
    await post(`/scm-pp/mm/${target}/start-delivery`);
    expect(ids(await allRows(RECEIVING), 'purchaseOrderId')).toContain(target);
    expect(await totalOf(RECEIVING)).toBe(before + 1);
    expect(await week(IV_STATS, 'store_pending')).toBe(before + 1);
  });
});

describe('MPS 는 확인된 견적의 납기 주에서 나온다', () => {
  const mpsOf = async (bomId: string, startDate: string, endDate: string) =>
    get(`${MPS}?bomId=${bomId}&startDate=${startDate}&endDate=${endDate}&page=0&size=100`);
  /** 확인된(CHECKED) 견적 중 납기가 from~to 인 견적의 첫 품목(모터 A) 수량 합 */
  const checkedDemand = async (from: string, to: string) => {
    let sum = 0;
    for (const row of await allRows(PQ)) {
      if (row.availableStatus !== 'CHECKED') continue;
      const due = str(row.dueDate);
      if (due < from || due > to) continue;
      sum += num(RowsSchema.parse((await get(QUOTE(str(row.quotationId)))).items)[0].quantity);
    }
    return sum;
  };
  const demandOf = (mps: Row) =>
    RowsSchema.parse(mps.content).reduce((sum, row) => sum + num(row.demand), 0);

  it('기간에 걸친 주마다 한 줄, 수요 합은 그 주들에 납기인 확인된 견적의 수량 합', async () => {
    const mps = await mpsOf('bom-001', '2026-11-01', '2026-11-30');
    const weeks = RowsSchema.parse(mps.content);
    // 11-01(일)이 든 주의 월요일 10-26 부터 11-30 이 든 주까지 6주
    expect(weeks.map((row) => row.week)).toEqual([
      '2026-10-4W',
      '2026-11-1W',
      '2026-11-2W',
      '2026-11-3W',
      '2026-11-4W',
      '2026-11-5W',
    ]);
    expect(demandOf(mps)).toBe(
      await checkedDemand(mondayOf('2026-11-01'), addDays(mondayOf('2026-11-30'), 6)),
    );
    expect(demandOf(mps)).toBeGreaterThan(0);
    const safety = num((await get(ITEM('item-1001'))).safetyStock);
    for (const row of weeks) {
      expect(row.requiredInventory).toBe(safety);
      expect(num(row.productionNeeded)).toBeGreaterThanOrEqual(0);
      expect(num(row.plannedProduction)).toBeGreaterThanOrEqual(num(row.productionNeeded));
    }
  });

  it('기본 기간(오늘 하루)은 한 줄, 시작이 끝보다 늦으면 빈 목록, 견적이 없는 제품은 빈 목록', async () => {
    expect(
      RowsSchema.parse((await mpsOf('bom-001', '2026-11-13', '2026-11-13')).content),
    ).toHaveLength(1);
    expect(RowsSchema.parse((await mpsOf('bom-001', '2026-11-30', '2026-11-01')).content)).toEqual(
      [],
    );
    // 같은 주 안에서 거꾸로(13일~12일)도 빈 목록(리뷰 A1)
    expect(RowsSchema.parse((await mpsOf('bom-001', '2026-11-13', '2026-11-12')).content)).toEqual(
      [],
    );
    expect(RowsSchema.parse((await mpsOf('bom-002', '2026-11-01', '2026-11-30')).content)).toEqual(
      [],
    );
  });

  it('제안 납기를 확정한 견적의 수량이 그 납기 주 수요에 더해진다', async () => {
    const before = demandOf(await mpsOf('bom-001', '2026-11-09', '2026-11-15'));
    // qt-007 은 미확인(UNCHECKED), 납기 2026-11-09, 모터 A 500
    await post('/scm-pp/pp/quotations/confirm', { quotationIds: ['qt-007'] });
    expect(demandOf(await mpsOf('bom-001', '2026-11-09', '2026-11-15'))).toBe(before + 500);
  });
});
