// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pathSegment } from './utils';

const at = (url: string, fromEnd: number) => pathSegment(new Request(url), fromEnd);

/** RegExp 로 등록한 핸들러(안전재고, 배송 시작, 전표 완료)가 주소에서 id 를 꺼낼 때 쓴다(리뷰 P2) */
describe('pathSegment', () => {
  it('뒤에서 센 조각을 준다. 쿼리 문자열은 세지 않는다', () => {
    const url = 'http://localhost/api/proxy/scm-pp/iv/items/item-1001/safety-stock?safetyStock=777';
    expect(at(url, 1)).toBe('safety-stock');
    expect(at(url, 2)).toBe('item-1001');
  });

  it('끝 슬래시는 조각으로 세지 않는다', () => {
    const url =
      'http://localhost/api/proxy/scm-pp/iv/items/item-1001/safety-stock/?safetyStock=777';
    expect(at(url, 2)).toBe('item-1001');
    expect(at('http://localhost/api/proxy/scm-pp/mm/po-001/start-delivery//', 2)).toBe('po-001');
  });

  it('인코딩된 id 는 풀어서 준다', () => {
    const url =
      'http://localhost/api/proxy/business/fcm/invoice/ar/inv%20ar%2F1/receivable/complete';
    expect(at(url, 3)).toBe('inv ar/1');
  });

  it('잘못된 인코딩이면 받은 글자 그대로 준다', () => {
    expect(at('http://localhost/api/proxy/scm-pp/mm/po%E0%A4%A/start-delivery', 2)).toBe(
      'po%E0%A4%A',
    );
  });

  it('조각이 모자라면 빈 문자열', () => {
    expect(at('http://localhost/a', 5)).toBe('');
  });
});
