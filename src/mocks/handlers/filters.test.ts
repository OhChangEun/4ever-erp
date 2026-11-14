// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi } from '@/test/mockApi';

/**
 * 카드 "목 필터와 검색". 목록 핸들러가 화면이 보내는 필터와 검색을 실제로 거르는지 본다.
 * 기대 값은 같은 목록을 필터 없이 받은 뒤 테스트가 직접 고른 행이다. 거른 행, 순서, 총 건수가 같아야 하고
 * 필터가 무엇인가를 바꿔야 한다(전부 남거나 그대로면 목이 무시한 것). 테스트끼리는 vitest.setup.ts 가 목 상태를 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const PageSchema = z.object({ totalElements: z.number() });
const Scalar = z.union([z.string(), z.number(), z.boolean()]).transform(String);

const get = async (path: string): Promise<Row> =>
  RecordSchema.parse(z.object({ data: z.unknown() }).parse(await mockApi('GET', path)).data);
const post = (path: string, body?: unknown) => mockApi('POST', path, { body });
const withQuery = (path: string, query: string) =>
  query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
/** 한 쪽으로 받은 행과 총 건수. size 는 넉넉히(가장 긴 목록이 수백 행) */
const listOf = async (path: string, key: string, size: number) => {
  const data = await get(withQuery(path, `page=0&size=${size}`));
  return { rows: RowsSchema.parse(data[key]), total: PageSchema.parse(data.page).totalElements };
};
/** 행의 칸 하나를 글자로. 점으로 안쪽 칸을 찾는다 */
const at = (row: unknown, path: string): string => {
  let value: unknown = row;
  for (const key of path.split('.')) value = RecordSchema.parse(value)[key];
  return Scalar.parse(value);
};
const eq = (path: string, value: string) => (row: Row) => at(row, path) === value;
const has = (path: string, keyword: string) => (row: Row) =>
  at(row, path).toLowerCase().includes(keyword.toLowerCase());
const between = (path: string, from: string, to: string) => (row: Row) =>
  at(row, path).slice(0, 10) >= from && at(row, path).slice(0, 10) <= to;

/** 시계를 2026-11-13(금) 한국 12시로 고정한다(seed.test.ts 와 같다) */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T03:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const Q = '/business/sd/quotations';
const SO = '/business/sd/orders';
const CUS = '/business/sd/customers';
const PR = '/scm-pp/mm/purchase-requisitions';
const PO = '/scm-pp/mm/purchase-orders';
const SUP = '/scm-pp/mm/supplier';
const EMP = '/business/hrm/employee';
const PAY = '/business/hrm/payroll?year=2026&month=11';
const TRAIN = '/business/hrm/training-status';
const TIME = '/business/hrm/time-record?date=2026-11-13';
const LEAVE = '/business/hrm/leave-request';
const PQ = '/scm-pp/pp/quotations';
const MRP = '/scm-pp/pp/quotations/mrp';
const RUN = '/scm-pp/pp/mrp/runs';
const MES = '/scm-pp/pp/mes';
const INV = '/scm-pp/iv/inventory-items';
const LOW = '/scm-pp/iv/shortage';
const RECEIVED = '/scm-pp/purchase-orders/received';
const AP = '/business/fcm/invoice/ap';
const AR = '/business/fcm/invoice/ar';

