// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getResponse } from 'msw';
import * as z from 'zod';
import { API_BASE_URL } from '@/app/types/api';
import { mockApi } from '@/test/mockApi';
import { handlers } from '../handlers';
import { MAX_MOCK_SESSIONS } from '../state';
import { addDays, mondayOf } from './seed';

/**
 * 카드 "견적 날짜와 MPS 수요". 데모를 언제 열어도 견적이 최근이고 MPS 기본 기간(오늘)에 수요가 있으며, 견적이 나오는
 * 모든 목록이 같은 번호와 날짜를 쓰는지, 한 로그인 안에서는 날이 바뀌어도 그대로인지 본다.
 * 목의 쓰기 결과와 기준일은 vitest.setup.ts 가 테스트마다 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);
const dataOf = (body: unknown) => z.object({ data: z.unknown() }).parse(body).data;

/** 로그인 하나의 조회. 시계를 옮기면 그 로그인이 다음 날 다시 연 것이다 */
const login = (auth: string) => {
  const call = async (path: string) => dataOf(await mockApi('GET', path, { auth }));
  const post = (path: string, body?: unknown) => mockApi('POST', path, { auth, body });
  const get = async (path: string) => RecordSchema.parse(await call(path));
  const rows = async (path: string) =>
    RowsSchema.parse(
      (await get(`${path}${path.includes('?') ? '&' : '?'}page=0&size=1000`)).content,
    );
  const options = async (path: string) =>
    z.array(z.object({ key: z.string(), value: z.string() })).parse(await call(path));
  const simulate = async (quotationIds: string[]) =>
    RowsSchema.parse(RecordSchema.parse(dataOf(await post(SIMULATE, { quotationIds }))).content);
  const workflow = async (role: string) => {
    const response = await getResponse(
      handlers,
      new Request(new URL(`${API_BASE_URL}/dashboard/workflows`, 'http://localhost'), {
        headers: { authorization: auth, 'x-session-role': role },
      }),
      { baseUrl: 'http://localhost' },
    );
    const { tabs } = z
      .object({ tabs: z.array(z.object({ tabCode: z.string(), items: RowsSchema })) })
      .parse(dataOf(await response?.json()));
    return tabs.filter(({ tabCode }) => tabCode === 'QT' || tabCode === 'MES');
  };
  return { call, get, post, rows, options, simulate, workflow };
};

const Q = '/business/sd/quotations';
const SO = '/business/sd/orders';
const PQ = '/scm-pp/pp/quotations';
const SIMULATE = `${PQ}/simulate`;
const MRP = '/scm-pp/pp/quotations/mrp';
const RUN = '/scm-pp/pp/mrp/runs';
const MES = '/scm-pp/pp/mes';
const MRP_OPTIONS = '/scm-pp/pp/mrp/quotations/toggle';
const RUN_OPTIONS = '/scm-pp/pp/mrp/runs/quotations/toggle';
const ALARMS = '/alarm/notifications/list?page=0&size=100';
const mpsOn = (from: string, to = from) =>
  `${PQ}/mps?bomId=bom-001&startDate=${from}&endDate=${to}`;

/** 한국 12시로 고정한다 */
const setToday = (date: string) => vi.setSystemTime(new Date(`${date}T03:00:00Z`));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

/** 데모를 여는 날. 첫 날은 예전 고정 날짜와 같은 날짜가 나오는 주 */
const DAYS = ['2026-11-13', '2026-11-24', '2026-12-31', '2027-03-01', '2027-08-15'];
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const byId = (list: Row[]) => new Map(list.map((row) => [str(row.quotationId), row]));

/** 그 로그인의 견적 목록에서 확인된(CHECKED) 모터 A 견적 중 납기가 그 주인 것의 첫 품목 수량 합 */
const demandIn = async (user: ReturnType<typeof login>, monday: string) => {
  let sum = 0;
  for (const row of await user.rows(PQ)) {
    if (row.availableStatus !== 'CHECKED' || row.productName !== '모터 A') continue;
    const due = str(row.dueDate);
    if (due < monday || due > addDays(monday, 6)) continue;
    const detail = await user.get(`${Q}/${str(row.quotationId)}`);
    sum += num(RowsSchema.parse(detail.items)[0].quantity);
  }
  return sum;
};

