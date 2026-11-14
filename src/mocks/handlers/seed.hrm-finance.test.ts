// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi, mockCall } from '@/test/mockApi';
import { HEADCOUNT, attendanceDays } from './attendanceSummary.handlers';
import { financeMonthlyPoints, monthlyMetric } from './financeAnalytics.handlers';
import { ACTIVE_SUPPLIERS, EMPLOYEES, seedOrders } from './seed';

/**
 * 카드 "데모 목록 인사 재무". 앞 카드가 남긴 한 줄 목록(매입, 매출 전표, 부서, 직급, 급여, 교육 현황, 교육 프로그램,
 * 출퇴근, 휴가)이 씨앗(직원 42명, 고객, 공급사, 주문)에서 나오고 같은 화면의 다른 숫자와 맞는지 본다.
 * 테스트끼리는 vitest.setup.ts 가 목 상태를 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const PageSchema = z.object({ totalElements: z.number(), totalPages: z.number() });

const get = async (path: string): Promise<Row> =>
  RecordSchema.parse(z.object({ data: z.unknown() }).parse(await mockApi('GET', path)).data);
const rows = async (path: string, key = 'content') => RowsSchema.parse((await get(path))[key]);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);
const field = (row: unknown, key: string) => RecordSchema.parse(RecordSchema.parse(row)[key]);
const withQuery = (path: string, query: string) =>
  `${path}${path.includes('?') ? '&' : '?'}${query}`;
const allRows = async (path: string, key = 'content') => {
  const total = PageSchema.parse((await get(withQuery(path, 'page=0&size=1'))).page).totalElements;
  return rows(withQuery(path, `page=0&size=${Math.max(total, 1)}`), key);
};
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

/** 시계를 2026-11-13(금) 한국 12시로 고정한다(seed.test.ts 와 같다) */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T03:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const HRM = '/business/hrm';
const AP = '/business/fcm/invoice/ap';
const AR = '/business/fcm/invoice/ar';
const PAY = `${HRM}/payroll?year=2026&month=11`;
const ACTIVE = EMPLOYEES.filter((employee) => employee.statusCode === 'ACTIVE');
/** 근태 집계에서 지각이 가장 많은 근무일(그날 출퇴근 목록이 두 상태를 다 가진다) */
const busyDay = () =>
  attendanceDays().days.reduce((best, day) => (day.late > best.late ? day : best));
const TIME = () => `${HRM}/time-record?date=${busyDay().date}`;

/**
 * [이름, 경로, 행 배열 칸, 상태 칸]. 급여는 한 달 안에서는 상태가 하나라(결정 4) 아래 "지난달과 이번 달" 테스트가 두 상태를 본다.
 * 교육 현황은 상태 칸이 없다
 */
const LISTS: Array<[string, () => string, string, string]> = [
  ['매입 전표', () => AP, 'content', 'statusCode'],
  ['매출 전표', () => AR, 'content', 'statusCode'],
  ['급여(이번 달)', () => PAY, 'content', ''],
  ['교육 현황', () => `${HRM}/training-status`, 'items', ''],
  ['교육 프로그램', () => `${HRM}/program`, 'content', 'statusCode'],
  ['출퇴근(지각 많은 날)', TIME, 'content', 'statusCode'],
  ['휴가', () => `${HRM}/leave-request`, 'content', 'status'],
];
const at = (row: Row, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => RecordSchema.parse(value)[key], row);

describe('목록이 2쪽 이상이고 상태가 섞인다', () => {
  it.each(LISTS)('%s: 12행 이상, 기본 크기로 2쪽, 2쪽은 1쪽과 다른 행', async (_, path, key) => {
    const first = await get(withQuery(path(), 'page=0&size=10'));
    const page = PageSchema.parse(first.page);
    expect(page.totalElements).toBeGreaterThanOrEqual(12);
    expect(page.totalPages).toBeGreaterThanOrEqual(2);
    const firstRows = RowsSchema.parse(first[key]).map((row) => JSON.stringify(row));
    const secondRows = (await rows(withQuery(path(), 'page=1&size=10'), key)).map((row) =>
      JSON.stringify(row),
    );
    expect(firstRows).toHaveLength(10);
    expect(secondRows.length).toBeGreaterThan(0);
    expect(secondRows.filter((row) => firstRows.includes(row))).toEqual([]);
  });

  it.each(LISTS.filter(([, , , status]) => status))(
    '%s: 상태 값이 2종 이상',
    async (_, path, key, status) => {
      const all = await allRows(path(), key);
      expect(new Set(all.map((row) => at(row, status))).size).toBeGreaterThanOrEqual(2);
    },
  );

  it('급여는 지난달이 지급완료, 이번 달이 미지급이고 다음 달은 아직 없다', async () => {
    const statuses = async (month: number) =>
      new Set(
        (await allRows(`${HRM}/payroll?year=2026&month=${month}`)).map((row) =>
          at(row, 'pay.statusCode'),
        ),
      );
    expect(await statuses(10)).toEqual(new Set(['PAYROLL_PAID']));
    expect(await statuses(11)).toEqual(new Set(['PAYROLL_UNPAID']));
    expect(await allRows(`${HRM}/payroll?year=2026&month=12`)).toEqual([]);
  });
});