/** [이름, 경로, 필터 쿼리, 남아야 하는 행, 행 배열 칸] */
type Case = [string, string, string, (row: Row) => boolean, string?];
const CASES: Case[] = [
  ['영업 견적 상태', Q, 'status=REVIEW', eq('statusCode', 'REVIEW')],
  ['영업 견적 고객 검색', Q, 'type=customerName&keyword=한빛', has('customerName', '한빛')],
  [
    '영업 견적 번호 검색(소문자)',
    Q,
    'type=quotationNumber&keyword=qt-2026-01',
    has('quotationNumber', 'QT-2026-01'),
  ],
  ['영업 견적 담당자 검색', Q, 'type=managerName&keyword=이영업', has('managerName', '이영업')],
  [
    '영업 견적 날짜',
    Q,
    'startDate=2026-10-01&endDate=2026-10-31',
    between('quotationDate', '2026-10-01', '2026-10-31'),
  ],
  ['영업 주문 상태', SO, 'status=DELIVERING', eq('statusCode', 'DELIVERING')],
  ['영업 주문 고객 검색', SO, 'type=customerName&keyword=세광', has('customerName', '세광')],
  [
    '영업 주문 담당자 검색',
    SO,
    'type=managerName&keyword=정서연',
    has('manager.managerName', '정서연'),
  ],
  [
    '영업 주문 번호 검색(소문자)',
    SO,
    'type=salesOrderNumber&keyword=so-2026-01',
    has('salesOrderNumber', 'SO-2026-01'),
  ],
  ['고객 상태', CUS, 'status=INACTIVE', eq('statusCode', 'INACTIVE'), 'customers'],
  [
    '고객 이름 검색',
    CUS,
    'type=customerName&keyword=전자',
    has('customerName', '전자'),
    'customers',
  ],
  [
    '고객 번호 검색(소문자)',
    CUS,
    'type=customerNumber&keyword=cus-01',
    has('customerNumber', 'CUS-01'),
    'customers',
  ],
  [
    '고객 담당자 검색',
    CUS,
    'type=managerName&keyword=정서연',
    has('manager.managerName', '정서연'),
    'customers',
  ],
  ['구매 요청 상태', PR, 'statusCode=APPROVAL', eq('statusCode', 'APPROVAL')],
  ['구매 요청 요청자 검색', PR, 'type=REQUESTER&keyword=윤지', has('requesterName', '윤지')],
  [
    '구매 요청 번호 검색(소문자)',
    PR,
    'type=NUMBER&keyword=pr-2026-01',
    has('purchaseRequisitionNumber', 'PR-2026-01'),
  ],
  [
    '구매 요청 날짜',
    PR,
    'startDate=2026-10-10&endDate=2026-10-20',
    between('requestDate', '2026-10-10', '2026-10-20'),
  ],
  ['발주 상태', PO, 'statusCode=DELIVERED', eq('statusCode', 'DELIVERED')],
  ['발주 공급사 검색', PO, 'type=SUPPLIER&keyword=한성', has('supplierName', '한성')],
  [
    '발주 번호 검색(소문자)',
    PO,
    'type=NUMBER&keyword=po-2026-00',
    has('purchaseOrderNumber', 'PO-2026-00'),
  ],
  [
    '발주 날짜',
    PO,
    'startDate=2026-10-10&endDate=2026-10-31',
    between('orderDate', '2026-10-10', '2026-10-31'),
  ],
  ['공급사 분류', SUP, 'category=PARTS', eq('supplierInfo.category', 'PARTS')],
  ['공급사 상태', SUP, 'statusCode=INACTIVE', eq('supplierInfo.supplierStatusCode', 'INACTIVE')],
  ['공급사 이름 검색', SUP, 'type=NAME&keyword=금속', has('supplierInfo.supplierName', '금속')],
  [
    '공급사 번호 검색(소문자)',
    SUP,
    'type=NUMBER&keyword=sup-003',
    has('supplierInfo.supplierNumber', 'SUP-003'),
  ],
  ['직원 부서', EMP, 'departmentId=dept-002', eq('department', '구매팀')],
  ['직원 이름', EMP, 'name=지', has('name', '지')],
  ['급여 부서', PAY, 'department=dept-002', eq('employee.department', '구매팀')],
  ['급여 상태', PAY, 'statusCode=PAYROLL_PAID', eq('pay.statusCode', 'PAYROLL_PAID')],
  ['급여 이름', PAY, 'name=윤지호', has('employee.employeeName', '윤지호')],
  ['교육 현황 부서', TRAIN, 'department=dept-002', eq('department', '구매팀'), 'items'],
  ['교육 현황 이름', TRAIN, 'name=윤지호', has('name', '윤지호'), 'items'],
  ['출퇴근 부서', TIME, 'department=dept-002', eq('employee.department', '구매팀')],
  ['출퇴근 상태', TIME, 'statusCode=LATE', eq('statusCode', 'LATE')],
  ['출퇴근 이름', TIME, 'name=윤지호', has('employee.employeeName', '윤지호')],
  ['휴가 부서', LEAVE, 'department=dept-002', eq('employee.department', '구매팀')],
  ['휴가 이름', LEAVE, 'name=윤지호', has('employee.employeeName', '윤지호')],
  ['생산 견적 가용 상태', PQ, 'availableStatusCode=CHECKED', eq('availableStatus', 'CHECKED')],
  [
    '생산 견적 날짜',
    PQ,
    'startDate=2026-10-01&endDate=2026-10-31',
    between('requestDate', '2026-10-01', '2026-10-31'),
  ],
  ['MRP 순소요 견적', MRP, 'quotationId=qt-003', eq('quotationId', 'qt-003')],
  [
    'MRP 순소요 가용 상태',
    MRP,
    'availableStatusCode=INSUFFICIENT',
    eq('availableStatusCode', 'INSUFFICIENT'),
  ],
  ['계획 주문 상태', RUN, 'status=APPROVED', eq('status', 'APPROVED')],
  ['계획 주문 견적', RUN, 'quotationId=qt-001', eq('quotationNumber', 'QT-2026-001')],
  ['MES 상태', MES, 'status=WAITING', eq('status', 'WAITING')],
  ['MES 견적', MES, 'quotationId=qt-002', eq('quotationId', 'qt-002')],
  ['재고 상태', INV, 'statusCode=URGENT', eq('statusCode', 'URGENT')],
  ['재고 품목 검색', INV, 'type=ITEM_NAME&keyword=베어링', has('itemName', '베어링')],
  ['재고 창고 검색(부분)', INV, 'type=WAREHOUSE_NAME&keyword=2공장', has('warehouseName', '2공장')],
  ['안전재고 상태', LOW, 'statusCode=CAUTION', eq('statusCode', 'CAUTION')],
  // 입고 완료는 입고 완료 발주 넷(납기 10-11, 10-16, 10-16, 10-26, 카드 "데모 목록 재고 물류"). 예전 범위는 넷을 다 남긴다
  [
    '입고 완료 날짜',
    RECEIVED,
    'startDate=2026-10-12&endDate=2026-10-20',
    between('dueDate', '2026-10-12', '2026-10-20'),
  ],
  ['매입 전표 상태', AP, 'status=PAID', eq('statusCode', 'PAID')],
  ['매출 전표 상태', AR, 'status=UNPAID', eq('statusCode', 'UNPAID')],
];

