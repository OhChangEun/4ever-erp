// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { mockApi } from '@/test/mockApi';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import { addDays } from './seed';

/**
 * 카드 "날짜가 지나도 같은 데모 데이터". 시계를 다음 날, 다음 달로 옮겨 같은 id 가 같은 값인지 본다.
 * 목의 쓰기 결과는 vitest.setup.ts 가 테스트마다 비운다.
 */
type Row = Record<string, unknown>;
const RecordSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RecordSchema);
const str = (value: unknown) => z.string().parse(value);
const num = (value: unknown) => z.number().parse(value);

const call = async (method: 'GET' | 'PUT' | 'PATCH' | 'POST', path: string, auth?: string) =>
  z.object({ data: z.unknown().optional() }).parse(await mockApi(method, path, { auth })).data;
const get = async (path: string, auth?: string): Promise<Row> =>
  RecordSchema.parse(await call('GET', path, auth));
const rows = async (path: string, auth?: string) =>
  RowsSchema.parse(
    (await get(`${path}${path.includes('?') ? '&' : '?'}page=0&size=5000`, auth)).content,
  );
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);
const byId = (list: Row[], key: string) => new Map(list.map((row) => [str(row[key]), row]));
/** 두 목록에 다 있는 id 의 행을 같은 순서로 */
const shared = (a: Row[], b: Row[], key: string) => {
  const [left, right] = [byId(a, key), byId(b, key)];
  const ids = [...left.keys()].filter((id) => right.has(id)).sort();
  return [ids.map((id) => left.get(id)), ids.map((id) => right.get(id))] as const;
};

const TODAY = '2026-11-13';
/** 한국 12시로 고정한다 */
const setToday = (date: string) => vi.setSystemTime(new Date(`${date}T03:00:00Z`));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  setToday(TODAY);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const HRM = '/business/hrm';
const FCM = '/business/fcm';
const AP = `${FCM}/invoice/ap`;
const AR = `${FCM}/invoice/ar`;
/** 토요일(다음 날)과 다음 달 */
const LATER = ['2026-11-14', '2026-12-14'];

const days = async () => RowsSchema.parse((await get(`${HRM}/attendance/daily-summary`)).days);
const timeOf = (date: string) => rows(`${HRM}/time-record?date=${date}`);

