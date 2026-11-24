// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi, mockCall } from '@/test/mockApi';
import { WAREHOUSE_ITEMS } from './catalog';

/**
 * 카드 "반려 견적과 등록 반영". 원자재 추가는 재고에 없던 자재를 고른 창고에 넣는다. 재고 목록, 통계, 부족 목록, 창고별 조회,
 * 상세, 추이, 품목 선택이 같은 값을 쓰는지 본다. 목의 쓰기 결과는 vitest.setup.ts 가 테스트마다 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);

const data = async (method: 'GET' | 'POST', path: string, body?: unknown, auth?: string) =>
  z.object({ data: z.unknown().optional() }).parse(await mockApi(method, path, { body, auth }))
    .data;
const get = async (path: string, auth?: string): Promise<Row> =>
  RecordSchema.parse(await data('GET', path, undefined, auth));
const rows = async (path: string, auth?: string) =>
  RowsSchema.parse((await get(path, auth)).content);

const INV = '/scm-pp/iv/inventory-items?page=0&size=100';
const ADD = '/scm-pp/iv/items';
const ITEM = (itemId: string) => `/scm-pp/iv/items/${itemId}`;
const TOGGLE = '/scm-pp/iv/items/toggle';
const TRANSFERS = '/scm-pp/iv/stock-transfers';
const LOW = '/scm-pp/iv/shortage?page=0&size=100';
const LOW_STATS = '/scm-pp/iv/shortage/count/critical/statistic';
const LOW_PREVIEW = '/scm-pp/iv/shortage/preview';
const IV_STATS = '/scm-pp/iv/statistic';

const toggle = async (auth?: string) =>
  RowsSchema.parse(await data('GET', TOGGLE, undefined, auth));
const week = async (path: string, key: string) =>
  num(RecordSchema.parse(RecordSchema.parse((await get(path)).week)[key]).value);
const add = (body: Row, auth?: string) => mockCall('POST', ADD, { body, auth });
const inWarehouse = (name: string) => rows(`${INV}&type=WAREHOUSE_NAME&keyword=${name}`);
const move = (
  itemId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  stockQuantity: number,
) =>
  data('POST', TRANSFERS, {
    itemId,
    fromWarehouseId,
    toWarehouseId,
    stockQuantity,
    uomName: 'EA',
    reason: '재배치',
  });

const NEW_IDS = [
  'item-wh-015',
  'item-wh-016',
  'item-wh-017',
  'item-wh-018',
  'item-wh-019',
  'item-wh-020',
];
/** 화면이 보내는 본문. 숫자 칸은 입력하면 글자로 온다 */
const BODY = { itemId: 'item-wh-015', safetyStock: 40, currentStock: 100, warehouseId: 'wh-003' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T03:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('원자재 추가의 품목 선택', () => {
  it('재고에 없는 자재 6개. 재고 목록과 번호, 이름이 겹치지 않고 아직 상세가 없다', async () => {
    const options = await toggle();
    expect(options.map((row) => row.itemId)).toEqual(NEW_IDS);
    const inventory = await rows(INV);
    for (const option of options) {
      expect(inventory.map((row) => row.itemId)).not.toContain(option.itemId);
      expect(inventory.map((row) => row.itemName)).not.toContain(option.itemName);
      expect((await mockCall('GET', ITEM(str(option.itemId)))).status).toBe(404);
    }
  });

  it('추가한 자재는 선택에서 빠지고, 다 추가하면 빈 목록이다', async () => {
    for (const [i, itemId] of NEW_IDS.entries()) {
      expect((await add({ ...BODY, itemId })).status).toBe(200);
      expect((await toggle()).map((row) => row.itemId)).toEqual(NEW_IDS.slice(i + 1));
    }
  });
});

describe('추가한 자재가 재고에 보인다', () => {
  it('재고 목록에 한 줄. 이름, 단가, 단위, 공급사는 고를 때 본 값, 나머지는 적은 값', async () => {
    const before = await rows(INV);
    const option = (await toggle())[0];
    expect((await add({ ...BODY, safetyStock: '40', currentStock: '100' })).status).toBe(200);
    const inventory = await rows(INV);
    expect(inventory).toHaveLength(15);
    const row = inventory.find((item) => item.itemId === BODY.itemId);
    expect(row).toMatchObject({
      itemName: option.itemName,
      unitPrice: option.unitPrice,
      uomName: option.uomName,
      category: '자재',
      currentStock: 100,
      safetyStock: 40,
      totalAmount: 100 * num(option.unitPrice),
      warehouseName: '2공장 원자재 창고',
      warehouseType: 'MATERIAL',
      statusCode: 'NORMAL',
    });
    expect(inventory.filter((item) => item.itemId !== BODY.itemId)).toEqual(before);
    expect(new Set(inventory.map((item) => item.itemNumber)).size).toBe(15);
    expect(await get(ITEM(BODY.itemId))).toMatchObject({
      itemNumber: row?.itemNumber,
      itemName: option.itemName,
      currentStock: 100,
      safetyStock: 40,
      unitPrice: option.unitPrice,
      supplierCompanyName: option.supplierCompanyName,
      warehouseId: 'wh-003',
      warehouseName: '2공장 원자재 창고',
      warehouseNumber: 'WH-003',
      stockMovement: [],
    });
    // 이름 검색과 자재 목록(구매 요청이 읽는다)에서도 같은 자재
    expect(await rows(`${INV}&type=ITEM_NAME&keyword=${str(option.itemName)}`)).toEqual([row]);
    expect(await data('POST', '/scm-pp/iv/items/info', { itemIds: [BODY.itemId] })).toEqual([
      {
        itemId: BODY.itemId,
        itemName: option.itemName,
        itemNmber: row?.itemNumber,
        unitPrice: option.unitPrice,
        supplierName: option.supplierCompanyName,
      },
    ]);
  });

  it('고른 창고의 조회에만 더해진다', async () => {
    await add(BODY);
    const here = await inWarehouse('2공장 원자재 창고');
    expect(here).toHaveLength(15);
    expect(here.filter((row) => row.itemId === BODY.itemId)).toMatchObject([
      { currentStock: 100, safetyStock: 40, warehouseName: '2공장 원자재 창고' },
    ]);
    for (const name of ['1공장 창고', '3공장 부품 창고'])
      expect(await inWarehouse(name)).toHaveLength(14);
  });

  it('재고 금액이 그만큼 늘고, 안전재고보다 적으면 부족 목록과 통계에 든다', async () => {
    const total = await week(IV_STATS, 'total_stock');
    const [emergency, warning] = [
      await week(LOW_STATS, 'total_emergency'),
      await week(LOW_STATS, 'total_warning'),
    ];
    const price = num((await toggle())[0].unitPrice);
    await add({ ...BODY, currentStock: 10 });
    await add({ ...BODY, itemId: 'item-wh-016', currentStock: 30 });
    await add({ ...BODY, itemId: 'item-wh-017', currentStock: 40 });
    const added = (await rows(INV)).filter((row) => NEW_IDS.includes(str(row.itemId)));
    expect(added.map((row) => row.statusCode)).toEqual(['URGENT', 'CAUTION', 'NORMAL']);
    expect(added[0].totalAmount).toBe(10 * price);
    expect(await week(IV_STATS, 'total_stock')).toBe(
      total + added.reduce((sum, row) => sum + num(row.totalAmount), 0),
    );
    expect(await week(LOW_STATS, 'total_emergency')).toBe(emergency + 1);
    expect(await week(LOW_STATS, 'total_warning')).toBe(warning + 1);
    for (const path of [LOW, LOW_PREVIEW]) {
      const low = (await rows(path)).filter((row) => NEW_IDS.includes(str(row.itemId)));
      expect(low.map((row) => row.itemId)).toEqual(['item-wh-015', 'item-wh-016']);
    }
    expect((await rows(LOW)).find((row) => row.itemId === BODY.itemId)).toMatchObject({
      warehouseName: '2공장 원자재 창고',
      warehouseNumber: 'WH-003',
    });
  });

  it('부족한 새 자재의 구매 요청은 그 이름과 단가로 만들어진다', async () => {
    const option = (await toggle())[0];
    await add({ ...BODY, currentStock: 10 });
    await data('POST', '/scm-pp/mm/stock-purchase-requisitions', {
      items: [{ productId: BODY.itemId, quantity: 30 }],
    });
    const [newest] = await rows('/scm-pp/mm/purchase-requisitions?page=0&size=1');
    const detail = await get(
      `/scm-pp/mm/purchase-requisitions/${str(newest.purchaseRequisitionId)}`,
    );
    expect(detail.items).toMatchObject([
      {
        itemName: option.itemName,
        quantity: 30,
        unitPrice: option.unitPrice,
        amount: 30 * num(option.unitPrice),
      },
    ]);
  });
});

describe('추가한 자재의 재고 이동과 추이', () => {
  const history = async () =>
    RowsSchema.parse((await get(`${ITEM(BODY.itemId)}/stock-history`)).points).map((point) => [
      point.date,
      point.stock,
    ]);

  it('보관 창고에서 나가면 줄고 들어오면 는다. 다른 창고끼리는 그대로', async () => {
    await add(BODY);
    await move(BODY.itemId, 'wh-003', 'wh-001', 30);
    await move(BODY.itemId, 'wh-001', 'wh-003', 5);
    await move(BODY.itemId, 'wh-001', 'wh-002', 9);
    expect((await get(ITEM(BODY.itemId))).currentStock).toBe(75);
    expect((await rows(INV)).find((row) => row.itemId === BODY.itemId)?.currentStock).toBe(75);
    const moves = RowsSchema.parse((await get(ITEM(BODY.itemId))).stockMovement);
    expect(moves.map((row) => row.quantity)).toEqual([9, 5, 30]);
    // 같은 화면의 최근 재고 이동에도 자재 이름으로
    const name = (await get(ITEM(BODY.itemId))).itemName;
    expect((await rows(TRANSFERS)).slice(0, 3).map((row) => row.itemName)).toEqual([
      name,
      name,
      name,
    ]);
    // 다른 품목의 기준 창고는 여전히 1공장 창고
    await move('item-1001', 'wh-003', 'wh-002', 4);
    expect((await get(ITEM('item-1001'))).currentStock).toBe(120);
  });

  it('추가한 날 전은 0, 그날 넣은 수량에서 시작해 현재고에서 끝난다(다음 날 봐도)', async () => {
    // 로그인은 어제 시작했다
    vi.setSystemTime(new Date('2026-11-23T03:00:00Z'));
    await rows(INV);
    vi.setSystemTime(new Date('2026-11-24T03:00:00Z'));
    await add(BODY);
    const points = await history();
    expect(points).toHaveLength(30);
    expect(points.at(-1)).toEqual(['2026-11-24', 100]);
    expect(points.slice(0, -1).map(([, stock]) => stock)).toEqual(Array(29).fill(0));
    vi.setSystemTime(new Date('2026-11-25T03:00:00Z'));
    await move(BODY.itemId, 'wh-003', 'wh-001', 30);
    expect((await history()).slice(-3)).toEqual([
      ['2026-11-23', 0],
      ['2026-11-24', 100],
      ['2026-11-25', 70],
    ]);
  });

  it('안전재고를 고치면 목록과 상세가 같이 바뀐다', async () => {
    await add(BODY);
    await mockCall('PATCH', `${ITEM(BODY.itemId)}/safety-stock?safetyStock=300`);
    expect(await get(ITEM(BODY.itemId))).toMatchObject({ safetyStock: 300, statusCode: 'URGENT' });
    expect((await rows(INV)).find((row) => row.itemId === BODY.itemId)).toMatchObject({
      safetyStock: 300,
      statusCode: 'URGENT',
    });
  });
});

describe('로그인별로, 잘못된 요청은 거절한다', () => {
  it('다른 로그인의 재고 목록, 선택, 상세에는 없다', async () => {
    await add(BODY, 'Bearer a');
    expect(await rows(INV, 'Bearer a')).toHaveLength(15);
    expect(await rows(INV, 'Bearer b')).toHaveLength(WAREHOUSE_ITEMS.length);
    expect((await toggle('Bearer b')).map((row) => row.itemId)).toEqual(NEW_IDS);
    expect((await mockCall('GET', ITEM(BODY.itemId), { auth: 'Bearer a' })).status).toBe(200);
    expect((await mockCall('GET', ITEM(BODY.itemId), { auth: 'Bearer b' })).status).toBe(404);
  });

  it.each<[string, Row, number]>([
    ['이미 재고에 있는 품목', { ...BODY, itemId: 'item-1001' }, 409],
    ['모르는 품목', { ...BODY, itemId: 'nope' }, 404],
    ['모르는 창고', { ...BODY, warehouseId: 'wh-999' }, 404],
    ['숫자가 아닌 수량', { ...BODY, currentStock: 'abc' }, 400],
    ['빈 수량', { ...BODY, currentStock: '' }, 400],
    ['배열 수량', { ...BODY, currentStock: [5] }, 400],
    ['참거짓 수량', { ...BODY, currentStock: true }, 400],
    ['객체 안전재고', { ...BODY, safetyStock: {} }, 400],
    ['null 안전재고', { ...BODY, safetyStock: null }, 400],
    ['16진수 글자', { ...BODY, currentStock: '0x10' }, 400],
    ['지수 글자', { ...BODY, currentStock: '1e3' }, 400],
    ['무한대 글자', { ...BODY, currentStock: 'Infinity' }, 400],
    ['안전한 정수가 아닌 수량', { ...BODY, currentStock: '9007199254740993' }, 400],
    ['안전한 정수가 아닌 안전재고', { ...BODY, safetyStock: 9007199254740992 }, 400],
    ['소수 수량', { ...BODY, currentStock: 1.5 }, 400],
    ['소수 글자 안전재고', { ...BODY, safetyStock: '1.5' }, 400],
    ['끝없이 큰 수량', { ...BODY, currentStock: '9'.repeat(310) }, 400],
    ['끝없이 큰 안전재고', { ...BODY, safetyStock: '9'.repeat(310) }, 400],
    ['음수 안전재고', { ...BODY, safetyStock: -1 }, 400],
    ['없는 안전재고', { itemId: BODY.itemId, currentStock: 1, warehouseId: 'wh-003' }, 400],
  ])('%s: 재고를 바꾸지 않는다', async (_, body, status) => {
    const before = await rows(INV);
    expect(await add(body)).toMatchObject({ status, body: { success: false } });
    expect(await rows(INV)).toEqual(before);
    expect((await toggle()).map((row) => row.itemId)).toEqual(NEW_IDS);
  });

  it('같은 자재를 두 번 보내면 두 번째는 409 이고 처음 값이 남는다', async () => {
    expect((await add(BODY)).status).toBe(200);
    expect((await add({ ...BODY, currentStock: 7, warehouseId: 'wh-001' })).status).toBe(409);
    expect(await rows(INV)).toHaveLength(15);
    expect(await get(ITEM(BODY.itemId))).toMatchObject({
      currentStock: 100,
      warehouseId: 'wh-003',
    });
  });
});