describe('MPS 기본 기간의 수요', () => {
  it.each(DAYS)('%s 에 열면 모터 A 한 줄, 수요 = 그 주 납기인 확인된 견적의 수량', async (day) => {
    setToday(day);
    const user = login(`Bearer mps-${day}`);
    const options = await user.options('/scm-pp/pp/mps/boms/toggle');
    expect(options).toEqual([{ key: 'bom-001', value: '모터 A' }]);
    const weeks = RowsSchema.parse((await user.get(mpsOn(day))).content);
    expect(weeks).toHaveLength(1);
    expect(num(weeks[0].demand)).toBeGreaterThan(0);
    expect(weeks[0].demand).toBe(await demandIn(user, mondayOf(day)));
  });

  it('2026-11-12 부터 2028-01-31 까지 어느 날 열어도, 그 로그인이 다음 날 다시 봐도 수요가 있다', async () => {
    const empty: string[] = [];
    for (let day = '2026-11-12'; day <= '2028-01-31'; day = addDays(day, 1)) {
      const user = login(`Bearer every-${day}`);
      for (const at of [day, addDays(day, 1)]) {
        setToday(at);
        const [week] = RowsSchema.parse((await user.get(mpsOn(at))).content);
        if (num(week.demand) <= 0) empty.push(`${day} 로그인, ${at}`);
      }
    }
    expect(empty).toEqual([]);
  });
});

describe('견적 날짜는 로그인한 날을 따라온다', () => {
  it.each(DAYS)('%s: 가장 최근 견적은 그 주 안이고 앞날의 견적은 없다', async (day) => {
    setToday(day);
    const list = await login(`Bearer recent-${day}`).rows(Q);
    const ages = list.map((row) => daysBetween(str(row.quotationDate), day));
    // 견적일 최신순
    expect(ages).toEqual([...ages].sort((a, b) => a - b));
    expect(ages[0]).toBeLessThanOrEqual(6);
    expect(ages[0]).toBeGreaterThanOrEqual(0);
    // 오래된 견적도 두 달 안(목록 2쪽)
    expect(ages.at(-1)).toBeLessThanOrEqual(62);
    // 반려와 승인은 이미 지난 일이다
    for (const row of list.filter((r) => ['REJECTED', 'APPROVAL'].includes(str(r.statusCode))))
      expect(str(row.quotationDate) < day).toBe(true);
  });

  it.each(DAYS)('%s: id 는 그대로, 번호는 견적일의 해를 따르고 겹치지 않는다', async (day) => {
    setToday(day);
    const list = await login(`Bearer number-${day}`).rows(Q);
    const serials = list.map((row) => str(row.quotationId).slice('qt-'.length));
    expect([...serials].sort()).toEqual(
      Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(3, '0')),
    );
    for (const [i, row] of list.entries())
      expect(row.quotationNumber).toBe(`QT-${str(row.quotationDate).slice(0, 4)}-${serials[i]}`);
    expect(new Set(list.map((row) => row.quotationNumber)).size).toBe(16);
  });

  it.each(DAYS)('%s: 모든 견적일과 납기가 같은 주 수만큼 옮겨진다', async (day) => {
    setToday('2026-11-13');
    const base = byId(await login('Bearer base').rows(Q));
    setToday(day);
    const moved = await login(`Bearer moved-${day}`).rows(Q);
    const shifts = moved.flatMap((row) => {
      const from = base.get(str(row.quotationId));
      return ['quotationDate', 'dueDate'].map((key) =>
        daysBetween(str(from?.[key]), str(row[key])),
      );
    });
    expect(shifts).toHaveLength(32);
    expect(new Set(shifts).size).toBe(1);
    expect(shifts[0] % 7).toBe(0);
    // 금액, 고객, 상태는 날짜와 상관없이 같다
    const rest = (row: Row | undefined) => ({
      customerName: row?.customerName,
      managerName: row?.managerName,
      totalAmount: row?.totalAmount,
      statusCode: row?.statusCode,
    });
    for (const row of moved) expect(rest(row)).toEqual(rest(base.get(str(row.quotationId))));
  });
});

