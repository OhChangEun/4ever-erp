// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi, mockCall } from '@/test/mockApi';
import { DETAIL_PAIRS, detailPath } from '@/test/contract/detailPairs';
import {
  API_BASE_URL,
  DASHBOARD_ENDPOINTS,
  FINANCE_ENDPOINTS,
  INVENTORY_ENDPOINTS,
  LOWSTOCK_ENDPOINTS,
  SALES_ENDPOINTS,
  WAREHOUSE_ENDPOINTS,
} from '@/app/types/api';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import { PRODUCTION_ENDPOINTS } from '@/app/(private)/production/api/production.endpoints';
import { PURCHASE_ENDPOINTS } from '@/app/(private)/purchase/api/purchase.endpoints';
import { financeMonthlyPoints } from './financeAnalytics.handlers';
import { mondayOf, seedOrders, todayKey } from './seed';

/**
 * 카드 "목 데이터 현실성". 목록에서 고른 건의 상세가 그 행이고, 같은 품목은 어디서나 같은 값이며,
 * 통계와 차트가 목록 데이터와 말이 되는지 본다. 테스트끼리는 vitest.setup.ts 가 목 상태를 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);

/** 엔드포인트 상수(`/api/proxy/...`)를 mockApi 경로로 */
const rel = (url: string) => url.slice(API_BASE_URL.length);
const get = (url: string) => mockApi('GET', rel(url));
const post = (url: string, body?: unknown) => mockApi('POST', rel(url), { body });
const put = (url: string) => mockApi('PUT', rel(url));
const patch = (url: string, body?: unknown) => mockApi('PATCH', rel(url), { body });

const dataOf = async (url: string): Promise<unknown> =>
  z.object({ data: z.unknown() }).parse(await get(url)).data;
const recordOf = async (url: string) => RecordSchema.parse(await dataOf(url));
const rowsOf = async (url: string, key = 'content') => RowsSchema.parse((await recordOf(url))[key]);
/** 목록 전부(한 쪽에). 목이 쪽을 자르고 기본 행이 12~42건이다(카드 "데모 데이터 채우기") */
const ALL = 'page=0&size=1000';
const allOf = (url: string) => `${url}${url.includes('?') ? '&' : '?'}${ALL}`;
const field = (row: Row, key: string) => RecordSchema.parse(row[key]);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);
const pick = (row: Row, keys: string[]) => Object.fromEntries(keys.map((key) => [key, row[key]]));

/** 상세의 품목 줄. 금액 칸 이름이 도메인마다 달라 받는다 */
const lines = (detail: Row, amountKey: string) =>
  RowsSchema.parse(detail.items).map((item) => ({
    quantity: num(item.quantity),
    unitPrice: num(item.unitPrice),
    amount: num(item[amountKey]),
  }));
const expectLinesAddUp = (detail: Row, amountKey: string, total: unknown) => {
  const items = lines(detail, amountKey);
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) expect(item.amount).toBe(item.quantity * item.unitPrice);
  expect(items.reduce((sum, item) => sum + item.amount, 0)).toBe(total);
};