const SIZE = 1000;

describe('목록 필터와 검색', () => {
  it.each(CASES)(
    '%s: 고른 행만, 총 건수는 거른 수',
    async (_, path, query, keep, key = 'content') => {
      const all = await listOf(path, key, SIZE);
      const expected = all.rows.filter(keep);
      // 필터가 무엇인가를 바꾸는 값을 골랐는지(전부 남거나 하나도 안 남는 것만 있으면 테스트가 잘못됐다)
      expect(expected.length).not.toBe(all.rows.length);
      const filtered = await listOf(withQuery(path, query), key, SIZE);
      expect(filtered.rows).toEqual(expected);
      expect(filtered.total).toBe(expected.length);
    },
  );

  it('필터를 고르면 쪽은 거른 행에서 자른다', async () => {
    const all = (await listOf(withQuery(PR, 'statusCode=APPROVAL'), 'content', SIZE)).rows;
    const second = await listOf(withQuery(PR, 'statusCode=APPROVAL&page=1&size=2'), 'content', 2);
    // listOf 가 뒤에 붙이는 page=0 보다 앞의 page=1 이 먼저 읽힌다(URLSearchParams.get 은 첫 값)
    expect(second.rows).toEqual(all.slice(2, 4));
    expect(second.total).toBe(all.length);
  });

  it.each([
    ['영업 견적', Q, 'status=ALL&type=customerName&keyword=', 'content'],
    ['구매 요청', PR, 'statusCode=&type=&keyword=&startDate=&endDate=', 'content'],
    ['구매 요청(ALL)', PR, 'statusCode=ALL', 'content'],
    ['공급사', SUP, 'category=ALL&statusCode=ALL', 'content'],
    ['직원', EMP, 'name=', 'content'],
    ['고객', CUS, 'status=ALL', 'customers'],
    ['계획 주문', RUN, 'status=ALL&quotationId=ALL', 'content'],
  ])('%s: ALL 과 빈 값은 거르지 않는다', async (_, path, query, key) => {
    const all = await listOf(path, key, SIZE);
    const same = await listOf(withQuery(path, query), key, SIZE);
    expect(same).toEqual(all);
  });

  it('검색 타입이 비었으면 그 목록의 모든 검색 칸에서 찾는다', async () => {
    const all = (await listOf(PR, 'content', SIZE)).rows;
    const found = await listOf(withQuery(PR, 'keyword=윤지호'), 'content', SIZE);
    expect(found.rows).toEqual(all.filter(has('requesterName', '윤지호')));
    expect(found.rows.length).toBeGreaterThan(0);
  });
});