describe('매출 전표 = 영업 주문', () => {
  it('주문마다 전표 하나. 같은 고객, 같은 금액, 참조 번호가 주문 번호, 발행일이 주문일이다', async () => {
    const orders = seedOrders().map(({ order }) => order);
    const invoices = await allRows(AR);
    expect(invoices).toHaveLength(orders.length);
    const byNumber = new Map(orders.map((order) => [order.salesOrderNumber, order]));
    for (const invoice of invoices) {
      const order = byNumber.get(str(invoice.referenceNumber));
      expect(order, str(invoice.invoiceNumber)).toBeDefined();
      expect(field(invoice, 'connection').connectionName).toBe(order?.customerName);
      expect(invoice.totalAmount).toBe(order?.totalAmount);
      expect(invoice.issueDate).toBe(order?.orderDate);
    }
  });

  it('상세 품목 줄이 그 주문의 품목 줄이다(앞 20건)', async () => {
    const lines = new Map(seedOrders().map(({ order, lines }) => [order.salesOrderNumber, lines]));
    for (const invoice of (await allRows(AR)).slice(0, 20)) {
      const detail = await get(`${AR}/${str(invoice.invoiceId)}`);
      const items = RowsSchema.parse(detail.items).map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));
      expect(items).toEqual(
        (lines.get(str(invoice.referenceNumber)) ?? []).map(({ itemId, quantity, unitPrice }) => ({
          itemId,
          quantity,
          unitPrice,
        })),
      );
    }
  });

  it('전표 월 합이 재무 월별 손익의 매출이다', async () => {
    const invoices = await allRows(AR);
    for (const point of financeMonthlyPoints()) {
      const inMonth = invoices.filter((row) => str(row.issueDate).startsWith(point.month));
      expect(sum(inMonth.map((row) => num(row.totalAmount))), point.month).toBe(point.sales);
    }
  });

  it('기본 첫 쪽에 처리할 수 있는 전표가 있다(매출은 수금 대기, 매입은 미납)', async () => {
    expect((await rows(`${AR}?page=0&size=10`)).some((row) => row.statusCode === 'PENDING')).toBe(
      true,
    );
    expect((await rows(`${AP}?page=0&size=10`)).some((row) => row.statusCode === 'UNPAID')).toBe(
      true,
    );
  });

  it('so-001 의 전표 inv-ar-001(AR-2026-001)은 예전처럼 한빛전자이고 수금 대기다', async () => {
    expect(await get(`${AR}/inv-ar-001`)).toMatchObject({
      invoiceNumber: 'AR-2026-001',
      name: '한빛전자',
      statusCode: 'PENDING',
      referenceNumber: 'SO-2026-001',
    });
  });
});

describe('매입 전표 = 공급사와 월별 매입', () => {
  it('공급사는 공급사 목록의 활성 공급사이고, 월 합이 재무 월별 손익의 매입이다', async () => {
    const invoices = await allRows(AP);
    const active = new Map(
      ACTIVE_SUPPLIERS.map(({ supplierInfo }) => [supplierInfo.supplierId, supplierInfo]),
    );
    for (const invoice of invoices) {
      const connection = field(invoice, 'connection');
      const supplier = active.get(str(connection.connectionId));
      expect(supplier, str(invoice.invoiceNumber)).toBeDefined();
      expect(connection.connectionName).toBe(supplier?.supplierName);
      expect(connection.connectionCode).toBe(supplier?.supplierNumber);
    }
    for (const point of financeMonthlyPoints()) {
      const inMonth = invoices.filter((row) => str(row.issueDate).startsWith(point.month));
      expect(inMonth.length, point.month).toBe(active.size);
      expect(sum(inMonth.map((row) => num(row.totalAmount))), point.month).toBe(point.purchases);
    }
  });

  it('상세 품목 줄의 금액 합이 총액이다(전부)', async () => {
    for (const invoice of await allRows(AP)) {
      const detail = await get(`${AP}/${str(invoice.invoiceId)}`);
      const items = RowsSchema.parse(detail.items);
      for (const item of items)
        expect(item.totalPrice).toBe(num(item.quantity) * num(item.unitPrice));
      expect(sum(items.map((item) => num(item.totalPrice)))).toBe(invoice.totalAmount);
    }
  });

  it('재무 고객사 통계는 매출, 공급사 통계는 매입과 같다', async () => {
    const stat = async (path: string, period: string) =>
      num(field(field(await get(path), period), 'total_amount').value);
    for (const period of ['week', 'month', 'quarter', 'year'] as const) {
      expect(await stat('/business/fcm/statistics/customer/total-purchases', period)).toBe(
        monthlyMetric('sales')[period],
      );
      expect(await stat('/business/fcm/statistics/supplier/total-sales', period)).toBe(
        monthlyMetric('purchases')[period],
      );
    }
  });
});

