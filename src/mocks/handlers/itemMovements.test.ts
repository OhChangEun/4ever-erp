// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi } from '@/test/mockApi';
import { WAREHOUSE_ITEMS } from './catalog';
import { WAREHOUSES } from './seed';

/**
 * 카드 "품목 선택과 이동 내역". 품목 선택과 자재 목록이 재고 목록과 같은 품목표에서 나오고, 재고 상세의 이동 내역이
 * 최근 재고 이동 목록과 같은 기록이며 현재고, 재고 추이와 어긋나지 않는지 본다. MPS 드롭다운은 견적이 있는 제품의 BOM 만.
 * 목의 쓰기 결과는 vitest.setup.ts 가 테스트마다 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);

const data = async (method: 'GET' | 'POST', path: string, body?: unknown) =>
  z.object({ data: z.unknown().optional() }).parse(await mockApi(method, path, { body })).data;
const get = async (path: string): Promise<Row> => RecordSchema.parse(await data('GET', path));
const rows = async (path: string) => RowsSchema.parse((await get(path)).content);
const pick = (row: Row, keys: string[]) => Object.fromEntries(keys.map((key) => [key, row[key]]));

/** 시계를 2026-11-13(금) 한국 12시로 고정한다(logistics.test.ts 와 같다) */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T03:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const INV = '/scm-pp/iv/inventory-items?page=0&size=100';
const ITEM = (itemId: string) => `/scm-pp/iv/items/${itemId}`;
const TRANSFERS = '/scm-pp/iv/stock-transfers';
const PLANNED = '/scm-pp/pp/mrp/runs';
const HOME_NAME = '1공장 창고';

const transfer = (itemId: string, stockQuantity: number, from = 'wh-001', to = 'wh-002') =>
  data('POST', TRANSFERS, {
    fromWarehouseId: from,
    toWarehouseId: to,
    itemId,
    stockQuantity,
    uomName: 'EA',
    reason: '재배치',
  });
const detailOf = async (itemId: string) => {
  const detail = await get(ITEM(itemId));
  return { ...detail, moves: RowsSchema.parse(detail.stockMovement) };
};
const historyOf = async (itemId: string) =>
  RowsSchema.parse((await get(`${ITEM(itemId)}/stock-history`)).points).map((point) => ({
    date: str(point.date),
    stock: num(point.stock),
  }));
/** 1공장 창고에서 본 재고 변화. 입고는 더하고 출고는 빼고 이동은 나가면 빼고 들어오면 더한다 */
const change = (move: Row) => {
  const quantity = num(move.quantity);
  if (move.type === 'IN') return quantity;
  if (move.type === 'OUT') return -quantity;
  return (move.to === HOME_NAME ? quantity : 0) - (move.from === HOME_NAME ? quantity : 0);
};

describe('품목 선택과 자재 목록은 재고 목록과 같은 품목이다', () => {
  it('품목 선택은 재고 목록과 같은 순서로 14개, 이름과 단가와 공급사가 재고 상세와 같다', async () => {
    const options = RowsSchema.parse(await data('GET', '/scm-pp/iv/items/toggle'));
    const inventory = await rows(INV);
    const keys = ['itemId', 'itemName', 'unitPrice', 'uomName'];
    expect(options.map((row) => pick(row, keys))).toEqual(inventory.map((row) => pick(row, keys)));
    expect(options).toHaveLength(WAREHOUSE_ITEMS.length);
    for (const option of options) {
      expect(option.supplierCompanyName).toBe(
        (await get(ITEM(str(option.itemId)))).supplierCompanyName,
      );
      const supplier = await get(`/scm-pp/mm/supplier/${str(option.supplierCompanyId)}`);
      expect(RecordSchema.parse(supplier.supplierInfo).supplierName).toBe(
        option.supplierCompanyName,
      );
    }
  });

  it('자재 목록은 보낸 품목만 준다. 번호, 이름, 단가가 재고 목록과 같다', async () => {
    const inventory = await rows(INV);
    // 화면(자재 구매 요청)은 고른 계획 주문의 품목 id 를 { itemIds } 로 보낸다
    const orders = await rows(`${PLANNED}?status=REJECTED&page=0&size=10`);
    const itemIds = orders.map((row) => str(row.itemId));
    expect(new Set(itemIds).size).toBeGreaterThan(1);
    const info = RowsSchema.parse(await data('POST', '/scm-pp/iv/items/info', { itemIds }));
    expect(info.map((row) => str(row.itemId)).sort()).toEqual([...new Set(itemIds)].sort());
    for (const row of info) {
      const stock = inventory.find((item) => item.itemId === row.itemId);
      expect(pick(row, ['itemName', 'unitPrice'])).toEqual(
        pick(stock ?? {}, ['itemName', 'unitPrice']),
      );
      expect(row.itemNmber).toBe(stock?.itemNumber);
      expect(row.itemName).toBe(orders.find((order) => order.itemId === row.itemId)?.itemName);
      expect(row.supplierName).toBe((await get(ITEM(str(row.itemId)))).supplierCompanyName);
    }
  });

  it('모르는 품목은 빠지고 같은 품목을 두 번 보내도 한 줄이다. 빈 목록이면 빈 목록', async () => {
    const info = async (itemIds: string[]) =>
      RowsSchema.parse(await data('POST', '/scm-pp/iv/items/info', { itemIds })).map(
        (row) => row.itemId,
      );
    expect(await info(['item-1002', 'nope', 'item-1002'])).toEqual(['item-1002']);
    expect(await info([])).toEqual([]);
  });
});