describe('견적이 나오는 목록은 모두 같은 견적이다', () => {
  it.each(DAYS)('%s: 영업 견적 = 생산 견적 = 시뮬레이션', async (day) => {
    setToday(day);
    const user = login(`Bearer same-${day}`);
    const sales = await user.rows(Q);
    const production = byId(await user.rows(PQ));
    const simulated = byId(await user.simulate(sales.map((row) => str(row.quotationId))));
    // 반려 견적 셋은 생산과 시뮬레이션에 없다(카드 "반려 견적과 등록 반영")
    const planned = sales.filter((row) => row.statusCode !== 'REJECTED');
    expect(planned).toHaveLength(13);
    const plannedIds = planned.map((row) => str(row.quotationId)).sort();
    expect([...production.keys()].sort()).toEqual(plannedIds);
    expect([...simulated.keys()].sort()).toEqual(plannedIds);
    for (const row of sales) {
      const id = str(row.quotationId);
      const detail = await user.get(`${Q}/${id}`);
      const first = RowsSchema.parse(detail.items)[0];
      for (const key of ['quotationNumber', 'quotationDate', 'dueDate', 'statusCode'])
        expect([id, detail[key]]).toEqual([id, row[key]]);
      if (!plannedIds.includes(id)) continue;
      expect(production.get(id), id).toMatchObject({
        quotationNumber: row.quotationNumber,
        customerName: row.customerName,
        productName: first.itemName,
        requestDate: row.quotationDate,
        dueDate: row.dueDate,
      });
      expect(simulated.get(id), id).toMatchObject({
        quotationNumber: row.quotationNumber,
        customerCompanyName: row.customerName,
        productName: first.itemName,
        requestQuantity: first.quantity,
        requestDueDate: Date.parse(str(row.dueDate)),
      });
    }
  });

  it.each(DAYS)('%s: MRP 순소요, 계획 주문, MES 와 견적 드롭다운', async (day) => {
    setToday(day);
    const user = login(`Bearer mrp-${day}`);
    // 반려 견적 셋은 어느 계획에도 없다
    const numbers = new Map(
      (await user.rows(Q))
        .filter((row) => row.statusCode !== 'REJECTED')
        .map((row) => [str(row.quotationId), str(row.quotationNumber)]),
    );
    expect(numbers.size).toBe(13);
    for (const row of await user.rows(MRP)) expect(numbers.has(str(row.quotationId))).toBe(true);
    const runs = await user.rows(RUN);
    expect(runs).toHaveLength(500);
    expect(new Set(runs.map((row) => row.quotationNumber))).toEqual(new Set(numbers.values()));
    for (const path of [MRP_OPTIONS, RUN_OPTIONS]) {
      const options = (await user.options(path)).filter(({ key }) => key !== 'ALL');
      expect(options.map(({ key }) => key)).toEqual([
        'qt-001',
        'qt-002',
        'qt-003',
        'qt-005',
        'qt-007',
      ]);
      for (const { key, value } of options) expect([key, value]).toEqual([key, numbers.get(key)]);
    }
    for (const { key, value } of await user.options(RUN_OPTIONS)) {
      if (key === 'ALL') continue;
      const filtered = await user.rows(`${RUN}?quotationId=${key}`);
      expect(filtered.length).toBeGreaterThan(0);
      expect(new Set(filtered.map((row) => row.quotationNumber))).toEqual(new Set([value]));
    }
    const mes = await user.rows(MES);
    expect(mes).toHaveLength(50);
    for (const row of mes) expect(row.quotationNumber).toBe(numbers.get(str(row.quotationId)));
  });

  it.each(DAYS)('%s: 대시보드 작업 현황과 알림이 그 견적을 가리킨다', async (day) => {
    setToday(day);
    const user = login(`Bearer link-${day}`);
    const [sales, production] = [byId(await user.rows(Q)), byId(await user.rows(PQ))];
    for (const [role, list] of [
      ['SD_ADMIN', sales],
      ['CUSTOMER_ADMIN', sales],
      ['PP_ADMIN', production],
    ] as const) {
      const item = (await user.workflow(role))[0].items[0];
      const row = list.get(str(item.itemId));
      expect([role, item.itemNumber]).toEqual([role, row?.quotationNumber]);
      expect(item.date).toBe(`${str(row?.dueDate)}T00:00:00`);
    }
    const alarm = (await user.rows(ALARMS.split('?')[0])).find((r) => r.linkType === 'QUOTATION');
    const quote = sales.get(str(alarm?.linkId));
    expect(str(alarm?.notificationMessage)).toContain(str(quote?.quotationNumber));
    expect(str(alarm?.createdAt).slice(0, 10) >= str(quote?.quotationDate)).toBe(true);
  });

  it.each(DAYS)('%s: 재고 확인, 즉시 납품 주문, so-001 과 so-002', async (day) => {
    setToday(day);
    const user = login(`Bearer order-${day}`);
    const quote = byId(await user.rows(Q)).get('qt-016');
    const enough = async (id: string) => {
      const items = RowsSchema.parse((await user.get(`${Q}/${id}`)).items).map((item) => ({
        itemId: item.itemId,
        requiredQuantity: item.quantity,
      }));
      const checked = RecordSchema.parse(
        dataOf(await user.post(`${Q}/inventory/check`, { items })),
      );
      return RowsSchema.parse(checked.items).every((item) => item.statusCode === 'AVAILABLE');
    };
    expect(await enough('qt-016')).toBe(true);
    for (const id of ['qt-002', 'qt-009', 'qt-014'])
      expect([id, await enough(id)]).toEqual([id, false]);
    await user.post(`${Q}/qt-016/approve-order`);
    expect((await user.get(`${SO}/so-qt-016`)).order).toMatchObject({
      salesOrderNumber: `SO-${str(quote?.quotationNumber)}`,
      orderDate: day,
      dueDate: quote?.dueDate,
    });
    // 재고 화면의 생산중, 출고 준비가 같은 id 로 가리키는 주문 둘
    for (const [id, path] of [
      ['so-001', '/scm-pp/sales-orders/production'],
      ['so-002', '/scm-pp/sales-orders/ready-to-ship'],
      ['so-qt-016', '/scm-pp/sales-orders/ready-to-ship'],
    ]) {
      const order = RecordSchema.parse((await user.get(`${SO}/${id}`)).order);
      const row = (await user.rows(path)).find((r) => r.salesOrderId === id);
      expect([id, row?.salesOrderNumber]).toEqual([id, order.salesOrderNumber]);
      expect([id, row?.dueDate]).toEqual([id, order.dueDate]);
    }
  });
});