describe('쓰기 뒤의 필터', () => {
  it('승인한 구매 요청은 승인 필터에 들고 대기 필터에서 빠진다', async () => {
    const pendingBefore = (await listOf(withQuery(PR, 'statusCode=PENDING'), 'content', SIZE)).rows;
    expect(pendingBefore.map((row) => at(row, 'purchaseRequisitionId'))).toContain('pr-001');

    await post('/scm-pp/mm/purchase-requisitions/pr-001/release');

    const approved = (await listOf(withQuery(PR, 'statusCode=APPROVAL'), 'content', SIZE)).rows;
    const pending = (await listOf(withQuery(PR, 'statusCode=PENDING'), 'content', SIZE)).rows;
    expect(approved.map((row) => at(row, 'purchaseRequisitionId'))).toContain('pr-001');
    expect(pending.map((row) => at(row, 'purchaseRequisitionId'))).not.toContain('pr-001');
    expect(pending).toHaveLength(pendingBefore.length - 1);
  });

  it('새로 만든 구매 요청은 대기 필터와 오늘 날짜 범위에 든다', async () => {
    await post(PR, {
      items: [
        {
          itemName: '구리선',
          quantity: 10,
          uomName: 'EA',
          expectedUnitPrice: 1000,
          dueDate: '2026-12-01',
        },
      ],
    });
    const today = (
      await listOf(
        withQuery(PR, 'statusCode=PENDING&startDate=2026-11-13&endDate=2026-11-13'),
        'content',
        SIZE,
      )
    ).rows;
    expect(today).toHaveLength(1);
    expect(at(today[0], 'requestDate')).toBe('2026-11-13');
  });
});