describe('목록과 상세: 목록의 모든 행 id 로 상세를 부르면 그 행의 값이다', () => {
  it('영업 견적(새로 만든 견적 포함). 품목 금액 합이 총액이다', async () => {
    await post(SALES_ENDPOINTS.NEW_ORDER, {
      items: [{ itemId: 'item-1001', quantity: 5, unitPrice: 12000 }],
      note: '신규',
    });
    // 기본 견적 16건 + 새 견적 1건
    const rows = await rowsOf(allOf(SALES_ENDPOINTS.QUOTES_LIST));
    expect(rows).toHaveLength(17);
    const keys = [
      'quotationId',
      'quotationNumber',
      'customerName',
      'quotationDate',
      'dueDate',
      'totalAmount',
      'statusCode',
    ];
    for (const row of rows) {
      const detail = await recordOf(`${SALES_ENDPOINTS.QUOTES_LIST}/${str(row.quotationId)}`);
      expect(pick(detail, keys)).toEqual(pick(row, keys));
      expectLinesAddUp(detail, 'amount', row.totalAmount);
    }
  });

  it('영업 주문(즉시 납품으로 만든 주문 포함). 품목 금액 합이 총액이다', async () => {
    await post(SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('qt-002'));
    // 기본 주문(주마다 만든 것) + 즉시 납품으로 만든 주문 1건
    const rows = await rowsOf(`${SALES_ENDPOINTS.ORDERS_LIST}?page=0&size=5000`);
    expect(rows).toHaveLength(seedOrders().length + 1);
    const keys = [
      'salesOrderId',
      'salesOrderNumber',
      'orderDate',
      'dueDate',
      'totalAmount',
      'statusCode',
    ];
    // 주문은 주마다 같은 규칙으로 만든다(수백 건). 전부 부르면 CI 에서 5초를 넘어 앞뒤 20건과 25건마다 하나를 본다.
    // 즉시 납품으로 만든 주문은 목록 맨 앞이라 앞 20건에 들어간다
    const sample = rows.filter((_, i) => i < 20 || i >= rows.length - 20 || i % 25 === 0);
    expect(sample.length).toBeGreaterThan(40);
    expect(sample.map((row) => str(row.salesOrderId))).toContain('so-qt-002');
    for (const row of sample) {
      const detail = await recordOf(`${SALES_ENDPOINTS.ORDERS_LIST}/${str(row.salesOrderId)}`);
      expect(pick(field(detail, 'order'), keys)).toEqual(pick(row, keys));
      expect(field(detail, 'customer').customerName).toBe(row.customerName);
      expectLinesAddUp(detail, 'amount', row.totalAmount);
    }
  });

  it('영업 고객(새로 등록한 고객 포함)', async () => {
    await post(SALES_ENDPOINTS.CUSTOMERS_LIST, {
      companyName: '신규상사',
      businessNumber: '111-22-33333',
      ceoName: '최대표',
      contactPhone: '02-333-4444',
      contactEmail: 'contact@new.co.kr',
      address: '서울특별시 마포구',
      detailAddress: '2층',
      manager: { name: '박담당', mobile: '010-5555-4444', email: 'park@new.co.kr' },
    });
    // 기본 고객 15곳 + 새 고객 1곳
    const rows = await rowsOf(allOf(SALES_ENDPOINTS.CUSTOMERS_LIST), 'customers');
    expect(rows).toHaveLength(16);
    const keys = ['customerId', 'customerNumber', 'customerName', 'statusCode', 'manager'];
    for (const row of rows) {
      const detail = await recordOf(`${SALES_ENDPOINTS.CUSTOMERS_LIST}/${str(row.customerId)}`);
      expect(pick(detail, keys)).toEqual(pick(row, keys));
      expect(detail.totalTransactionAmount).toBe(row.totalTransactionAmount);
      expect(detail.totalOrders).toBe(row.orderCount);
    }
  });

  it('구매 요청(새 요청 포함). 품목 금액 합이 총액이다', async () => {
    await post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, {
      items: [
        {
          itemName: '볼트 M8',
          quantity: 10,
          uomName: 'EA',
          expectedUnitPrice: 500,
          preferredSupplierName: '대양상사',
          dueDate: '2026-12-01',
          purpose: '보충',
        },
      ],
    });
    // 기본 요청 15건 + 새 요청 1건
    const rows = await rowsOf(allOf(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS));
    expect(rows).toHaveLength(16);
    for (const row of rows) {
      const id = str(row.purchaseRequisitionId);
      const detail = await recordOf(`${PURCHASE_ENDPOINTS.PURCHASE_REQUESTS}/${id}`);
      expect(detail.id).toBe(id);
      const keys = [
        'purchaseRequisitionNumber',
        'requesterName',
        'departmentName',
        'requestDate',
        'totalAmount',
        'statusCode',
      ];
      expect(pick(detail, keys)).toEqual(pick(row, keys));
      expectLinesAddUp(detail, 'amount', row.totalAmount);
    }
  });

  it('발주. 품목 수가 목록의 "외 N건" 과 맞고 금액 합이 총액이다', async () => {
    const rows = await rowsOf(allOf(PURCHASE_ENDPOINTS.PURCHASE_ORDERS));
    expect(rows).toHaveLength(15);
    const keys = [
      'purchaseOrderId',
      'purchaseOrderNumber',
      'supplierName',
      'orderDate',
      'dueDate',
      'totalAmount',
      'statusCode',
    ];
    for (const row of rows) {
      const detail = await recordOf(
        `${PURCHASE_ENDPOINTS.PURCHASE_ORDERS}/${str(row.purchaseOrderId)}`,
      );
      expect(pick(detail, keys)).toEqual(pick(row, keys));
      const [, first, more] = /^(.+) 외 (\d+)건$/.exec(str(row.itemsSummary)) ?? [];
      const items = RowsSchema.parse(detail.items);
      expect(items[0]?.itemName).toBe(first);
      expect(items).toHaveLength(1 + Number(more));
      expectLinesAddUp(detail, 'totalPrice', row.totalAmount);
    }
  });

  it('공급사', async () => {
    const rows = await rowsOf(allOf(PURCHASE_ENDPOINTS.SUPPLIER));
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      const info = field(row, 'supplierInfo');
      const detail = await recordOf(`${PURCHASE_ENDPOINTS.SUPPLIER}/${str(info.supplierId)}`);
      expect(detail.supplierInfo).toEqual(info);
    }
  });

  it.each([
    ['매입', FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST],
    ['매출', FINANCE_ENDPOINTS.SALES_INVOICES_LIST],
  ])('%s 전표. 품목 금액 합이 총액이다', async (_, list) => {
    const rows = await rowsOf(list);
    const keys = [
      'invoiceId',
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'totalAmount',
      'statusCode',
      'referenceNumber',
    ];
    for (const row of rows) {
      const detail = await recordOf(`${list}/${str(row.invoiceId)}`);
      expect(pick(detail, keys)).toEqual(pick(row, keys));
      expect(detail.name).toBe(field(row, 'connection').connectionName);
      expectLinesAddUp(detail, 'totalPrice', row.totalAmount);
    }
  });

  it('인사 직급, 급여, 교육 현황', async () => {
    for (const row of RowsSchema.parse(await dataOf(HRM_ENDPOINTS.POSITIONS))) {
      const detail = await recordOf(`${HRM_ENDPOINTS.POSITIONS}/${str(row.positionId)}`);
      const keys = ['positionId', 'positionName', 'headCount', 'payment'];
      expect(pick(detail, keys)).toEqual(pick(row, keys));
    }
    for (const row of await rowsOf(HRM_ENDPOINTS.PAYROLL)) {
      const detail = await recordOf(`${HRM_ENDPOINTS.PAYROLL}/${str(row.payrollId)}`);
      expect(detail.employee).toEqual(row.employee);
      const pay = field(row, 'pay');
      expect(pick(field(detail, 'pay'), ['basePay', 'overtimePay', 'deduction', 'netPay'])).toEqual(
        pick(pay, ['basePay', 'overtimePay', 'deduction', 'netPay']),
      );
      expect(detail.statusCode).toBe(pay.statusCode);
    }
    for (const row of await rowsOf(HRM_ENDPOINTS.TRAINING_STATUS, 'items')) {
      const id = str(row.employeeId);
      const detail = await recordOf(
        `${HRM_ENDPOINTS.TRAINING_STATUS.replace('training-status', 'training/employee')}/${id}`,
      );
      expect(detail.employeeName).toBe(row.name);
      const keys = ['department', 'position', 'completedCount', 'requiredMissingCount'];
      expect(pick(detail, keys)).toEqual(pick(row, keys));
    }
  });

  it('인사 교육 프로그램(새 프로그램 포함)', async () => {
    await post(HRM_ENDPOINTS.PROGRAM, {
      programName: '품질 교육',
      category: 'QUALITY',
      trainingHour: 8,
      isOnline: false,
      startDate: '2026-12-01',
      capacity: 20,
      requiredDepartments: [],
      requiredPositions: [],
      description: '신규 품질 기준',
    });
    const rows = await rowsOf(HRM_ENDPOINTS.PROGRAM);
    expect(rows).toHaveLength(2);
    const keys = ['programId', 'programName', 'statusCode', 'category', 'trainingHour', 'isOnline'];
    for (const row of rows) {
      const detail = await recordOf(`${HRM_ENDPOINTS.PROGRAM}/${str(row.programId)}`);
      expect(pick(detail, keys)).toEqual(pick(row, keys));
    }
  });

  it('재고 품목: 일반 목록, 안전재고 목록, 창고별 조회의 모든 행', async () => {
    const rows = [
      ...(await rowsOf(INVENTORY_ENDPOINTS.INVENTORY_LIST)),
      ...(await rowsOf(LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST)),
      ...(await rowsOf(
        `${INVENTORY_ENDPOINTS.INVENTORY_LIST}?type=WAREHOUSE_NAME&keyword=1공장 창고&size=20`,
      )),
    ];
    expect(rows.length).toBeGreaterThan(15);
    const keys = [
      'itemId',
      'itemNumber',
      'itemName',
      'currentStock',
      'safetyStock',
      'unitPrice',
      'uomName',
      'totalAmount',
    ];
    for (const row of rows) {
      const detail = await recordOf(
        `${INVENTORY_ENDPOINTS.INVENTORY_LIST.replace('inventory-items', 'items')}/${str(row.itemId)}`,
      );
      const shared = keys.filter((key) => key in row);
      expect(pick(detail, shared)).toEqual(pick(row, shared));
    }
  });

  it('재고 생산중 주문, 출고 준비 주문', async () => {
    for (const list of [
      INVENTORY_ENDPOINTS.PRODUCTION_LIST,
      INVENTORY_ENDPOINTS.READY_TO_SHIP_LIST,
    ]) {
      for (const row of await rowsOf(list)) {
        const detail = await recordOf(`${list}/${str(row.salesOrderId)}`);
        const keys = ['salesOrderId', 'salesOrderNumber', 'dueDate', 'statusCode'];
        expect(pick(detail, keys)).toEqual(pick(row, keys));
        expect(detail.customerCompanyName).toBe(row.customerName);
      }
    }
  });

  it('창고(새 창고 포함)', async () => {
    await post(WAREHOUSE_ENDPOINTS.ADD_WAREHOUSE, {
      warehouseName: '3공장 창고',
      warehouseType: 'RAW',
      location: '부산',
      managerId: 'mgr-001',
      note: '',
    });
    // 기본 창고 12곳 + 새 창고 1곳
    const rows = await rowsOf(allOf(WAREHOUSE_ENDPOINTS.WAREHOUSE_LIST));
    expect(rows).toHaveLength(13);
    const keys = ['warehouseName', 'warehouseNumber', 'warehouseType', 'statusCode', 'location'];
    for (const row of rows) {
      const detail = await recordOf(WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL(str(row.warehouseId)));
      expect(pick(field(detail, 'warehouseInfo'), keys)).toEqual(pick(row, keys));
      expect(field(detail, 'manager').managerName).toBe(row.manager);
    }
  });

  it('생산 제품 드롭다운의 모든 제품', async () => {
    const products = z
      .array(z.object({ key: z.string(), value: z.string() }))
      .parse(await dataOf(PRODUCTION_ENDPOINTS.PRODUCTS));
    for (const { key, value } of products) {
      const detail = await recordOf(`${PRODUCTION_ENDPOINTS.PRODUCTS}/${key}`);
      expect(pick(detail, ['productId', 'productName'])).toEqual({
        productId: key,
        productName: value,
      });
    }
  });

  it('생산 BOM(새 BOM 포함)', async () => {
    await post(PRODUCTION_ENDPOINTS.BOMS, { productName: '펌프 B', unit: 'EA', items: [] });
    // 기본 BOM 12개 + 새 BOM 1개
    const rows = await rowsOf(allOf(PRODUCTION_ENDPOINTS.BOMS));
    expect(rows).toHaveLength(13);
    const keys = [
      'bomId',
      'bomNumber',
      'productId',
      'productNumber',
      'productName',
      'version',
      'statusCode',
    ];
    for (const row of rows) {
      const detail = await recordOf(`${PRODUCTION_ENDPOINTS.BOMS}/${str(row.bomId)}`);
      expect(pick(detail, keys)).toEqual(pick(row, keys));
    }
  });

  it('생산 MES 50건. 번호, 제품, 수량, 계획일, 상태, 진행률, 공정 순서', async () => {
    // 계획일은 오늘 기준이다. 목록과 상세 요청 사이에 자정이 지나면 하루 어긋나므로 시계를 고정한다(리뷰 관찰 3).
    // Date 만 가짜로 두어 MSW 의 다른 타이머는 그대로 돈다
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T23:59:59.000+09:00'));
    const rows = await rowsOf(`${PRODUCTION_ENDPOINTS.MES_LIST}?size=50`);
    expect(rows).toHaveLength(50);
    const keys = ['mesId', 'mesNumber', 'productId', 'productName', 'quantity', 'uomName'];
    for (const row of rows) {
      const detail = await recordOf(`${PRODUCTION_ENDPOINTS.MES_LIST}/${str(row.mesId)}`);
      expect(pick(detail, keys)).toEqual(pick(row, keys));
      // 상세의 시작 전 값은 PENDING(공통 상태 글자), 목록은 WAITING(앞 카드 결정)
      expect(detail.statusCode).toBe(row.status === 'WAITING' ? 'PENDING' : row.status);
      expect(detail.plan).toEqual({ startDate: row.startDate, dueDate: row.endDate });
      expect(detail.progressPercent).toBe(row.progressRate);
      const operations = RowsSchema.parse(detail.operations);
      expect(operations.map((operation) => operation.operationNumber)).toEqual(row.sequence);
      const sequence = z.array(z.string()).parse(row.sequence);
      expect(detail.currentOperation).toBe(sequence[num(row.currentOperation) - 1]);
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('없는 건은 404(카드 "없는 건은 404")', () => {
  it.each(Object.keys(DETAIL_PAIRS))(
    '%s: 목록에 없는 id 는 404 이고 data 가 없다',
    async (template) => {
      const { status, body } = await mockCall('GET', detailPath(template, 'nope-1'));
      expect(status).toBe(404);
      // 게이트웨이 ApiResponse.fail 은 data 가 null 이고 NON_NULL 이라 키가 빠진다(카드 근거 1)
      expect(body).toEqual({ status: 404, success: false, message: expect.any(String) });
    },
  );

  it.each(Object.entries(DETAIL_PAIRS))('%s: 목록의 기본 행 %s 는 200', async (template, id) => {
    const { status, body } = await mockCall('GET', detailPath(template, id));
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, data: expect.anything() });
  });

  // 목 상태는 로그인(Authorization)별이다. 한 로그인이 만든 행은 다른 로그인의 목록에 없다
  const MAKER = 'Bearer maker';
  const OTHER = 'Bearer other';
  it.each([
    [
      '견적',
      SALES_ENDPOINTS.NEW_ORDER,
      { items: [{ itemId: 'item-1001', quantity: 5, unitPrice: 12000 }], note: '' },
      SALES_ENDPOINTS.QUOTES_LIST,
      (data: Row) => RowsSchema.parse(data.content).map((row) => row.quotationId),
    ],
    [
      '주문(즉시 납품)',
      SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('qt-002'),
      undefined,
      SALES_ENDPOINTS.ORDERS_LIST,
      (data: Row) => RowsSchema.parse(data.content).map((row) => row.salesOrderId),
    ],
    [
      '고객',
      SALES_ENDPOINTS.CUSTOMERS_LIST,
      { companyName: '신규상사', manager: { name: '박담당', mobile: '010-1', email: 'a@b.c' } },
      SALES_ENDPOINTS.CUSTOMERS_LIST,
      (data: Row) => RowsSchema.parse(data.customers).map((row) => row.customerId),
    ],
    [
      '구매 요청',
      PURCHASE_ENDPOINTS.PURCHASE_REQUESTS,
      {
        items: [
          {
            itemName: '볼트 M8',
            quantity: 10,
            uomName: 'EA',
            expectedUnitPrice: 500,
            preferredSupplierName: '대양상사',
            dueDate: '2026-12-01',
            purpose: '보충',
          },
        ],
      },
      PURCHASE_ENDPOINTS.PURCHASE_REQUESTS,
      (data: Row) => RowsSchema.parse(data.content).map((row) => row.purchaseRequisitionId),
    ],
    [
      '공급사',
      PURCHASE_ENDPOINTS.SUPPLIER,
      {
        supplierInfo: {
          supplierName: '새 공급사',
          supplierEmail: 'hello@new-supplier.co.kr',
          supplierPhone: '031-123-4567',
          supplierBaseAddress: '경기도 화성시',
          supplierDetailAddress: null,
          category: 'MATERIAL',
          deliveryLeadTime: 7,
        },
        managerInfo: { managerName: '김담당', managerPhone: '010-2', managerEmail: 'k@n.co.kr' },
        materialList: [],
      },
      PURCHASE_ENDPOINTS.SUPPLIER,
      (data: Row) =>
        RowsSchema.parse(data.content).map((row) => field(row, 'supplierInfo').supplierId),
    ],
    [
      '교육 프로그램',
      HRM_ENDPOINTS.PROGRAM,
      {
        programName: '품질 교육',
        category: 'QUALITY',
        trainingHour: 8,
        isOnline: false,
        startDate: '2026-12-01',
        capacity: 20,
        requiredDepartments: [],
        requiredPositions: [],
        description: '',
      },
      HRM_ENDPOINTS.PROGRAM,
      (data: Row) => RowsSchema.parse(data.content).map((row) => row.programId),
    ],
    [
      '창고',
      WAREHOUSE_ENDPOINTS.ADD_WAREHOUSE,
      {
        warehouseName: '3공장 창고',
        warehouseType: 'RAW',
        location: '부산',
        managerId: 'mgr-001',
        note: '',
      },
      WAREHOUSE_ENDPOINTS.WAREHOUSE_LIST,
      (data: Row) => RowsSchema.parse(data.content).map((row) => row.warehouseId),
    ],
    [
      'BOM',
      PRODUCTION_ENDPOINTS.BOMS,
      { productName: '펌프 B', unit: 'EA', items: [] },
      PRODUCTION_ENDPOINTS.BOMS,
      (data: Row) => RowsSchema.parse(data.content).map((row) => row.bomId),
    ],
  ])(
    '%s: 만든 로그인에서는 새 행의 상세가 200, 다른 로그인에서는 404',
    async (_, createUrl, body, listUrl, idsOf) => {
      // 마스터 목록은 새 행이 끝에 붙어 첫 쪽 밖이라 전부 받는다
      const before = idsOf(await recordOf(allOf(listUrl)));
      await mockApi('POST', rel(createUrl), { body, auth: MAKER });
      const listed = z
        .object({ data: RecordSchema })
        .parse(await mockApi('GET', rel(allOf(listUrl)), { auth: MAKER })).data;
      const [created] = idsOf(listed).filter((id) => !before.includes(id));
      const detail = `${rel(listUrl)}/${str(created)}`;
      expect((await mockCall('GET', detail, { auth: MAKER })).status).toBe(200);
      expect((await mockCall('GET', detail, { auth: OTHER })).status).toBe(404);
    },
  );
});

describe('목록에서 밀려난 행과 없는 id 에 보낸 쓰기(리뷰 A2, A3)', () => {
  it('목록에 없는 견적 id 에 검토 요청을 보내도 그 상세는 404 다(쓰기가 없는 건을 만들지 않는다)', async () => {
    await post(SALES_ENDPOINTS.QUOTE_CONFIRM, { quotationId: 'nope-9' });
    expect((await mockCall('GET', `${rel(SALES_ENDPOINTS.QUOTES_LIST)}/nope-9`)).status).toBe(404);
  });

  it('견적을 51건 만들어 첫 새 견적이 목록에서 밀려나면 그 상세는 404 다', async () => {
    for (let i = 1; i <= 51; i++)
      await post(SALES_ENDPOINTS.NEW_ORDER, {
        items: [{ itemId: 'item-1001', quantity: i, unitPrice: 12000 }],
        note: '',
      });
    // 첫 새 견적은 기본 16건 다음 번호
    const ids = (await rowsOf(allOf(SALES_ENDPOINTS.QUOTES_LIST))).map((row) => row.quotationId);
    expect(ids).toHaveLength(16 + 50);
    expect(ids).not.toContain('qt-017');
    expect((await mockCall('GET', `${rel(SALES_ENDPOINTS.QUOTES_LIST)}/qt-017`)).status).toBe(404);
  });

  it('구매 요청을 51건 만들어 첫 새 요청이 밀려나면 그 상세는 404 다', async () => {
    for (let i = 1; i <= 51; i++)
      await post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, {
        items: [
          {
            itemName: '볼트 M8',
            quantity: i,
            uomName: 'EA',
            expectedUnitPrice: 500,
            preferredSupplierName: '대양상사',
            dueDate: '2026-12-01',
            purpose: '보충',
          },
        ],
      });
    // 첫 새 요청은 기본 15건 다음 번호
    const ids = (await rowsOf(allOf(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS))).map(
      (row) => row.purchaseRequisitionId,
    );
    expect(ids).toHaveLength(15 + 50);
    expect(ids).not.toContain('pr-016');
    const detail = `${rel(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS)}/pr-016`;
    expect((await mockCall('GET', detail)).status).toBe(404);
  });
});