describe('한 로그인 안에서는 날이 바뀌어도 그대로다', () => {
  /** 견적에서 나오는 것 전부 */
  const snapshot = async (user: ReturnType<typeof login>) => {
    const sales = await user.rows(Q);
    return {
      sales,
      details: await Promise.all(sales.map((row) => user.get(`${Q}/${str(row.quotationId)}`))),
      production: await user.rows(PQ),
      simulated: await user.simulate(sales.map((row) => str(row.quotationId))),
      mrp: await user.rows(MRP),
      runs: await user.rows(RUN),
      options: [await user.options(MRP_OPTIONS), await user.options(RUN_OPTIONS)],
      mes: await user.rows(MES),
      mesDetail: await user.get(`${MES}/mes-003`),
      mps: await user.get(mpsOn('2026-10-01', '2027-12-31')),
      workflow: [await user.workflow('SD_ADMIN'), await user.workflow('PP_ADMIN')],
      alarms: await user.rows(ALARMS.split('?')[0]),
    };
  };

  it.each([
    ['2026-11-24', '2026-11-25'],
    ['2026-11-25', '2026-11-26'],
    ['2026-12-31', '2027-01-01'],
    ['2027-03-01', '2027-04-01'],
  ])(
    '%s 에 로그인해 %s 에 다시 봐도 같다. 그날 새로 들어온 로그인은 그날 기준이다',
    async (day, later) => {
      setToday(day);
      const user = login('Bearer stay');
      const before = await snapshot(user);
      setToday(later);
      expect(await snapshot(user)).toEqual(before);
      const newest = (await login('Bearer next').rows(Q))[0];
      expect(daysBetween(str(newest.quotationDate), later)).toBeLessThanOrEqual(6);
    },
  );

  it('도메인을 서로 다른 날 처음 열어도 같은 견적이다(기준일 하나)', async () => {
    const first: Array<[string, (user: ReturnType<typeof login>) => Promise<unknown>]> = [
      ['영업', (user) => user.rows(Q)],
      ['생산 견적', (user) => user.rows(PQ)],
      ['시뮬레이션', (user) => user.simulate(['qt-001'])],
      ['MRP 순소요', (user) => user.rows(MRP)],
      ['계획 주문', (user) => user.rows(RUN)],
      ['MES', (user) => user.rows(MES)],
      ['MPS', (user) => user.get(mpsOn('2026-12-31'))],
      ['MRP 견적 드롭다운', (user) => user.options(MRP_OPTIONS)],
      ['알림', (user) => user.call(ALARMS)],
      ['대시보드', (user) => user.workflow('PP_ADMIN')],
    ];
    setToday('2026-12-31');
    const { alarms: _alarms, ...expected } = await snapshot(login('Bearer all-first'));
    for (const [i, [name, open]] of first.entries()) {
      setToday('2026-12-31');
      const user = login(`Bearer first-${i}`);
      await open(user);
      setToday('2027-01-08');
      const { alarms, ...later } = await snapshot(user);
      expect(later, name).toEqual(expected);
      const alarm = alarms.find((row) => row.linkType === 'QUOTATION');
      const quote = byId(later.sales).get(str(alarm?.linkId));
      expect(str(alarm?.notificationMessage), name).toContain(str(quote?.quotationNumber));
    }
  });
});