describe('상태 드롭다운 코드 = 행의 상태 값', () => {
  it.each([
    ['구매 요청', '/scm-pp/mm/purchase-requisition/status/toggle', PR],
    ['발주', '/scm-pp/mm/purchase-orders/status/toggle', PO],
  ])('%s: 드롭다운의 코드마다 그 상태 행이 있다', async (_, toggle, list) => {
    const keys = z
      .object({ data: z.array(z.object({ key: z.string() })) })
      .parse(await mockApi('GET', toggle))
      .data.map((option) => option.key)
      .filter((key) => key !== 'ALL');
    const statuses = new Set(
      (await listOf(list, 'content', SIZE)).rows.map((row) => at(row, 'statusCode')),
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(statuses).toContain(key);
  });
});

describe('생산 목록의 견적, 품목, 날짜', () => {
  it('계획 주문 견적 드롭다운의 값마다 그 견적 번호 행만 온다', async () => {
    const options = z
      .object({ data: z.array(z.object({ key: z.string(), value: z.string() })) })
      .parse(await mockApi('GET', '/scm-pp/pp/mrp/runs/quotations/toggle'))
      .data.filter((option) => option.key !== 'ALL');
    for (const option of options) {
      const { rows, total } = await listOf(
        withQuery(RUN, `quotationId=${option.key}`),
        'content',
        SIZE,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(total).toBe(rows.length);
      expect(new Set(rows.map((row) => at(row, 'quotationNumber')))).toEqual(
        new Set([option.value]),
      );
    }
  });

  it('재고성 구매 요청의 품목 이름은 품목표 이름이다', async () => {
    await post('/scm-pp/mm/stock-purchase-requisitions', {
      items: [{ productId: 'item-1002', quantity: 30, mrpRunId: 'mrp-003' }],
    });
    const newest = (await listOf(PR, 'content', 1)).rows[0];
    const detail = await get(`${PR}/${at(newest, 'purchaseRequisitionId')}`);
    const items = RowsSchema.parse(detail.items);
    expect(items.map((item) => at(item, 'itemName'))).toEqual(['베어링 B']);
  });

  it.each([
    ['MRP 순소요', MRP],
    ['계획 주문', RUN],
  ])('%s: 조달 시작일은 오늘 앞뒤 한 달 안, 도착일은 시작일 뒤', async (_, path) => {
    // 수백 행이라 앞쪽 표본만 본다(테스트 하나 5초 안)
    const { rows } = await listOf(path, 'content', 60);
    const day = (key: string) => new Date(`${key}T00:00:00Z`).getTime() / 86_400_000;
    const today = day('2026-11-13');
    for (const row of rows) {
      const start = day(at(row, 'procurementStartDate'));
      const arrival = day(at(row, 'expectedArrivalDate'));
      expect(Math.abs(start - today)).toBeLessThanOrEqual(31);
      expect(arrival).toBeGreaterThan(start);
      expect(arrival - start).toBeLessThanOrEqual(31);
    }
  });

  it('MES 행의 제품과 견적 번호는 그 영업 견적의 첫 품목과 번호다', async () => {
    const { rows } = await listOf(MES, 'content', 50);
    const quotes = new Map<string, Row>();
    for (const row of rows) {
      const quotationId = at(row, 'quotationId');
      const quote = quotes.get(quotationId) ?? (await get(`${Q}/${quotationId}`));
      quotes.set(quotationId, quote);
      expect(at(row, 'quotationNumber')).toBe(at(quote, 'quotationNumber'));
      expect(at(row, 'productName')).toBe(at(RowsSchema.parse(quote.items)[0], 'itemName'));
    }
  });

  it('MPS 는 고른 BOM 의 제품을 준다', async () => {
    const mps = await get(
      '/scm-pp/pp/quotations/mps?bomId=bom-002&startDate=2026-11-13&endDate=2026-11-13',
    );
    expect(at(mps, 'bomId')).toBe('bom-002');
    expect(at(mps, 'productName')).toBe('펌프 B');
  });
});

it('창고 이름 검색은 앞뒤 공백이 있어도 그 창고의 재고(3D 용)를 준다', async () => {
  const exact = await listOf(
    withQuery(INV, `type=WAREHOUSE_NAME&keyword=${encodeURIComponent('1공장 창고')}`),
    'content',
    50,
  );
  const padded = await listOf(
    withQuery(INV, `type=WAREHOUSE_NAME&keyword=${encodeURIComponent('  1공장 창고 ')}`),
    'content',
    50,
  );
  expect(exact.total).toBeGreaterThan(1);
  expect(padded.rows).toEqual(exact.rows);
});