describe('근태는 날짜로 정해진다', () => {
  it.each(LATER)('%s 에 봐도 같은 날짜의 집계가 같다', async (later) => {
    const before = await days();
    setToday(later);
    const [a, b] = shared(before, await days(), 'date');
    expect(a.length).toBeGreaterThanOrEqual(35);
    expect(b).toEqual(a);
  });

  it.each(LATER)('%s 에 봐도 같은 날의 출퇴근 기록이 같다', async (later) => {
    const dates = (await days()).slice(-20).map((day) => str(day.date));
    const read = () => Promise.all(dates.map(timeOf));
    const before = await read();
    setToday(later);
    expect(await read()).toEqual(before);
    expect(before.every((list) => list.length > 0)).toBe(true);
  });

  it.each(LATER)('%s 에 봐도 같은 지난 휴가(사람, 종류, 날짜)가 같다', async (later) => {
    const past = async () =>
      (await rows(`${HRM}/leave-request`))
        .filter((row) => /^leave-\d{8}-/.test(str(row.leaveRequestId)))
        // 남은 일수는 그날까지 쓴 휴가로 세어 달라진다
        .map(({ remainingLeaveDays: _days, ...row }) => row);
    const before = await past();
    setToday(later);
    const after = await past();
    // 두 창에 다 든 기간의 휴가는 빠지거나 새로 생기지 않는다
    const from = str((await days())[0].date);
    const within = (list: Row[]) =>
      list.filter((row) => str(row.startDate) >= from && str(row.startDate) <= TODAY);
    expect(within(before).length).toBeGreaterThan(5);
    expect(within(after)).toEqual(within(before));
  });

  /** 그 해에 쓴(시작한) 승인 휴가 일수를 사람마다. 12주 창을 옮겨 가며 휴가 목록을 모아 센다 */
  const usedIn = async (year: string, until: string) => {
    const seen = new Map<string, Row>();
    for (let day = `${year}-01-01`; ; day = addDays(day, 28)) {
      const at = day < until ? day : until;
      setToday(at);
      for (const row of await rows(`${HRM}/leave-request`, `s-${at}`)) {
        const id = str(row.leaveRequestId);
        // 앞으로의 신청(leave-001~006)은 마지막 날에 본 것만
        if (/^leave-\d{8}-/.test(id) || at === until) seen.set(id, row);
      }
      if (at === until) break;
    }
    const used = new Map<string, number>();
    for (const row of seen.values()) {
      if (row.status !== 'APPROVED' || !str(row.startDate).startsWith(year)) continue;
      const employeeId = str(RecordSchema.parse(row.employee).employeeId);
      used.set(employeeId, (used.get(employeeId) ?? 0) + num(row.numberOfLeaveDays));
    }
    return used;
  };

  it.each(['2026-11-13', '2026-12-31', '2027-01-15'])(
    '%s: 남은 연차는 15일에서 그 휴가가 든 해에 쓴 승인 휴가 전부를 뺀 값이다',
    async (today) => {
      const used: Record<string, Map<string, number>> = {
        2026: await usedIn('2026', today < '2026-12-31' ? today : '2026-12-31'),
      };
      if (today > '2026-12-31') used[2027] = await usedIn('2027', today);
      setToday(today);
      // 앞으로의 신청 중 다음 해에 든 것은 위에서 세지 않아 뺀다
      const list = (await rows(`${HRM}/leave-request`, `s-${today}`)).filter(
        (row) => str(row.startDate).slice(0, 4) in used,
      );
      expect(list.length).toBeGreaterThan(10);
      // 그 해 전부를 세지만 목록은 근태 집계 12주만 보인다
      const from = str((await days())[0].date);
      expect(list.filter((row) => str(row.startDate) < from)).toEqual([]);
      for (const row of list) {
        const employeeId = str(RecordSchema.parse(row.employee).employeeId);
        const year = str(row.startDate).slice(0, 4);
        expect(row.remainingLeaveDays, `${str(row.leaveRequestId)}`).toBe(
          15 - (used[year].get(employeeId) ?? 0),
        );
      }
    },
  );

  it('오래된 휴가가 12주 창에서 빠져도 같은 해에는 남은 연차가 늘지 않는다', async () => {
    const remaining = async () =>
      new Map(
        (await rows(`${HRM}/leave-request`))
          .filter((row) => /^leave-2026/.test(str(row.leaveRequestId)))
          .map((row) => [
            str(RecordSchema.parse(row.employee).employeeId),
            num(row.remainingLeaveDays),
          ]),
      );
    const grown: string[] = [];
    let before = new Map<string, number>();
    for (const today of ['2026-04-10', '2026-06-05', '2026-08-14', '2026-11-13', '2026-12-31']) {
      setToday(today);
      const after = await remaining();
      for (const [id, days] of after)
        if (days > (before.get(id) ?? days)) grown.push(`${today} ${id}`);
      before = new Map([...before, ...after]);
    }
    expect(before.size).toBeGreaterThan(20);
    expect(grown).toEqual([]);
  });

  it.each([TODAY, ...LATER])('%s: 잔디의 날마다 그날 출퇴근 목록과 같다', async (today) => {
    setToday(today);
    const all = await days();
    expect(all.length).toBeGreaterThanOrEqual(60);
    for (const day of all) {
      const list = await timeOf(str(day.date));
      const late = list.filter((row) => row.statusCode === 'LATE').length;
      expect([list.length - late, late], str(day.date)).toEqual([day.present, day.late]);
    }
    // 지각이 하나도 없는 잔디가 되면 위 비교가 뜻이 없다
    expect(Math.max(...all.map((day) => num(day.late)))).toBeGreaterThanOrEqual(3);
  });
});

describe('마감한 달의 매입은 바뀌지 않는다', () => {
  const months = async () => RowsSchema.parse((await get(`${FCM}/analytics/monthly`)).months);
  const closed = (list: Row[], key: string) =>
    list.filter((row) => str(row[key]).slice(0, 7) < TODAY.slice(0, 7));

  it.each(LATER)('%s 에 봐도 마감한 달의 매출, 매입, 순이익이 같다', async (later) => {
    const before = closed(await months(), 'month');
    setToday(later);
    const [a, b] = shared(before, await months(), 'month');
    expect(a.length).toBeGreaterThanOrEqual(10);
    expect(b).toEqual(a);
  });

  it.each(LATER)('%s 에 봐도 마감한 달의 매입 전표와 품목 줄이 같다', async (later) => {
    const closedInvoices = async () => {
      const list = closed(await rows(AP), 'issueDate');
      return Promise.all(
        list.map(async (row) => {
          const detail = await get(`${AP}/${str(row.invoiceId)}`);
          // 상태와 비고는 지난 날로 정해져(지난달 대기 → 완납) 빼고 견준다
          const { statusCode: _status, ...rest } = row;
          return { ...rest, items: detail.items };
        }),
      );
    };
    const before = await closedInvoices();
    setToday(later);
    const [a, b] = shared(before, await closedInvoices(), 'invoiceId');
    expect(a.length).toBeGreaterThanOrEqual(50);
    expect(b).toEqual(a);
  });

  it.each([TODAY, ...LATER])('%s: 달마다 전표 합이 매입이고 적자는 한 달', async (today) => {
    setToday(today);
    const invoices = await rows(AP);
    const points = await months();
    for (const point of points) {
      const own = invoices.filter((row) => str(row.issueDate).startsWith(str(point.month)));
      expect(sum(own.map((row) => num(row.totalAmount))), str(point.month)).toBe(point.purchases);
    }
    expect(points.filter((point) => num(point.netProfit) < 0)).toHaveLength(1);
  });
});

