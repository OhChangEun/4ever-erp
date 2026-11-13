import { describe, expect, it } from 'vitest';
import { chromeHangul } from './chromeHangul';

const root = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};

describe('화면 글자 한글 검사(남은 한국어 문자열 카드)', () => {
  it('통계 카드의 제목(dt)과 값, 단위(dd)를 본다', () => {
    expect(chromeHangul(root('<dl><dt>생산 중인 품목</dt><dd>20건</dd></dl>'))).toEqual([
      '생산 중인 품목',
      '20건',
    ]);
  });

  it('표 본문, 목록 항목, translate="no" 는 서버 데이터라 뺀다', () => {
    expect(
      chromeHangul(
        root(
          '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td><button>모터</button></td></tr></tbody></table>' +
            '<ul><li><button>창고</button></li></ul><h2 translate="no">홍길동</h2>',
        ),
      ),
    ).toEqual([]);
  });
});
