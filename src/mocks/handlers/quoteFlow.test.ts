// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getResponse } from 'msw';
import * as z from 'zod';
import { API_BASE_URL } from '@/app/types/api';
import { mockApi } from '@/test/mockApi';
import { handlers } from '../handlers';
import { addDays, mondayOf } from './seed';

/**
 * 카드 "반려 견적과 등록 반영". 영업에서 반려된 견적은 생산에 없고, 로그인이 만든 견적은 검토를 요청한 뒤에만 생산에 온다.
 * 견적 품목 선택은 품목표의 판매 품목이다. 목의 쓰기 결과는 vitest.setup.ts 가 테스트마다 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);
const dataOf = (body: unknown) => z.object({ data: z.unknown().optional() }).parse(body).data;

const Q = '/business/sd/quotations';
const PQ = '/scm-pp/pp/quotations';
const MRP = `${PQ}/mrp`;
const RUN = '/scm-pp/pp/mrp/runs';
const MES = '/scm-pp/pp/mes';
const OPTIONS = ['/scm-pp/pp/mrp/quotations/toggle', '/scm-pp/pp/mrp/runs/quotations/toggle'];
const PICKER = '/scm-pp/product/item/toggle';
const INV = '/scm-pp/iv/inventory-items';

const login = (auth: string) => {
  const call = async (path: string) => dataOf(await mockApi('GET', path, { auth }));
  const post = async (path: string, body?: unknown) =>
    dataOf(await mockApi('POST', path, { auth, body }));
  const get = async (path: string) => RecordSchema.parse(await call(path));
  const rows = async (path: string) =>
    RowsSchema.parse(
      (await get(`${path}${path.includes('?') ? '&' : '?'}page=0&size=1000`)).content,
    );
  const options = async (path: string) =>
    z.array(z.object({ key: z.string(), value: z.string() })).parse(await call(path));
  const simulate = async (quotationIds: string[]) =>
    RowsSchema.parse(RecordSchema.parse(await post(`${PQ}/simulate`, { quotationIds })).content);
  const mps = async (from: string, to = from) =>
    RowsSchema.parse(
      (await get(`${PQ}/mps?bomId=bom-001&startDate=${from}&endDate=${to}&page=0&size=1000`))
        .content,
    );
  const create = (quantity = 5, itemId = 'item-1001', unitPrice = 12000) =>
    post(Q, { items: [{ itemId, quantity, unitPrice }], note: '신규' });
  const review = (quotationId: string) => post(`${Q}/confirm`, { quotationId });
  return { call, post, get, rows, options, simulate, mps, create, review };
};
type User = ReturnType<typeof login>;
const ids = (list: Row[]) => list.map((row) => str(row.quotationId));
const sumOf = (weeks: Row[]) => weeks.reduce((sum, week) => sum + num(week.demand), 0);

/** 한국 12시로 고정한다 */
const setToday = (date: string) => vi.setSystemTime(new Date(`${date}T03:00:00Z`));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  setToday('2026-11-24');
});
afterEach(() => {
  vi.useRealTimers();
});

const DAYS = ['2026-11-13', '2026-11-24', '2026-12-31', '2027-03-01', '2027-08-15'];
const REJECTED = ['qt-004', 'qt-006', 'qt-012'];
/** 반려를 뺀 기본 견적 13건 */
const PLANNED = Array.from({ length: 16 }, (_, i) => `qt-${String(i + 1).padStart(3, '0')}`).filter(
  (id) => !REJECTED.includes(id),
);
const numbersOf = async (user: User) =>
  new Map((await user.rows(Q)).map((row) => [str(row.quotationId), str(row.quotationNumber)]));