describe('그 로그인이 만든 견적', () => {
  const create = (user: ReturnType<typeof login>) =>
    user.post(Q, {
      items: [{ itemId: 'item-1001', quantity: 5, unitPrice: 12000 }],
      note: '신규',
    });

  it.each(DAYS)('%s: 맨 위에 오고 번호는 만든 해, 납기는 만든 날 뒤다', async (day) => {
    setToday(day);
    const user = login(`Bearer create-${day}`);
    await create(user);
    const list = await user.rows(Q);
    expect(list).toHaveLength(17);
    expect(list[0]).toMatchObject({
      quotationId: 'qt-017',
      quotationNumber: `QT-${day.slice(0, 4)}-017`,
      quotationDate: day,
      dueDate: addDays(day, 30),
      statusCode: 'PENDING',
    });
    expect(await user.get(`${Q}/qt-017`)).toMatchObject({
      quotationNumber: list[0].quotationNumber,
      dueDate: list[0].dueDate,
      totalAmount: 60000,
    });
    expect(new Set(list.map((row) => row.quotationNumber)).size).toBe(17);
  });

  it('해가 바뀐 뒤 만들면 새 해 번호이고, 먼저 만든 견적은 그대로다', async () => {
    setToday('2026-12-31');
    const user = login('Bearer year');
    await create(user);
    const before = await user.rows(Q);
    setToday('2027-01-01');
    await create(user);
    const after = await user.rows(Q);
    expect(after[0]).toMatchObject({
      quotationId: 'qt-018',
      quotationNumber: 'QT-2027-018',
      quotationDate: '2027-01-01',
    });
    expect(after.slice(1)).toEqual(before);
    expect(before[0].quotationNumber).toBe('QT-2026-017');
  });
});

it('제안 납기 확정 프리뷰는 그 로그인의 견적을 말한다', async () => {
  setToday('2027-08-15');
  const user = login('Bearer preview');
  const quote = byId(await user.rows(Q)).get('qt-001');
  const [row] = RowsSchema.parse(dataOf(await user.post(`${PQ}/preview`, {})));
  expect(row).toMatchObject({
    quotationNumber: quote?.quotationNumber,
    customerCompanyName: quote?.customerName,
    confirmedDueDate: quote?.dueDate,
  });
  const [week] = RowsSchema.parse((await user.get(mpsOn(str(quote?.dueDate)))).content);
  expect(RowsSchema.parse(row.weeks)[0].week).toBe(week.week);
});

describe('로그인 상태가 밀려나도 알림과 견적이 같은 번호다(리뷰 A1)', () => {
  it('다른 로그인 200개에 밀려나고 해가 바뀌어도 알림의 번호는 그 견적의 번호다', async () => {
    setToday('2027-01-06');
    const user = login('Bearer evicted');
    const alarmOf = async () => {
      const alarm = (await user.rows('/alarm/notifications/list')).find(
        (row) => row.linkId === 'qt-014',
      );
      return str(alarm?.notificationMessage);
    };
    const numberOf = async () => str((await user.get(`${Q}/qt-014`)).quotationNumber);
    const first = await numberOf();
    expect(await alarmOf()).toContain(first);
    for (let i = 0; i < MAX_MOCK_SESSIONS; i += 1) await login(`Bearer other-${i}`).rows(Q);
    setToday('2027-01-07');
    const second = await numberOf();
    expect(second).not.toBe(first);
    expect(await alarmOf()).toContain(second);
  });
});