describe('같은 품목과 거래처는 응답끼리 같은 값이다', () => {
  const ITEM_DETAIL = (id: string) =>
    `${INVENTORY_ENDPOINTS.INVENTORY_LIST.replace('inventory-items', 'items')}/${id}`;
  const warehouseRows = () =>
    rowsOf(`${INVENTORY_ENDPOINTS.INVENTORY_LIST}?type=WAREHOUSE_NAME&keyword=1공장 창고&size=20`);

  it('모터 A(item-1001) 단가는 어디서나 12,000원', async () => {
    const prices: Array<[string, unknown]> = [];
    const motor = (rows: Row[]) => rows.filter((row) => row.itemName === '모터 A');
    for (const row of motor(await rowsOf(INVENTORY_ENDPOINTS.INVENTORY_LIST)))
      prices.push(['재고 목록', row.unitPrice]);
    prices.push(['재고 상세', (await recordOf(ITEM_DETAIL('item-1001'))).unitPrice]);
    for (const row of motor(await warehouseRows())) prices.push(['창고별 조회', row.unitPrice]);
    for (const row of motor(
      RowsSchema.parse((await recordOf(SALES_ENDPOINTS.NEW_QUOTE_ITEM_TOGGLE)).products),
    ))
      prices.push(['견적 품목 선택', row.unitPrice]);
    for (const quote of await rowsOf(SALES_ENDPOINTS.QUOTES_LIST)) {
      const detail = await recordOf(`${SALES_ENDPOINTS.QUOTES_LIST}/${str(quote.quotationId)}`);
      for (const row of motor(RowsSchema.parse(detail.items)))
        prices.push([`견적 ${str(quote.quotationId)}`, row.unitPrice]);
    }
    const order = await recordOf(`${SALES_ENDPOINTS.ORDERS_LIST}/so-001`);
    for (const row of motor(RowsSchema.parse(order.items))) prices.push(['주문', row.unitPrice]);
    const ar = await recordOf(`${FINANCE_ENDPOINTS.SALES_INVOICES_LIST}/inv-ar-001`);
    for (const row of motor(RowsSchema.parse(ar.items))) prices.push(['매출 전표', row.unitPrice]);
    prices.push([
      '제품 상세',
      (await recordOf(`${PRODUCTION_ENDPOINTS.PRODUCTS}/prod-001`)).unitPrice,
    ]);
    for (const row of motor(RowsSchema.parse(await dataOf(INVENTORY_ENDPOINTS.ITEM_TOGGLE))))
      prices.push(['재고 품목 선택', row.unitPrice]);

    expect(prices.length).toBeGreaterThan(9);
    expect(prices.filter(([, price]) => price !== 12000)).toEqual([]);
  });

  it('모터 A, 베어링 B 의 수량과 단가가 재고 목록, 상세, 창고별 조회, 안전재고에서 같다', async () => {
    const values = (row: Row) => pick(row, ['itemId', 'currentStock', 'safetyStock', 'unitPrice']);
    const motorDetail = values(await recordOf(ITEM_DETAIL('item-1001')));
    const bearingDetail = values(await recordOf(ITEM_DETAIL('item-1002')));
    expect(bearingDetail).toEqual({
      itemId: 'item-1002',
      currentStock: 20,
      safetyStock: 50,
      unitPrice: 8000,
    });

    const byName = (rows: Row[], name: string) => rows.find((row) => row.itemName === name);
    const warehouse = await warehouseRows();
    expect(values(byName(warehouse, '모터 A') ?? {})).toEqual(motorDetail);
    expect(values(byName(warehouse, '베어링 B') ?? {})).toEqual(bearingDetail);
    expect(
      values(byName(await rowsOf(INVENTORY_ENDPOINTS.INVENTORY_LIST), '모터 A') ?? {}),
    ).toEqual(motorDetail);
    expect(
      values(byName(await rowsOf(LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST), '베어링 B') ?? {}),
    ).toEqual(bearingDetail);
    const preview = byName(await rowsOf(INVENTORY_ENDPOINTS.LOW_STOCK), '베어링 B') ?? {};
    expect(pick(preview, ['itemId', 'currentStock', 'safetyStock'])).toEqual(
      pick(bearingDetail, ['itemId', 'currentStock', 'safetyStock']),
    );
  });

  it('재고 추이의 마지막 점은 그 품목의 현재고다', async () => {
    for (const itemId of ['item-1001', 'item-1002']) {
      const detail = await recordOf(ITEM_DETAIL(itemId));
      const history = await recordOf(`${ITEM_DETAIL(itemId)}/stock-history`);
      expect(RowsSchema.parse(history.points).at(-1)?.stock).toBe(detail.currentStock);
      expect(history.safetyStock).toBe(detail.safetyStock);
    }
  });

  it('BOM 구성품의 베어링 B 는 item-1002, ITM-1002, 단가 8,000원이다', async () => {
    const detail = await recordOf(`${PRODUCTION_ENDPOINTS.BOMS}/bom-001`);
    const component = RowsSchema.parse(detail.components).find((row) => row.name === '베어링 B');
    expect(pick(component ?? {}, ['itemId', 'code'])).toEqual({
      itemId: 'item-1002',
      code: 'ITM-1002',
    });
    const node = RowsSchema.parse(detail.levelStructure).find((row) => row.name === '베어링 B');
    expect(pick(node ?? {}, ['code', 'unitCost'])).toEqual({ code: 'ITM-1002', unitCost: 8000 });
  });

  it('대양상사 담당자 연락처가 발주 상세와 공급사 상세에서 같다', async () => {
    const supplier = await recordOf(`${PURCHASE_ENDPOINTS.SUPPLIER}/sup-001`);
    const manager = field(supplier, 'managerInfo');
    const order = await recordOf(`${PURCHASE_ENDPOINTS.PURCHASE_ORDERS}/po-001`);
    expect(order.supplierName).toBe(field(supplier, 'supplierInfo').supplierName);
    expect(pick(order, ['managerPhone', 'managerEmail'])).toEqual({
      managerPhone: manager.managerPhone,
      managerEmail: manager.managerEmail,
    });
  });

  it('입고 대기 목록의 발주는 발주 목록의 같은 발주와 날짜, 금액, 공급사가 같다', async () => {
    // 예전엔 입고 대기가 대기(PENDING) 발주 PO-2026-001 한 줄이었다. 이제 배송중 발주 전부다(카드 "데모 목록 재고 물류")
    const orders = await rowsOf(allOf(PURCHASE_ENDPOINTS.PURCHASE_ORDERS));
    const pendingRows = await rowsOf(allOf(INVENTORY_ENDPOINTS.PENDING_LIST));
    expect(pendingRows.length).toBeGreaterThan(0);
    for (const pending of pendingRows) {
      const order = orders.find((row) => row.purchaseOrderId === pending.purchaseOrderId) ?? {};
      expect(pick(pending, ['purchaseOrderNumber', 'orderDate', 'dueDate', 'totalAmount'])).toEqual(
        pick(order, ['purchaseOrderNumber', 'orderDate', 'dueDate', 'totalAmount']),
      );
      expect(pending.supplierCompanyName).toBe(order.supplierName);
      expect(order.statusCode).toBe('DELIVERING');
    }
  });
});