describe('영업에서 반려된 견적은 생산에 없다', () => {
  it.each(DAYS)('%s: 생산 견적, 시뮬레이션, 확정, MPS', async (day) => {
    setToday(day);
    const user = login(`Bearer rejected-${day}`);
    const sales = await user.rows(Q);
    expect(sales).toHaveLength(16);
    expect(ids(sales.filter((row) => row.statusCode === 'REJECTED')).sort()).toEqual(REJECTED);
    expect(ids(await user.rows(PQ))).toEqual(PLANNED);
    expect(await user.simulate(REJECTED)).toEqual([]);
    // 주마다 수요는 그 주 납기인 확인된 생산 견적의 수량이다(반려 견적의 80, 125, 400 이 없다)
    const [from, to] = [addDays(day, -90), addDays(day, 90)];
    const expected = async () => {
      const demand = new Map<string, number>();
      for (const row of await user.rows(PQ)) {
        if (row.availableStatus !== 'CHECKED') continue;
        const quantity = num(
          RowsSchema.parse((await user.get(`${Q}/${str(row.quotationId)}`)).items)[0].quantity,
        );
        const monday = mondayOf(str(row.dueDate));
        demand.set(monday, (demand.get(monday) ?? 0) + quantity);
      }
      const weeks = [];
      for (let monday = mondayOf(from); monday <= to; monday = addDays(monday, 7))
        weeks.push(demand.get(monday) ?? 0);
      return weeks;
    };
    const before = (await user.mps(from, to)).map((week) => week.demand);
    expect(before).toEqual(await expected());
    // 확인된 다섯 견적: qt-002, 008, 010, 014, 016
    expect(sumOf(await user.mps(from, to))).toBe(225 + 60 + 180 + 350 + 40);
    await user.post(`${PQ}/confirm`, { quotationIds: REJECTED });
    expect((await user.mps(from, to)).map((week) => week.demand)).toEqual(before);
    expect(ids(await user.rows(PQ))).toEqual(PLANNED);
  });

  it.each([
    ['2026-11-13', 60],
    ['2026-11-24', 180],
    ['2026-12-31', 60],
    ['2027-03-01', 180],
    ['2027-08-15', 60],
  ])('%s: MPS 기본 기간의 수요는 %i', async (day, demand) => {
    setToday(day);
    expect(sumOf(await login(`Bearer week-${day}`).mps(day))).toBe(demand);
  });

  it.each(DAYS)('%s: MRP 순소요, 계획 주문, MES, 견적 드롭다운', async (day) => {
    setToday(day);
    const user = login(`Bearer plan-${day}`);
    const numbers = await numbersOf(user);

    const mrp = await user.rows(MRP);
    expect([...new Set(ids(mrp))].sort()).toEqual(PLANNED.slice(0, 10));
    expect(mrp).toHaveLength(130);
    // 견적과 자재의 짝은 겹치지 않는다
    expect(new Set(mrp.map((row) => `${str(row.quotationId)}/${str(row.itemId)}`)).size).toBe(130);

    const runs = await user.rows(RUN);
    expect(runs).toHaveLength(500);
    expect([...new Set(runs.map((row) => str(row.quotationNumber)))].sort()).toEqual(
      PLANNED.map((id) => str(numbers.get(id))).sort(),
    );
    // 한 견적에 여러 자재가 나온다
    for (const id of PLANNED) {
      const items = runs.filter((row) => row.quotationNumber === numbers.get(id));
      expect(new Set(items.map((row) => row.itemId)).size, id).toBeGreaterThanOrEqual(12);
    }

    const mes = await user.rows(MES);
    expect(mes).toHaveLength(50);
    expect([...new Set(ids(mes))].sort()).toEqual(PLANNED.slice(0, 5));
    for (const row of mes) expect(row.quotationNumber).toBe(numbers.get(str(row.quotationId)));

    for (const path of OPTIONS) {
      const options = await user.options(path);
      expect(options).toEqual([
        { key: 'ALL', value: '전체 견적' },
        ...PLANNED.slice(0, 5).map((key) => ({ key, value: numbers.get(key) })),
      ]);
      // 고른 견적마다 줄이 있다
      for (const { key } of options.slice(1)) {
        expect((await user.rows(`${MRP}?quotationId=${key}`)).length).toBeGreaterThan(0);
        expect((await user.rows(`${RUN}?quotationId=${key}`)).length).toBeGreaterThan(0);
        expect((await user.rows(`${MES}?quotationId=${key}`)).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('로그인이 만든 견적은 검토를 요청하면 생산에 온다', () => {
  /** 순번으로 만든 계획 자료. 견적을 더해도 밀리지 않는다 */
  const plans = async (user: User) => [
    await user.rows(MRP),
    await user.rows(RUN),
    await user.rows(MES),
    await user.options(OPTIONS[0]),
    await user.options(OPTIONS[1]),
    await user.options('/scm-pp/pp/mps/boms/toggle'),
  ];

  it.each(DAYS)('%s: 대기는 없고 검토 요청 뒤 미확인으로 맨 끝에 온다', async (day) => {
    setToday(day);
    const user = login(`Bearer created-${day}`);
    const before = await plans(user);
    await user.create(7);
    expect(ids(await user.rows(PQ))).toEqual(PLANNED);
    expect(await user.simulate(['qt-017'])).toEqual([]);

    await user.review('qt-017');
    const production = await user.rows(PQ);
    expect(ids(production)).toEqual([...PLANNED, 'qt-017']);
    const quote = await user.get(`${Q}/qt-017`);
    expect(quote.statusCode).toBe('REVIEW');
    expect(production.at(-1)).toEqual({
      quotationId: 'qt-017',
      quotationNumber: quote.quotationNumber,
      customerName: quote.customerName,
      productName: '모터 A',
      requestDate: day,
      dueDate: addDays(day, 30),
      availableStatus: 'UNCHECKED',
    });
    expect(await user.simulate(['qt-017'])).toMatchObject([
      {
        quotationId: 'qt-017',
        quotationNumber: quote.quotationNumber,
        customerCompanyName: quote.customerName,
        productId: 'prod-001',
        productName: '모터 A',
        requestQuantity: 7,
        requestDueDate: Date.parse(addDays(day, 30)),
      },
    ]);
    // 다른 로그인에는 없다
    expect(ids(await login(`Bearer other-${day}`).rows(PQ))).toEqual(PLANNED);

    const demandBefore = sumOf(await user.mps(addDays(day, 30)));
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect((await user.rows(PQ)).at(-1)).toMatchObject({
      quotationId: 'qt-017',
      availableStatus: 'CHECKED',
    });
    expect(sumOf(await user.mps(addDays(day, 30)))).toBe(demandBefore + 7);
    // MRP, 계획 주문, MES 에는 새 줄이 생기지 않는다
    expect(await plans(user)).toEqual(before);
  });

  it('기본 견적의 시뮬레이션 결과는 재고와 무관하게 예전 그대로다', async () => {
    const user = login('Bearer seed-simulate');
    const result = (rows: Row[]) =>
      rows.map((row) => {
        const simulation = RecordSchema.parse(row.simulation);
        return [row.quotationId, simulation.availableQuantity, simulation.status];
      });
    const expected = [
      ['qt-001', 525, 'FAIL'],
      ['qt-002', 180, 'PASS'],
      ['qt-003', 450, 'STOCK_SUFFICIENT'],
      ['qt-005', 390, 'STOCK_SUFFICIENT'],
      ['qt-007', 300, 'PASS'],
      ['qt-008', 48, 'PASS'],
      ['qt-009', 250, 'STOCK_SUFFICIENT'],
      ['qt-010', 198, 'STOCK_SUFFICIENT'],
      ['qt-011', 130, 'STOCK_SUFFICIENT'],
      ['qt-013', 132, 'PASS'],
      ['qt-014', 280, 'FAIL'],
      ['qt-015', 90, 'STOCK_SUFFICIENT'],
      ['qt-016', 44, 'STOCK_SUFFICIENT'],
    ];
    expect(result(await user.simulate(PLANNED))).toEqual(expected);
    // 베어링 B 를 15개 내보내 qt-008 의 둘째 품목(15개)이 모자라져도 기본 견적은 첫 품목이다
    const before = await user.rows(PQ);
    await user.post('/scm-pp/iv/stock-transfers', {
      itemId: 'item-1002',
      fromWarehouseId: 'wh-001',
      toWarehouseId: 'wh-002',
      stockQuantity: 15,
      uomName: 'EA',
      reason: '재배치',
    });
    expect(await user.rows(PQ)).toEqual(before);
    expect(result(await user.simulate(PLANNED))).toEqual(expected);
  });

  it('새 견적은 번호가 무엇이든 지금 재고로 모자란 만큼이다(예전 순번 규칙의 실패도 없다)', async () => {
    const user = login('Bearer created-simulate');
    for (let i = 0; i < 12; i += 1) {
      await user.create(200);
      await user.review(`qt-${String(17 + i).padStart(3, '0')}`);
    }
    const created = ids(await user.rows(PQ)).slice(PLANNED.length);
    expect(created).toHaveLength(12);
    for (const row of await user.simulate(created))
      expect([row.quotationId, row.simulation]).toMatchObject([
        row.quotationId,
        { status: 'PASS', availableQuantity: 120, shortageQuantity: 80, shortageReason: '' },
      ]);
  });

  const line = (itemId: string, quantity: number) => ({ itemId, quantity, unitPrice: 1000 });
  const moveMotor = (
    user: User,
    fromWarehouseId: string,
    toWarehouseId: string,
    itemId = 'item-1001',
  ) =>
    user.post('/scm-pp/iv/stock-transfers', {
      itemId,
      fromWarehouseId,
      toWarehouseId,
      stockQuantity: 50,
      uomName: 'EA',
      reason: '재배치',
    });
  /** 생산 견적 목록과 시뮬레이션이 말하는 제품. 둘은 늘 같다 */
  const productOf = async (user: User) => {
    const row = (await user.rows(PQ)).at(-1);
    const [simulated] = await user.simulate(['qt-017']);
    expect(simulated.productName).toBe(row?.productName);
    return row?.productName;
  };

  it('검토와 시뮬레이션 사이에 재고가 바뀌어도 목록과 시뮬레이션이 같은 품목이고, 확정하면 그 품목으로 굳는다', async () => {
    const user = login('Bearer short-line');
    const motorDemand = async () => sumOf(await user.mps('2026-11-24', '2027-01-31'));
    const before = await motorDemand();
    await user.post(Q, { items: [line('item-1001', 100), line('item-1002', 30)], note: '' });
    await user.review('qt-017');
    // 베어링 B 30 > 20. 모터 A 100 은 재고 안
    expect(await productOf(user)).toBe('베어링 B');
    // 모터 A 를 50개 내보내면 모터 A 도 모자라 앞 품목이 된다
    await moveMotor(user, 'wh-001', 'wh-002');
    expect(await productOf(user)).toBe('모터 A');
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect(await motorDemand()).toBe(before + 100);
    // 확정한 뒤에는 재고가 돌아와도 계획한 품목이 안 바뀐다
    await moveMotor(user, 'wh-002', 'wh-001');
    expect(await productOf(user)).toBe('모터 A');
    expect(await motorDemand()).toBe(before + 100);
  });

  it('BOM 이 없는 베어링 B 가 모자라면 시뮬레이션이 실패이고 확정을 보내도 미확인이며 MPS 가 그대로다', async () => {
    const user = login('Bearer no-bom');
    const before = await user.mps('2026-11-24', '2027-01-31');
    await user.post(Q, { items: [line('item-1001', 1), line('item-1002', 30)], note: '' });
    await user.review('qt-017');
    const [simulated] = await user.simulate(['qt-017']);
    expect(simulated).toMatchObject({
      productName: '베어링 B',
      requestQuantity: 30,
      simulation: {
        status: 'FAIL',
        availableQuantity: 20,
        shortageQuantity: 10,
        shortageReason: 'BOM이 등록되지 않은 품목',
      },
    });
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect((await user.rows(PQ)).at(-1)).toMatchObject({
      productName: '베어링 B',
      availableStatus: 'UNCHECKED',
    });
    expect(await user.mps('2026-11-24', '2027-01-31')).toEqual(before);
    expect(await user.options('/scm-pp/pp/mps/boms/toggle')).toEqual([
      { key: 'bom-001', value: '모터 A' },
    ]);
  });

  it('시뮬레이션한 뒤 재고가 바뀌어도 확정은 시뮬레이션이 보인 품목으로 한다', async () => {
    const user = login('Bearer simulated-line');
    const motorDemand = async () => sumOf(await user.mps('2026-11-24', '2027-01-31'));
    const before = await motorDemand();
    await user.post(Q, { items: [line('item-1002', 10), line('item-1001', 200)], note: '' });
    await user.review('qt-017');
    expect(await productOf(user)).toBe('모터 A');
    // 베어링 B 를 50개 내보내 앞 품목도 모자라진다. 다시 시뮬레이션하지 않고 확정한다
    await moveMotor(user, 'wh-001', 'wh-002', 'item-1002');
    expect((await user.rows(PQ)).at(-1)?.productName).toBe('베어링 B');
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect((await user.rows(PQ)).at(-1)).toMatchObject({
      productName: '모터 A',
      availableStatus: 'CHECKED',
    });
    expect(await motorDemand()).toBe(before + 200);
  });

  it('다시 시뮬레이션하면 나중 것으로 확정하고, 다른 로그인의 시뮬레이션은 섞이지 않는다', async () => {
    const [user, other] = [login('Bearer again'), login('Bearer again-other')];
    for (const each of [user, other]) {
      await each.post(Q, { items: [line('item-1001', 100), line('item-1002', 30)], note: '' });
      await each.review('qt-017');
    }
    // 처음에는 베어링 B(확정 불가), 모터 A 를 내보낸 뒤 다시 보면 모터 A
    expect(await productOf(user)).toBe('베어링 B');
    await moveMotor(user, 'wh-001', 'wh-002');
    expect(await productOf(user)).toBe('모터 A');
    expect(await productOf(other)).toBe('베어링 B');
    for (const each of [user, other])
      await each.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect((await user.rows(PQ)).at(-1)).toMatchObject({ availableStatus: 'CHECKED' });
    expect((await other.rows(PQ)).at(-1)).toMatchObject({ availableStatus: 'UNCHECKED' });
  });

  it('둘째 품목인 모터 A 로 확정하면 그 수량이 MPS 수요에 든다', async () => {
    const user = login('Bearer second-motor');
    const before = sumOf(await user.mps('2026-11-24', '2027-01-31'));
    await user.post(Q, { items: [line('item-1002', 1), line('item-1001', 200)], note: '' });
    await user.review('qt-017');
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect(sumOf(await user.mps('2026-11-24', '2027-01-31'))).toBe(before + 200);
  });

  it('생산에 없는 견적에 보낸 확정은 남지 않는다(대기 견적을 나중에 검토 요청해도 미확인)', async () => {
    const user = login('Bearer early-confirm');
    await user.create(200);
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017', 'nope'] });
    await user.review('qt-017');
    expect((await user.rows(PQ)).at(-1)).toMatchObject({
      quotationId: 'qt-017',
      availableStatus: 'UNCHECKED',
    });
  });

  it('즉시 납품한 새 견적은 재고로 나가 생산에 오지 않는다', async () => {
    const user = login('Bearer delivered');
    await user.create(5);
    await user.post(`${Q}/qt-017/approve-order`);
    expect((await user.get(`${Q}/qt-017`)).statusCode).toBe('APPROVAL');
    expect(ids(await user.rows(PQ))).toEqual(PLANNED);
  });

  it('대기 중인 기본 견적을 검토 요청해도 생산 목록은 그대로다', async () => {
    const user = login('Bearer seed-review');
    const before = await user.rows(PQ);
    await user.review('qt-002');
    expect(await user.rows(PQ)).toEqual(before);
  });

  it('모터 A 가 첫 품목이 아니면 그 품목이 제품이고, BOM 이 없어 확정되지 않으며 모터 A 수요에 안 든다', async () => {
    const user = login('Bearer bearing');
    const before = sumOf(await user.mps('2026-11-24', '2027-01-31'));
    await user.create(9, 'item-1002', 8000);
    await user.review('qt-017');
    await user.post(`${PQ}/confirm`, { quotationIds: ['qt-017'] });
    expect((await user.rows(PQ)).at(-1)).toMatchObject({
      productName: '베어링 B',
      availableStatus: 'UNCHECKED',
    });
    expect(sumOf(await user.mps('2026-11-24', '2027-01-31'))).toBe(before);
  });

  it('품목이 없는 견적은 검토를 요청해도 생산에 오지 않는다(생산 조회가 깨지지 않는다)', async () => {
    const user = login('Bearer empty');
    await user.post(Q, { items: [], note: '' });
    await user.review('qt-017');
    expect(ids(await user.rows(PQ))).toEqual(PLANNED);
  });

  it('상한으로 밀려난 견적은 생산에서도 사라진다', async () => {
    const user = login('Bearer evicted');
    for (let i = 0; i < 51; i += 1) await user.create(1);
    for (const id of ['qt-017', 'qt-018']) await user.review(id);
    const production = ids(await user.rows(PQ));
    expect(production).toEqual([...PLANNED, 'qt-018']);
    // 짝수 순번도 새 견적은 미확인에서 시작한다(기본 견적은 짝수면 확인)
    expect((await user.rows(PQ)).at(-1)).toMatchObject({ availableStatus: 'UNCHECKED' });
    const sales = ids(await user.rows(Q));
    for (const id of production) expect(sales).toContain(id);
  });

  it('기본 견적을 다 확정하면 생산 대시보드의 다음 할 일이 새 견적이다', async () => {
    const user = login('Bearer dashboard');
    await user.create(5);
    await user.review('qt-017');
    await user.post(`${PQ}/confirm`, { quotationIds: PLANNED });
    const response = await getResponse(
      handlers,
      new Request(new URL(`${API_BASE_URL}/dashboard/workflows`, 'http://localhost'), {
        headers: { authorization: 'Bearer dashboard', 'x-session-role': 'PP_ADMIN' },
      }),
      { baseUrl: 'http://localhost' },
    );
    const { tabs } = z
      .object({ tabs: z.array(z.object({ tabCode: z.string(), items: RowsSchema })) })
      .parse(dataOf(await response?.json()));
    const quote = await user.get(`${Q}/qt-017`);
    expect(tabs[0].items).toMatchObject([
      { itemId: 'qt-017', itemNumber: quote.quotationNumber, statusCode: 'UNCHECKED' },
    ]);
  });
});

describe('견적 품목 선택은 품목표의 판매 품목이다', () => {
  it('모터 A 와 베어링 B. 번호, 이름, 단가가 재고 목록과 같다', async () => {
    const user = login('Bearer picker');
    const products = RowsSchema.parse((await user.get(PICKER)).products);
    expect(products.map((row) => row.itemId)).toEqual(['item-1001', 'item-1002']);
    const inventory = await user.rows(INV);
    for (const row of products) {
      const item = inventory.find((stock) => stock.itemId === row.itemId);
      for (const key of ['itemNumber', 'itemName', 'uomName', 'unitPrice'])
        expect([row.itemId, row[key]]).toEqual([row.itemId, item?.[key]]);
    }
  });

  it('기본 견적과 주문이 파는 품목 전부다', async () => {
    const user = login('Bearer sold');
    const sold = new Map<string, unknown>();
    for (const path of [Q, '/business/sd/orders'])
      for (const row of (await user.rows(path)).slice(0, 30)) {
        const detail = await user.get(`${path}/${str(row.quotationId ?? row.salesOrderId)}`);
        for (const item of RowsSchema.parse(detail.items))
          sold.set(str(item.itemId), item.unitPrice);
      }
    const products = RowsSchema.parse((await user.get(PICKER)).products);
    expect(new Map(products.map((row) => [str(row.itemId), row.unitPrice]))).toEqual(
      new Map([...sold].sort(([a], [b]) => a.localeCompare(b))),
    );
  });

  it('고른 품목으로 만든 견적의 상세에 품목 이름과 금액이 나온다', async () => {
    const user = login('Bearer pick');
    for (const product of RowsSchema.parse((await user.get(PICKER)).products))
      await user.create(3, str(product.itemId), num(product.unitPrice));
    const items = [];
    for (const id of ['qt-017', 'qt-018'])
      items.push(...RowsSchema.parse((await user.get(`${Q}/${id}`)).items));
    expect(items).toMatchObject([
      { itemId: 'item-1001', itemName: '모터 A', quantity: 3, unitPrice: 12000, amount: 36000 },
      { itemId: 'item-1002', itemName: '베어링 B', quantity: 3, unitPrice: 8000, amount: 24000 },
    ]);
  });
});