describe('재고 상세의 이동 내역은 최근 재고 이동과 같은 기록이다', () => {
  const same = (move: Row) => ({
    ...pick(move, ['type', 'quantity', 'uomName', 'managerName']),
    at: move.workDate ?? move.movementDate,
  });

  it('품목마다 최근 재고 이동 목록의 그 품목 행과 같고 참조 번호는 겹치지 않는다', async () => {
    const list = await rows(TRANSFERS);
    const references: string[] = [];
    let shown = 0;
    for (const { itemId, itemName } of WAREHOUSE_ITEMS) {
      const { moves } = await detailOf(itemId);
      expect(moves.map(same)).toEqual(list.filter((row) => row.itemName === itemName).map(same));
      references.push(...moves.map((move) => str(move.referenceNumber)));
      shown += moves.length;
    }
    expect(shown).toBe(list.length);
    expect(new Set(references).size).toBe(references.length);
    expect(references).not.toContain('IN-2026-001');
    expect(references).not.toContain('');
  });

  it('출발과 도착은 실제 창고와 그 품목의 공급사다', async () => {
    const warehouses = WAREHOUSES.map((row) => row.warehouseName);
    const types = new Set<unknown>();
    for (const { itemId } of WAREHOUSE_ITEMS) {
      const detail = await detailOf(itemId);
      for (const move of detail.moves) {
        types.add(move.type);
        if (move.type === 'IN')
          expect([move.from, move.to]).toEqual([
            (await get(ITEM(itemId))).supplierCompanyName,
            HOME_NAME,
          ]);
        else expect(move.from).toBe(HOME_NAME);
        if (move.type === 'MOVE') {
          expect(warehouses).toContain(move.to);
          expect(move.to).not.toBe(HOME_NAME);
        }
      }
    }
    expect([...types].sort()).toEqual(['IN', 'MOVE', 'OUT']);
  });

  it('재고를 옮기면 최근 재고 이동과 그 품목 상세 맨 위에 같은 기록이 생기고 다른 품목에는 안 생긴다', async () => {
    const others = (await detailOf('item-1002')).moves;
    await transfer('item-1001', 3);
    await transfer('item-1001', 5, 'wh-003', 'wh-001');
    const list = (await rows(TRANSFERS)).filter((row) => row.itemName === '모터 A');
    const { moves } = await detailOf('item-1001');
    expect(moves.map(same)).toEqual(list.map(same));
    expect(moves.slice(0, 2)).toMatchObject([
      { type: 'MOVE', quantity: 5, from: '2공장 원자재 창고', to: HOME_NAME, note: '재배치' },
      { type: 'MOVE', quantity: 3, from: HOME_NAME, to: '1공장 제품 창고', note: '재배치' },
    ]);
    expect(new Set(moves.map((move) => move.referenceNumber)).size).toBe(moves.length);
    expect((await detailOf('item-1002')).moves).toEqual(others);
  });

  it('어제 옮긴 기록도 시각 순서대로 낀다(밤을 넘긴 로그인)', async () => {
    await transfer('item-1001', 3);
    vi.setSystemTime(new Date('2026-11-14T03:00:00Z'));
    const list = await rows(TRANSFERS);
    const times = list.map((row) => str(row.workDate));
    expect(times).toEqual([...times].sort().reverse());
    // 씨앗은 로그인한 날 전날(11-12)까지라 11-13 12시에 옮긴 것이 맨 위, 그다음이 씨앗의 11-12 15:30 이다
    expect(list[0]).toMatchObject({ type: 'MOVE', itemName: '모터 A', quantity: 3 });
    expect(list[1]).toMatchObject({ workDate: '2026-11-12T15:30:00' });
  });

  it('여러 번 옮겨 오래된 기록이 밀려나도 참조 번호는 겹치지 않는다', async () => {
    for (let i = 0; i < 20; i += 1) await transfer('item-1001', 1);
    const { moves } = await detailOf('item-1001');
    expect(moves.length).toBeGreaterThan(10);
    expect(new Set(moves.map((move) => move.referenceNumber)).size).toBe(moves.length);
  });
});