describe('부서와 직급 = 직원 목록', () => {
  it('부서 6개. 인원은 그 부서 재직자 수, 부서장은 부서 첫 사람(팀장), 합이 근태 인원이다', async () => {
    const departments = await rows(`${HRM}/departments`);
    expect(departments).toHaveLength(6);
    for (const department of departments) {
      const members = ACTIVE.filter((row) => row.department === department.departmentName);
      expect(department.employeeCount).toBe(members.length);
      expect(RowsSchema.parse(department.employees).map((row) => row.employeeId)).toEqual(
        members.map((row) => row.employeeId),
      );
      const leader = EMPLOYEES.find(
        (row) => row.department === department.departmentName && row.position === '팀장',
      );
      expect(department).toMatchObject({
        managerId: leader?.employeeId,
        managerName: leader?.name,
      });
    }
    expect(sum(departments.map((row) => num(row.employeeCount)))).toBe(HEADCOUNT);
  });

  it('팀장을 다른 부서 사원으로 바꾸면 옛 부서의 부서장에서 빠진다(리뷰 A1)', async () => {
    const auth = 'Bearer department-leader-edit';
    await mockApi('PATCH', `${HRM}/employee/emp-001`, {
      auth,
      body: { employeeName: '홍길동', departmentId: 'dept-002', positionId: 'pos-002' },
    });
    const departments = RowsSchema.parse(
      RecordSchema.parse(
        z
          .object({ data: z.unknown() })
          .parse(await mockApi('GET', `${HRM}/departments?page=0&size=10`, { auth })).data,
      ).content,
    );
    const sales = departments.find((row) => row.departmentName === '영업팀');
    const purchase = departments.find((row) => row.departmentName === '구매팀');
    expect(sales?.managerId).not.toBe('emp-001');
    expect(sales?.employeeCount).toBe(6);
    expect(purchase?.managerId).toBe('emp-008');
  });

  it('직급은 팀장 6명, 사원 34명이고 상세의 사람이 그 직급이다', async () => {
    const positions = RowsSchema.parse(
      z.object({ data: z.unknown() }).parse(await mockApi('GET', `${HRM}/positions`)).data,
    );
    expect(positions.map((row) => [row.positionName, row.headCount])).toEqual([
      ['팀장', 6],
      ['사원', 34],
    ]);
    for (const position of positions) {
      const detail = await get(`${HRM}/positions/${str(position.positionId)}`);
      const people = RowsSchema.parse(detail.employees);
      expect(people).toHaveLength(num(position.headCount));
      for (const person of people) expect(person.position).toBe(position.positionName);
    }
  });

  it('부서원 드롭다운은 그 부서 재직자다', async () => {
    const options = z
      .object({ data: z.array(z.object({ key: z.string(), value: z.string() })) })
      .parse(await mockApi('GET', `${HRM}/departments/dept-002/members`)).data;
    expect(options.map((option) => option.value)).toEqual(
      ACTIVE.filter((row) => row.department === '구매팀').map((row) => row.name),
    );
  });
});

describe('급여 = 직원과 직급', () => {
  it('이번 달 급여는 재직자 40명, 직원 목록과 같은 이름, 부서, 직급이고 실지급 = 기본 + 연장 - 공제', async () => {
    const payrolls = await allRows(PAY);
    expect(payrolls).toHaveLength(HEADCOUNT);
    const payments = new Map(
      RowsSchema.parse(
        z.object({ data: z.unknown() }).parse(await mockApi('GET', `${HRM}/positions`)).data,
      ).map((row) => [row.positionName, row.payment]),
    );
    for (const payroll of payrolls) {
      const employee = field(payroll, 'employee');
      const seed = EMPLOYEES.find((row) => row.employeeId === employee.employeeId);
      expect(employee).toMatchObject({
        employeeName: seed?.name,
        department: seed?.department,
        position: seed?.position,
      });
      const pay = field(payroll, 'pay');
      expect(pay.basePay).toBe(payments.get(seed?.position));
      expect(pay.netPay).toBe(num(pay.basePay) + num(pay.overtimePay) - num(pay.deduction));
    }
  });

  it('상세 항목 합이 목록 금액이고 지급 예정일은 그 달 25일이다', async () => {
    for (const payroll of (await allRows(PAY)).slice(0, 10)) {
      const detail = await get(`${HRM}/payroll/${str(payroll.payrollId)}`);
      const pay = field(detail, 'pay');
      const total = (key: string) =>
        sum(RowsSchema.parse(pay[key]).map((item) => num(item.itemSum)));
      expect(total('basePayItem')).toBe(pay.basePay);
      expect(total('overtimePayItem')).toBe(pay.overtimePay);
      expect(total('deductionItem')).toBe(pay.deduction);
      expect(detail.expectedDate).toBe('2026-11-25');
    }
  });

  it('다음 달이나 모르는 급여 id 는 404 다', async () => {
    const first = (await rows(PAY))[0];
    const nextMonth = str(first.payrollId).replace('202611', '202612');
    expect((await mockCall('GET', `${HRM}/payroll/${nextMonth}`)).status).toBe(404);
    expect((await mockCall('GET', `${HRM}/payroll/pay-001`)).status).toBe(404);
  });
});