describe('앞으로의 휴가 신청은 그 로그인이 처음 본 날에 고정된다', () => {
  const upcoming = async (auth: string) =>
    (await rows(`${HRM}/leave-request`, auth))
      .filter((row) => /^leave-\d{3}$/.test(str(row.leaveRequestId)))
      .map(({ leaveRequestId, startDate, endDate, status }) => ({
        leaveRequestId,
        startDate,
        endDate,
        status,
      }));

  it.each(LATER)('%s 에도 승인한 휴가와 나머지 신청의 날짜가 같다', async (later) => {
    const auth = 'Bearer leave-a';
    await call('PATCH', `${HRM}/leave/request/leave-001/release`, auth);
    const before = await upcoming(auth);
    expect(before).toHaveLength(6);
    expect(before.find((row) => row.leaveRequestId === 'leave-001')?.status).toBe('APPROVED');
    setToday(later);
    expect(await upcoming(auth)).toEqual(before);
  });

  it('다음 날 들어온 로그인은 그날에서 시작한다', async () => {
    const before = await upcoming('Bearer leave-a');
    setToday('2026-11-16');
    const after = await upcoming('Bearer leave-b');
    expect(after.map((row) => row.startDate)).not.toEqual(before.map((row) => row.startDate));
    for (const row of after) expect(str(row.startDate) > '2026-11-16').toBe(true);
  });

  it('세션(하루) 안에 휴가 첫날이 오지 않는다(승인한 휴가와 그날 출퇴근 기록이 어긋나지 않게)', async () => {
    // 평일에 들어와야 바로 다음 날이 근무일이다
    setToday('2026-11-16');
    for (const row of await upcoming('Bearer leave-a'))
      expect(str(row.startDate) > '2026-11-17').toBe(true);
  });
});

describe('출퇴근 기록 수정', () => {
  const edit = async (date: string, checkIn: string, checkOut: string, auth: string) => {
    const path = `${HRM}/time-record?date=${date}`;
    const before = (await rows(path, auth))[0];
    const id = str(before.timerecordId);
    await mockApi('PUT', `${HRM}/time-record/${id}`, {
      auth,
      body: { checkInTime: checkIn, checkOutTime: checkOut },
    });
    const after = (await rows(path, auth)).find((row) => row.timerecordId === id);
    return { before, after };
  };

  it.each([
    ['연장 있음', '2026-11-13T08:30:00', '2026-11-13T19:45:00', 675, 105],
    ['18시 전에 퇴근하면 연장 0', '2026-11-13T09:00:00', '2026-11-13T17:30:00', 510, 0],
    ['초가 없는 시각', '2026-11-13T09:00', '2026-11-13T18:10', 550, 10],
    ['자정을 넘긴 퇴근', '2026-11-13T09:00:00', '2026-11-14T01:00:00', 960, 420],
    // 재리뷰: 연장이 근무보다 길 수 없다
    ['18시 뒤에 출근', '2026-11-13T19:00:00', '2026-11-13T20:00:00', 60, 60],
  ])('%s: 근무, 연장 시간이 고친 시각을 따른다', async (_, checkIn, checkOut, work, overtime) => {
    const { before, after } = await edit('2026-11-13', checkIn, checkOut, 'Bearer time-a');
    expect(after).toEqual({
      ...before,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      totalWorkMinutes: work,
      overtimeMinutes: overtime,
    });
  });

  it('서버 시간대와 서머타임에 상관없이 같은 값이다(리뷰 A4)', async () => {
    // 카이로는 2026-10-29 자정에 한 시간 뒤로 간다. 그 밤을 넘긴 퇴근(16시간, 18시 뒤 7시간)
    vi.stubEnv('TZ', 'Africa/Cairo');
    const offset = (at: string) => new Date(at).getTimezoneOffset();
    expect(offset('2026-10-29T12:00:00Z')).not.toBe(offset('2026-10-30T12:00:00Z'));
    const { after } = await edit(
      '2026-10-29',
      '2026-10-29T09:00:00',
      '2026-10-30T01:00:00',
      'Bearer time-a',
    );
    expect(after).toMatchObject({ totalWorkMinutes: 960, overtimeMinutes: 420 });
  });

  it.each([
    ['UTC 로 보낸 시각', '2026-11-13T00:00:00.000Z', '2026-11-13T10:30:00.000Z'],
    ['오프셋이 붙은 시각', '2026-11-13T09:00:00+09:00', '2026-11-13T19:30:00+09:00'],
  ])('%s도 한국 18시를 기준으로 센다', async (_, checkIn, checkOut) => {
    vi.stubEnv('TZ', 'America/New_York');
    const { after } = await edit('2026-11-13', checkIn, checkOut, 'Bearer time-a');
    expect(after).toMatchObject({ totalWorkMinutes: 630, overtimeMinutes: 90 });
  });

  it('지각으로 보이게 고쳐도 상태와 잔디는 그대로다(서버의 지각 규칙을 모른다)', async () => {
    const { before, after } = await edit(
      '2026-11-13',
      '2026-11-13T09:40:00',
      '2026-11-13T18:00:00',
      'Bearer time-a',
    );
    expect(before.statusCode).toBe('ON_TIME');
    expect(after?.statusCode).toBe('ON_TIME');
  });
});