describe('MES 진행률 = 끝난 공정 / 전체 공정', () => {
  const MES = PRODUCTION_ENDPOINTS.MES_LIST;
  const listRow = async (mesId: string) =>
    (await rowsOf(`${MES}?size=50`)).find((row) => row.mesId === mesId) ?? {};

  it('모든 행의 진행률이 상세 공정 상태에서 나온다', async () => {
    for (const row of await rowsOf(`${MES}?size=50`)) {
      const operations = RowsSchema.parse((await recordOf(`${MES}/${str(row.mesId)}`)).operations);
      const done = operations.filter((operation) => operation.statusCode === 'COMPLETED').length;
      expect(row.progressRate).toBe(Math.round((done / operations.length) * 100));
    }
  });

  it('대기 MES 를 시작한 직후는 0, 첫 공정을 끝내면 50 이다(목록과 상세 같은 값)', async () => {
    await put(`${MES}/mes-002/start`);
    expect((await listRow('mes-002')).progressRate).toBe(0);
    expect((await recordOf(`${MES}/mes-002`)).progressPercent).toBe(0);

    await put(`${MES}/mes-002/operations/op-001/start`);
    await put(`${MES}/mes-002/operations/op-001/complete`);
    expect((await listRow('mes-002')).progressRate).toBe(50);
    expect((await recordOf(`${MES}/mes-002`)).progressPercent).toBe(50);
    expect((await listRow('mes-002')).currentOperation).toBe(2);
  });
});

