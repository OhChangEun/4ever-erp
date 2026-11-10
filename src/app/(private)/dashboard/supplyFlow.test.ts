import { describe, expect, it } from 'vitest';
import { flowSummary, toSankeyData } from './supplyFlow';

const nodes = [
  { id: 'req', name: '구매요청', kind: 'flow' as const },
  { id: 'rej', name: '반려', kind: 'drop' as const },
  { id: 'po', name: '발주', kind: 'flow' as const },
  { id: 'ship', name: '출하', kind: 'flow' as const },
];

describe('toSankeyData', () => {
  it('id 를 인덱스로 바꾼다', () => {
    const r = toSankeyData(nodes, [
      { source: 'req', target: 'po', value: 80 },
      { source: 'req', target: 'rej', value: 20 },
      { source: 'po', target: 'ship', value: 80 },
    ]);
    expect(r.links).toEqual([
      { source: 0, target: 2, value: 80 },
      { source: 0, target: 1, value: 20 },
      { source: 2, target: 3, value: 80 },
    ]);
    expect(r.unknown).toBe(0);
    expect(r.cyclic).toBe(false);
  });

  it('모르는 노드를 가리키는 흐름과 0 이하 값은 빼고 센다', () => {
    const r = toSankeyData(nodes, [
      { source: 'req', target: 'po', value: 80 },
      { source: 'req', target: 'nowhere', value: 5 },
      { source: 'po', target: 'ship', value: 0 },
    ]);
    expect(r.links).toHaveLength(1);
    expect(r.unknown).toBe(2);
  });

  it('순환을 찾는다', () => {
    const r = toSankeyData(nodes, [
      { source: 'req', target: 'po', value: 80 },
      { source: 'po', target: 'req', value: 10 },
    ]);
    expect(r.cyclic).toBe(true);
  });
});

describe('flowSummary', () => {
  it('노드마다 지나간 금액(들어온 것과 나간 것 중 큰 쪽), 새는 금액 합계와 첫 단계 대비 비율', () => {
    const s = flowSummary(nodes, [
      { source: 'req', target: 'po', value: 80 },
      { source: 'req', target: 'rej', value: 20 },
      { source: 'po', target: 'ship', value: 80 },
    ]);
    expect(s.stages).toEqual([
      { id: 'req', name: '구매요청', value: 100 },
      { id: 'po', name: '발주', value: 80 },
      { id: 'ship', name: '출하', value: 80 },
    ]);
    expect(s.dropped).toBe(20);
    expect(s.dropRate).toBe(20);
  });
});