describe('이동 내역, 현재고, 재고 추이가 서로 맞는다', () => {
  it('현재고에서 이동 내역을 거꾸로 되돌려도 재고가 음수가 되지 않는다', async () => {
    await transfer('item-1001', 3);
    await transfer('item-wh-003', 5, 'wh-002', 'wh-001');
    for (const { itemId } of WAREHOUSE_ITEMS) {
      const detail = await detailOf(itemId);
      let stock = num((await get(ITEM(itemId))).currentStock);
      for (const move of detail.moves) {
        stock -= change(move);
        expect(stock, itemId).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('재고 추이는 현재고에서 끝나고, 날마다 이동 내역을 뺀 나머지는 하루 사용량(3~9개)뿐이다', async () => {
    await transfer('item-1001', 3);
    await transfer('item-wh-003', 5, 'wh-002', 'wh-001');
    for (const { itemId } of WAREHOUSE_ITEMS) {
      const detail = await detailOf(itemId);
      const points = await historyOf(itemId);
      expect(points.at(-1)?.stock).toBe((await get(ITEM(itemId))).currentStock);
      points.slice(1).forEach((point, i) => {
        const moved = detail.moves
          .filter((move) => str(move.movementDate).startsWith(point.date))
          .reduce((sum, move) => sum + change(move), 0);
        const used = points[i].stock + moved - point.stock;
        expect([used >= 3, used <= 9], `${itemId} ${point.date} ${used}`).toEqual([true, true]);
      });
      expect(Math.min(...points.map((point) => point.stock))).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(['item-1001', 'item-1002', 'item-wh-001'])(
    '%s: 자정이 지나도 이동 기록 날짜와 지난 날의 재고가 그대로다(재리뷰)',
    async (itemId) => {
      const points = await historyOf(itemId);
      const { moves } = await detailOf(itemId);
      expect(moves).toHaveLength(1);
      vi.setSystemTime(new Date('2026-11-14T03:00:00Z'));
      expect((await detailOf(itemId)).moves).toEqual(moves);
      const after = await historyOf(itemId);
      // 창이 하루 밀려 첫날이 빠지고 오늘이 더해진다. 옮긴 것이 없으니 오늘은 어제와 같다
      expect(after.slice(0, -1)).toEqual(points.slice(1));
      expect(after.at(-1)).toEqual({ date: '2026-11-14', stock: points.at(-1)?.stock });
    },
  );

  it('오늘 옮긴 수량은 오늘 점만 바꾼다. 다른 창고끼리의 이동은 추이와 현재고를 바꾸지 않는다', async () => {
    const before = await historyOf('item-1001');
    await transfer('item-1001', 3);
    const after = await historyOf('item-1001');
    expect(after.slice(0, -1)).toEqual(before.slice(0, -1));
    expect(after.at(-1)?.stock).toBe((before.at(-1)?.stock ?? 0) - 3);
    await transfer('item-1001', 40, 'wh-002', 'wh-003');
    expect(await historyOf('item-1001')).toEqual(after);
    expect((await detailOf('item-1001')).moves[0]).toMatchObject({
      type: 'MOVE',
      quantity: 40,
      from: '1공장 제품 창고',
      to: '2공장 원자재 창고',
    });
  });

  it('오늘 16번 옮겨 오래된 기록이 목록에서 밀려나도 어제까지의 점은 그대로다', async () => {
    const before = await historyOf('item-1001');
    for (let i = 0; i < 16; i += 1) await transfer('item-1001', 1);
    const after = await historyOf('item-1001');
    expect(after.slice(0, -1)).toEqual(before.slice(0, -1));
    expect(after.at(-1)?.stock).toBe((before.at(-1)?.stock ?? 0) - 16);
    // 다음 날에 봐도 어제(13일)의 점은 16 이 빠진 값이다(목록에 남은 14건이 아니라)
    vi.setSystemTime(new Date('2026-11-14T03:00:00Z'));
    const nextDay = await historyOf('item-1001');
    expect(nextDay.at(-1)?.stock).toBe(104);
    expect(nextDay.at(-2)?.date).toBe('2026-11-13');
    // 그날 본 값 그대로다. 옮긴 것이 없는 밤에는 재고가 안 바뀐다
    expect(nextDay.at(-2)?.stock).toBe(104);
    expect(nextDay.at(-2)).toEqual(after.at(-1));
  });

  it('서버 시간대가 UTC 여도 재고 추이의 마지막 날은 한국 날짜다(이동 기록과 같은 날)', async () => {
    vi.stubEnv('TZ', 'UTC');
    // 한국 2026-11-14 01시
    vi.setSystemTime(new Date('2026-11-13T16:00:00Z'));
    await transfer('item-1001', 3);
    const [move] = (await detailOf('item-1001')).moves;
    expect(str(move.movementDate).slice(0, 10)).toBe('2026-11-14');
    expect((await historyOf('item-1001')).at(-1)?.date).toBe('2026-11-14');
  });
});

describe('품목 정보로 만든 구매 요청', () => {
  const REQUESTS = '/scm-pp/mm/purchase-requisitions';
  const requestCount = async () => {
    const week = RecordSchema.parse((await get('/scm-pp/mm/statistics')).week);
    return num(RecordSchema.parse(week.purchaseRequestCount).value);
  };

  it('확정 모달이 보인 단가와 총액이 저장된 요청의 줄, 목록 총액과 같고 요청 건수가 1 는다', async () => {
    const orders = await rows(`${PLANNED}?status=REJECTED&page=0&size=10`);
    const itemIds = orders.map((row) => str(row.itemId));
    const info = RowsSchema.parse(await data('POST', '/scm-pp/iv/items/info', { itemIds }));
    // 모달은 주문 수량 × 자재 목록 단가를 더한다
    const shown = orders.map((order) => {
      const unitPrice = num(info.find((row) => row.itemId === order.itemId)?.unitPrice);
      return { unitPrice, amount: num(order.quantity) * unitPrice };
    });
    const total = shown.reduce((sum, row) => sum + row.amount, 0);
    expect(total).toBeGreaterThan(0);

    const before = await requestCount();
    await data('POST', '/scm-pp/mm/stock-purchase-requisitions', {
      items: orders.map((order) => ({
        productId: order.itemId,
        quantity: order.quantity,
        mrpRunId: order.mrpRunId,
      })),
    });
    const [request] = await rows(`${REQUESTS}?page=0&size=10`);
    expect(request.totalAmount).toBe(total);
    const detail = await get(`${REQUESTS}/${str(request.purchaseRequisitionId)}`);
    expect(detail.totalAmount).toBe(total);
    expect(RowsSchema.parse(detail.items).map((row) => pick(row, ['unitPrice', 'amount']))).toEqual(
      shown,
    );
    expect(await requestCount()).toBe(before + 1);
  });

  it('안전재고 부족 품목의 요청(계획 주문 없음)도 부족 목록의 단가로 저장한다', async () => {
    const shortage = await rows('/scm-pp/iv/shortage?page=0&size=100');
    await data('POST', '/scm-pp/mm/stock-purchase-requisitions', {
      items: shortage.map((row) => ({ productId: row.itemId, quantity: 10 })),
    });
    const [request] = await rows(`${REQUESTS}?page=0&size=10`);
    expect(request.totalAmount).toBe(
      shortage.reduce((sum, row) => sum + num(row.unitPrice) * 10, 0),
    );
  });
});

describe('MPS 드롭다운', () => {
  it('견적이 있는 제품의 BOM 이 전부 나오고, 고르면 빈 줄이 없다', async () => {
    const quoted = new Set(
      (await rows('/scm-pp/pp/quotations?page=0&size=1000')).map((row) => row.productName),
    );
    const boms = (await rows('/scm-pp/pp/boms?page=0&size=1000')).filter((bom) =>
      quoted.has(bom.productName),
    );
    const options = RowsSchema.parse(await data('GET', '/scm-pp/pp/mps/boms/toggle'));
    expect(options).toEqual(boms.map((bom) => ({ key: bom.bomId, value: bom.productName })));
    expect(options.length).toBeGreaterThan(0);
    for (const { key } of options)
      expect(
        await rows(
          `/scm-pp/pp/quotations/mps?bomId=${str(key)}&startDate=2026-11-13&endDate=2026-11-13&page=0&size=10`,
        ),
        str(key),
      ).not.toEqual([]);
  });
});
