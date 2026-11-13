/**
 * 화면이 스스로 그리는 글자(표 머리, 버튼, 탭, 화면과 구역 제목 h1 h2, 라벨, 통계 카드 dt dd, 입력 안내, 접근성 이름)에 남은 한글(남은 한국어 문자열 카드).
 * 서버 데이터(품목, 고객사, 창고, 교육 이름)는 한글이 맞아서 뺀다: 표 본문(tbody), 목록 항목(li), 카드 제목(h3 아래),
 * 번역하면 안 되는 글자(translate="no", 사람 이름). 코드에 쓴 글자는 src/i18n/hangulStrings.test.ts 가 따로 본다.
 * 단위 테스트(jsdom)와 e2e(page.evaluate) 가 같이 쓴다. evaluate 로 넘기려고 함수 밖 값을 쓰지 않는다.
 */
export function chromeHangul(root: Element): string[] {
  const hangul = /[가-힣]/;
  const isData = (el: Element) => el.closest('tbody, li, [translate="no"]') !== null;
  const texts = [
    ...root.querySelectorAll(
      'th, button, h1, h2, label, legend, dt, dd, [role="tab"], [role="columnheader"]',
    ),
  ]
    .filter((el) => !isData(el))
    .map((el) => el.textContent);
  const attributes = [...root.querySelectorAll('[placeholder], [aria-label], [title]')]
    .filter((el) => !isData(el))
    .flatMap((el) => ['placeholder', 'aria-label', 'title'].map((name) => el.getAttribute(name)));
  return [
    ...new Set(
      [...texts, ...attributes]
        .map((text) => (text ?? '').trim())
        .filter((text) => hangul.test(text)),
    ),
  ];
}