describe('출퇴근과 휴가 = 근태 집계', () => {
  it('고른 날의 지각 행 수가 집계의 지각, 행 수가 출근(정상 + 지각)이다', async () => {
    const day = busyDay();
    const records = await allRows(TIME());
    expect(records.filter((row) => row.statusCode === 'LATE')).toHaveLength(day.late);
    expect(records).toHaveLength(day.present + day.late);
    for (const record of records) expect(record.workDate).toBe(day.date);
  });

  it('주말에는 출퇴근 기록이 없다', async () => {
    expect(await allRows(`${HRM}/time-record?date=2026-11-08`)).toEqual([]);
  });

  it('집계 기간의 날마다 승인 휴가 수가 휴가 인원이고, 그 사람은 그날 출퇴근 목록에 없다', async () => {
    const leaves = (await allRows(`${HRM}/leave-request`)).filter(
      (row) => row.status === 'APPROVED',
    );
    const days = attendanceDays().days;
    for (const day of days.slice(-15)) {
      const away = leaves.filter(
        (row) => str(row.startDate) <= day.date && day.date <= str(row.endDate),
      );
      expect(away, day.date).toHaveLength(day.onLeave);
      const present = new Set(
        (await allRows(`${HRM}/time-record?date=${day.date}`)).map(
          (row) => field(row, 'employee').employeeId,
        ),
      );
      for (const row of away) expect(present.has(field(row, 'employee').employeeId)).toBe(false);
    }
  });

  it('휴가와 출퇴근의 직원은 직원 목록의 재직자다', async () => {
    const ids = new Set(ACTIVE.map((row) => row.employeeId));
    for (const row of [...(await allRows(`${HRM}/leave-request`)), ...(await allRows(TIME()))])
      expect(ids.has(str(field(row, 'employee').employeeId))).toBe(true);
  });
});

describe('교육 = 직원과 프로그램', () => {
  it('교육 현황은 재직자 40명이고 상세 이력의 완료 수가 목록의 완료 수다', async () => {
    const items = await allRows(`${HRM}/training-status`, 'items');
    expect(items.map((row) => row.employeeId)).toEqual(ACTIVE.map((row) => row.employeeId));
    for (const item of items.slice(0, 10)) {
      const detail = await get(`${HRM}/training/employee/${str(item.employeeId)}`);
      const history = RowsSchema.parse(detail.programHistory);
      expect(history.filter((row) => row.programStatus === 'COMPLETED')).toHaveLength(
        num(item.completedCount),
      );
      expect(history.filter((row) => row.programStatus === 'INCOMPLETED')).toHaveLength(
        num(item.inProgressCount),
      );
    }
  });

  it('프로그램 상세의 대상자는 정원 이하이고, 대상자의 교육 상세에 그 프로그램이 같은 상태로 있다', async () => {
    for (const program of (await allRows(`${HRM}/program`)).slice(0, 6)) {
      const detail = await get(`${HRM}/program/${str(program.programId)}`);
      const people = RowsSchema.parse(detail.designatedEmployee);
      expect(people.length).toBeLessThanOrEqual(num(program.capacity));
      expect(detail.totalElements).toBe(people.length);
      for (const person of people.slice(0, 5)) {
        const history = RowsSchema.parse(
          (await get(`${HRM}/training/employee/${str(person.employeeId)}`)).programHistory,
        );
        expect(history.find((row) => row.programId === program.programId)).toMatchObject({
          programStatus: person.statusCode,
        });
      }
    }
  });

  it('교육 프로그램 드롭다운은 프로그램 목록과 같다', async () => {
    const options = z
      .object({ data: z.array(z.object({ key: z.string(), value: z.string() })) })
      .parse(await mockApi('GET', `${HRM}/trainings/programs`)).data;
    const programs = await allRows(`${HRM}/program`);
    expect(options).toEqual(
      programs.map((row) => ({ key: row.programId, value: row.programName })),
    );
  });
});