describe('매출 분석은 요청 기간을 따른다', () => {
  const analytics = (start: string, end: string) =>
    recordOf(`${SALES_ENDPOINTS.ANALYTICS}?startDate=${start}&endDate=${end}`);

  /** 기간의 날짜가 걸치는 주(월요일 시작) 수 */
  const weeksIn = (start: string, end: string) => {
    const mondays = new Set<string>();
    for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`);) {
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      mondays.add(monday.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return mondays.size;
  };

  it.each([
    ['2026-06-12', '2026-11-12'],
    ['2026-03-01', '2026-03-31'],
    ['2025-12-29', '2026-01-04'],
  ])('%s ~ %s 는 그 기간의 주마다 한 점이고 첫 점이 시작일의 달이다', async (start, end) => {
    const data = await analytics(start, end);
    const trend = RowsSchema.parse(data.trend);
    expect(trend).toHaveLength(weeksIn(start, end));
    expect(field(data, 'period')).toMatchObject({ start, end, weekCount: trend.length });
    expect([trend[0].year, trend[0].month]).toEqual([
      Number(start.slice(0, 4)),
      Number(start.slice(5, 7)),
    ]);
  });

  it('시작일이 종료일보다 늦으면 같은 주여도 점이 없고 비중과 고객도 비어 있다(리뷰 A1)', async () => {
    const data = await analytics('2026-11-12', '2026-11-11');
    expect(data.trend).toEqual([]);
    expect(data.productShare).toEqual([]);
    expect(data.topCustomers).toEqual([]);
    expect(field(data, 'period').weekCount).toBe(0);
  });

  it('같은 요청은 늘 같은 값이고 다른 기간은 다른 값이다', async () => {
    const a = await analytics('2026-06-12', '2026-11-12');
    expect(await analytics('2026-06-12', '2026-11-12')).toEqual(a);
    expect(await analytics('2026-03-01', '2026-03-31')).not.toEqual(a);
  });

  it('제품 비중 합은 100 이고, 제품과 고객의 금액 합이 추이 매출 합과 같다', async () => {
    const data = await analytics('2026-06-12', '2026-11-12');
    const trend = RowsSchema.parse(data.trend);
    const total = trend.reduce((sum, point) => sum + num(point.sale), 0);
    const orders = trend.reduce((sum, point) => sum + num(point.orderCount), 0);
    expect(total).toBeGreaterThan(100_000_000);

    const shares = RowsSchema.parse(data.productShare);
    expect(shares.length).toBeGreaterThan(1);
    expect(shares.reduce((sum, share) => sum + num(share.saleShare), 0)).toBe(100);
    expect(shares.reduce((sum, share) => sum + num(share.sale), 0)).toBe(total);
    for (const share of shares) expect(Number.isInteger(share.saleShare)).toBe(true);

    const customers = RowsSchema.parse(data.topCustomers);
    expect(customers.reduce((sum, customer) => sum + num(customer.sale), 0)).toBe(total);
    expect(customers.reduce((sum, customer) => sum + num(customer.orderCount), 0)).toBe(orders);

    const sales = trend.map((point) => num(point.sale));
    const counts = trend.map((point) => num(point.orderCount));
    expect(data.trendScale).toEqual({
      sale: { min: Math.min(...sales), max: Math.max(...sales) },
      orderCount: { min: Math.min(...counts), max: Math.max(...counts) },
    });
  });
});

describe('통계 띠', () => {
  const STATS = {
    영업: SALES_ENDPOINTS.STATS,
    영업고객: SALES_ENDPOINTS.CSUTOMER_STATISTICS,
    재무: FINANCE_ENDPOINTS.STATISTICS,
    재무고객: FINANCE_ENDPOINTS.CUSTOMER_STATISTICS,
    재무공급사: FINANCE_ENDPOINTS.SUPPLIER_STATISTICS,
    대시보드: DASHBOARD_ENDPOINTS.STATS,
    재고: INVENTORY_ENDPOINTS.STATS,
    안전재고: LOWSTOCK_ENDPOINTS.STATS,
    창고: WAREHOUSE_ENDPOINTS.STATS,
    구매: PURCHASE_ENDPOINTS.STATISTICS,
    공급사발주: PURCHASE_ENDPOINTS.SUPPLIER_ORDERS_STATISTICS,
    생산: PRODUCTION_ENDPOINTS.STATISTICS,
    인사: HRM_ENDPOINTS.STATISTICS,
  };
  const StatSchema = z.object({
    value: z.number(),
    delta_rate: z.number(),
    trend: z.array(z.number()),
  });
  const StatsSchema = z.record(z.string(), z.record(z.string(), StatSchema));
  const statsOf = async (url: string) => StatsSchema.parse(await dataOf(url));
  const week = async (url: string, metric: string) => (await statsOf(url)).week[metric].value;
  const total = async (url: string) => num(field(await recordOf(url), 'page').totalElements);

  it.each(Object.entries(STATS))(
    '%s: 추이 마지막 점이 값이고 첫 점 대비 증감이 delta_rate 다. 1,200 은 없다',
    async (_, url) => {
      const stats = await statsOf(url);
      const deltas = new Set<number>();
      let large = false;
      for (const [period, metrics] of Object.entries(stats)) {
        for (const [name, stat] of Object.entries(metrics)) {
          large ||= stat.value >= 10;
          const at = `${period}.${name}`;
          expect(stat.value, at).not.toBe(1200);
          expect(stat.trend.at(-1), at).toBe(stat.value);
          const first = stat.trend[0];
          const expected = first === 0 ? 0 : (stat.value - first) / first;
          expect(Math.abs(stat.delta_rate - expected), at).toBeLessThan(0.001);
          deltas.add(stat.delta_rate);
        }
      }
      // 기간마다 증감률이 다르다. 창고 1곳처럼 작은 정수만 있으면 증감이 0 일 수밖에 없어 뺀다
      if (large) expect(deltas.size).toBeGreaterThan(1);
    },
  );

  /**
   * 건수 지표의 주 값 = 그 로그인의 지금 목록 총 건수. 신규 주문만 이번 주(월요일~오늘) 주문 수다
   * (카드 "데모 데이터 채우기" 결정 5, 매출 분석의 이번 주 점과 같은 값)
   */
  const expectCountsMatchLists = async () => {
    const today = todayKey();
    expect(await week(SALES_ENDPOINTS.STATS, 'new_orders_count')).toBe(
      await total(`${SALES_ENDPOINTS.ORDERS_LIST}?startDate=${mondayOf(today)}&endDate=${today}`),
    );
    expect(await week(SALES_ENDPOINTS.CSUTOMER_STATISTICS, 'quotation_count')).toBe(
      await total(SALES_ENDPOINTS.QUOTES_LIST),
    );
    expect(await week(PURCHASE_ENDPOINTS.STATISTICS, 'purchaseRequestCount')).toBe(
      await total(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS),
    );
    expect(await week(PURCHASE_ENDPOINTS.SUPPLIER_ORDERS_STATISTICS, 'orderCount')).toBe(
      await total(PURCHASE_ENDPOINTS.PURCHASE_ORDERS),
    );
    expect(await week(PRODUCTION_ENDPOINTS.STATISTICS, 'bom_count')).toBe(
      await total(PRODUCTION_ENDPOINTS.BOMS),
    );
    const mes = await rowsOf(`${PRODUCTION_ENDPOINTS.MES_LIST}?size=50`);
    expect(await week(PRODUCTION_ENDPOINTS.STATISTICS, 'production_in')).toBe(
      mes.filter((row) => row.status === 'IN_PROGRESS').length,
    );
    expect(await week(WAREHOUSE_ENDPOINTS.STATS, 'total_warehouse')).toBe(
      await total(WAREHOUSE_ENDPOINTS.WAREHOUSE_LIST),
    );
    expect(await week(LOWSTOCK_ENDPOINTS.STATS, 'total_emergency')).toBe(
      (await rowsOf(LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST)).filter((row) => row.statusCode === 'URGENT')
        .length,
    );
    expect(await week(INVENTORY_ENDPOINTS.STATS, 'store_complete')).toBe(
      await total(INVENTORY_ENDPOINTS.RECEIVED_LIST),
    );
    expect(await week(INVENTORY_ENDPOINTS.STATS, 'store_pending')).toBe(
      await total(INVENTORY_ENDPOINTS.PENDING_LIST),
    );
    expect(await week(INVENTORY_ENDPOINTS.STATS, 'delivery_pending')).toBe(
      await total(INVENTORY_ENDPOINTS.READY_TO_SHIP_LIST),
    );
  };

  it('건수 지표의 주 값은 그 목록의 총 건수다', async () => {
    await expectCountsMatchLists();
  });

  it('쓰기(생성, 시작, 배송) 뒤에도 건수 지표의 주 값은 그 로그인의 목록 총 건수다(리뷰 관찰 1)', async () => {
    const ordersThisWeek = await week(SALES_ENDPOINTS.STATS, 'new_orders_count');
    const readyBefore = await week(INVENTORY_ENDPOINTS.STATS, 'delivery_pending');
    await post(SALES_ENDPOINTS.NEW_ORDER, {
      items: [{ itemId: 'item-1001', quantity: 5, unitPrice: 12000 }],
      note: '',
    });
    await post(SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('qt-002'));
    await post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, {
      items: [
        {
          itemName: '볼트 M8',
          quantity: 10,
          uomName: 'EA',
          expectedUnitPrice: 500,
          preferredSupplierName: '대양상사',
          dueDate: '2026-12-01',
          purpose: '보충',
        },
      ],
    });
    await post(WAREHOUSE_ENDPOINTS.ADD_WAREHOUSE, {
      warehouseName: '3공장 창고',
      warehouseType: 'RAW',
      location: '부산',
      managerId: 'mgr-001',
      note: '',
    });
    await post(PRODUCTION_ENDPOINTS.BOMS, { productName: '펌프 B', unit: 'EA', items: [] });
    await put(`${PRODUCTION_ENDPOINTS.MES_LIST}/mes-002/start`);
    await patch(`${INVENTORY_ENDPOINTS.PRODUCTION_LIST.replace('/production', '')}/so-002/status`, {
      itemIds: ['item-1002'],
    });
    // 기본 견적 16건 + 1, 이번 주 주문 + 즉시 납품 1
    expect(await week(SALES_ENDPOINTS.CSUTOMER_STATISTICS, 'quotation_count')).toBe(17);
    expect(await week(SALES_ENDPOINTS.STATS, 'new_orders_count')).toBe(ordersThisWeek + 1);
    // 출고 준비는 영업 주문의 출고 준비 전부다. 즉시 납품 주문 하나가 들고 배송을 시작한 so-002 가 빠진다
    expect(await week(INVENTORY_ENDPOINTS.STATS, 'delivery_pending')).toBe(readyBefore + 1 - 1);
    await expectCountsMatchLists();
  });

  it('직원 수는 근태 집계의 인원이다(카드 결정 4)', async () => {
    const summary = await recordOf(HRM_ENDPOINTS.ATTENDANCE_DAILY_SUMMARY);
    const headcount = RowsSchema.parse(summary.days)[0].headcount;
    for (const period of ['week', 'month', 'quarter', 'year']) {
      expect((await statsOf(HRM_ENDPOINTS.STATISTICS))[period].totalEmployeeCount.value).toBe(
        headcount,
      );
      expect((await statsOf(DASHBOARD_ENDPOINTS.STATS))[period].total_employees.value).toBe(
        headcount,
      );
    }
  });

  it('매출, 매입, 순이익은 재무 월별 손익의 이번 달 값이고 재무, 대시보드, 영업, 구매가 같다', async () => {
    const months = financeMonthlyPoints();
    const month = months[months.length - 1];
    const finance = (await statsOf(FINANCE_ENDPOINTS.STATISTICS)).month;
    expect(finance.total_sales.value).toBe(month.sales);
    expect(finance.total_purchases.value).toBe(month.purchases);
    expect(finance.net_profit.value).toBe(month.netProfit);
    const dashboard = (await statsOf(DASHBOARD_ENDPOINTS.STATS)).month;
    expect(dashboard.total_sales.value).toBe(month.sales);
    expect(dashboard.total_purchases.value).toBe(month.purchases);
    expect(dashboard.net_profit.value).toBe(month.netProfit);
    expect((await statsOf(SALES_ENDPOINTS.STATS)).month.sales_amount.value).toBe(month.sales);
    expect((await statsOf(PURCHASE_ENDPOINTS.STATISTICS)).month.purchaseOrderAmount.value).toBe(
      month.purchases,
    );
    // 연은 12달 합, 분기는 최근 3달 합
    const sum = (list: typeof months) => list.reduce((acc, m) => acc + m.sales, 0);
    expect((await statsOf(FINANCE_ENDPOINTS.STATISTICS)).year.total_sales.value).toBe(sum(months));
    expect((await statsOf(FINANCE_ENDPOINTS.STATISTICS)).quarter.total_sales.value).toBe(
      sum(months.slice(-3)),
    );
  });

  it('재고 금액은 재고 목록 금액 합이다', async () => {
    // 목록은 품목표 14개라 2쪽이다. 통계는 목록 전부의 합
    const rows = await rowsOf(allOf(INVENTORY_ENDPOINTS.INVENTORY_LIST));
    expect(rows).toHaveLength(14);
    expect(await week(INVENTORY_ENDPOINTS.STATS, 'total_stock')).toBe(
      rows.reduce((sum, row) => sum + num(row.totalAmount), 0),
    );
  });
});