describe('미수금 경과 = 매출 전표', () => {
  const BUCKETS: Array<[string, number, number]> = [
    ['CURRENT', -Infinity, 0],
    ['D1_30', 1, 30],
    ['D31_60', 31, 60],
    ['D61_90', 61, 90],
    ['D90_PLUS', 91, Infinity],
  ];
  const fromInvoices = async (today: string, auth: string) => {
    const open = (await rows(AR, auth)).filter((row) => row.statusCode !== 'PAID');
    return BUCKETS.map(([bucket, min, max]) => {
      const own = open.filter((row) => {
        const past = (Date.parse(today) - Date.parse(str(row.dueDate))) / 86_400_000;
        return past >= min && past <= max;
      });
      return { bucket, amount: sum(own.map((row) => num(row.totalAmount))), count: own.length };
    });
  };
  const aging = (auth: string) => get(`${FCM}/analytics/ar-aging`, auth);

  it.each([TODAY, ...LATER])('%s: 구간마다 미납, 수금 대기 전표의 합과 건수', async (today) => {
    setToday(today);
    const expected = await fromInvoices(today, 'Bearer ar-a');
    expect(await aging('Bearer ar-a')).toEqual({ asOf: today, buckets: expected });
    expect(expected[0].count).toBeGreaterThan(0);
    expect(sum(expected.slice(1).map((row) => row.count))).toBeGreaterThan(0);
  });

  it('수금 완료한 전표는 그 로그인의 구간에서만 빠진다', async () => {
    const target = (await rows(AR)).find((row) => row.invoiceId === 'inv-ar-001');
    const overdue = async (auth: string) =>
      RowsSchema.parse((await aging(auth)).buckets).find((row) => row.bucket === 'D90_PLUS');
    const before = await overdue('Bearer ar-a');
    await call('POST', `${AR}/inv-ar-001/receivable/complete`, 'Bearer ar-a');
    expect(await overdue('Bearer ar-a')).toEqual({
      bucket: 'D90_PLUS',
      amount: num(before?.amount) - num(target?.totalAmount),
      count: num(before?.count) - 1,
    });
    expect(await overdue('Bearer ar-b')).toEqual(before);
  });
});

describe('교육 분류 드롭다운', () => {
  it('프로그램이 쓰는 분류가 다 있고 모든 항목에 ko, en 상태 글자가 있다', async () => {
    const options = z
      .array(z.object({ key: z.string(), value: z.string() }))
      .parse(await call('GET', `${HRM}/trainings/categories`));
    const used = new Set((await rows(`${HRM}/program`)).map((row) => row.category));
    expect(new Set(options.map((option) => option.key))).toEqual(used);
    const [koStatus, enStatus] = [RecordSchema.parse(ko.status), RecordSchema.parse(en.status)];
    for (const { key, value } of options) {
      expect(koStatus[key], key).toBe(value);
      expect(str(enStatus[key]), key).not.toBe('');
    }
  });
});
