/** 한글 음절의 종성으로 을/를을 고른다. BOM 같은 비한글 대상은 기존 '을'을 유지한다. */
export function koreanObjectParticle(subject: string): '을' | '를' {
  const lastCode = subject.charCodeAt(subject.length - 1);
  // 유니코드 한글 음절은 가(U+AC00)부터 힣(U+D7A3)까지, 음절마다 종성 28개 순서다.
  if (lastCode >= 0xac00 && lastCode <= 0xd7a3 && (lastCode - 0xac00) % 28 === 0) {
    return '를';
  }
  return '을';
}
