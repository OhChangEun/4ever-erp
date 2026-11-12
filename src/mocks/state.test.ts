// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import {
  MAX_CREATED_ROWS,
  MAX_MOCK_SESSIONS,
  addCreated,
  mockState,
  resetMockState,
} from './state';

const requestAs = (auth?: string) =>
  new Request('http://localhost/x', { headers: auth ? { Authorization: auth } : {} });

describe('목 상태 저장소', () => {
  it('같은 Authorization 은 같은 상태를 다시 받고, 다른 Authorization 은 처음 상태를 받는다', () => {
    const counter = mockState(() => ({ count: 0 }));
    counter(requestAs('Bearer a')).count += 1;
    expect(counter(requestAs('Bearer a')).count).toBe(1);
    expect(counter(requestAs('Bearer b')).count).toBe(0);
  });

  it('Authorization 이 없는 요청(브라우저 MSW, 단위 테스트)은 저장소 하나를 같이 쓴다', () => {
    const counter = mockState(() => ({ count: 0 }));
    counter(requestAs()).count += 1;
    expect(counter(requestAs()).count).toBe(1);
    expect(counter(requestAs('Bearer a')).count).toBe(0);
  });

  it('비우면 모든 로그인이 처음 상태로 돌아간다', () => {
    const counter = mockState(() => ({ count: 0 }));
    counter(requestAs('Bearer a')).count += 1;
    counter(requestAs()).count += 1;
    resetMockState();
    expect(counter(requestAs('Bearer a')).count).toBe(0);
    expect(counter(requestAs()).count).toBe(0);
  });

  it('로그인이 상한을 넘으면 가장 오래 안 쓴 로그인부터 지운다', () => {
    const counter = mockState(() => ({ count: 0 }));
    counter(requestAs('Bearer old')).count += 1;
    counter(requestAs('Bearer kept')).count += 1;
    // 사이사이 kept 를 다시 써서 최근으로 올린다. old 는 한 번도 다시 안 쓴다
    for (let i = 0; i < MAX_MOCK_SESSIONS - 1; i += 1) {
      counter(requestAs(`Bearer visitor-${i}`));
      counter(requestAs('Bearer kept'));
    }
    expect(counter(requestAs('Bearer kept')).count).toBe(1);
    expect(counter(requestAs('Bearer old')).count).toBe(0);
  });

  it('만든 행은 상한까지만 남고 오래된 것부터 빠진다. 번호는 버린 뒤에도 이어진다', () => {
    const rows: string[] = [];
    for (let i = 0; i < MAX_CREATED_ROWS + 2; i += 1) addCreated(rows, (serial) => `row-${serial}`);
    expect(rows).toHaveLength(MAX_CREATED_ROWS);
    // 기본 행이 001 이라 만든 행은 002 부터. 앞의 둘(002, 003)이 빠졌다
    expect(rows[0]).toBe('row-004');
    expect(rows.at(-1)).toBe(`row-${String(MAX_CREATED_ROWS + 3).padStart(3, '0')}`);
  });

  it('행이 밀려나면 그 행을 onDrop 에 넘긴다(행에 딸린 저장도 같이 지우게, 리뷰 A2)', () => {
    const rows: string[] = [];
    const dropped: string[] = [];
    for (let i = 0; i < MAX_CREATED_ROWS + 2; i += 1)
      addCreated(
        rows,
        (serial) => `row-${serial}`,
        2,
        (row) => dropped.push(row),
      );
    expect(dropped).toEqual(['row-002', 'row-003']);
  });

  it('행 번호는 목록마다 따로 세고, 시작 번호를 줄 수 있다', () => {
    const first: string[] = [];
    const second: string[] = [];
    addCreated(first, (serial) => serial);
    addCreated(first, (serial) => serial);
    addCreated(second, (serial) => serial, 5);
    expect(first).toEqual(['002', '003']);
    expect(second).toEqual(['005']);
  });

  it('핸들러의 쓰기 결과도 비우면 처음 상태다', async () => {
    const LIST = '/scm-pp/mm/purchase-requisitions';
    await mockApi('POST', `${LIST}/pr-001/reject`, { body: { comment: '예산 초과' } });
    expect(await mockApi('GET', LIST)).toMatchObject({
      data: { content: [{ statusCode: 'REJECTED' }] },
    });
    resetMockState();
    expect(await mockApi('GET', LIST)).toMatchObject({
      data: { content: [{ statusCode: 'PENDING' }] },
    });
  });
});
