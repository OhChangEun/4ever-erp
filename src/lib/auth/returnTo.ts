/**
 * 로그인 뒤 돌아갈 경로. 같은 사이트 안의 경로만 허용한다(오픈 리다이렉트 방지).
 * 정규식으로 앞 글자만 보면 안 된다. 브라우저와 URL 파서는 탭, 줄바꿈을 지우고 '\\' 를 '/' 로 읽어
 * '/\t/evil' 이 '//evil'(외부 주소)이 된다(SSO 포털 카드 리뷰 P2 에서 발견). 그래서 실제로 풀어 보고
 * 출처가 그대로인지 확인한 뒤, 풀린 경로(경로, 쿼리, 해시)만 돌려준다.
 * 로그인 페이지(클라이언트)와 OIDC 콜백(서버)이 같이 쓴다.
 */
const BASE = 'http://same-origin.invalid';

export const safeReturnTo = (value: string | null | undefined, fallback = '/dashboard'): string => {
  if (!value || !value.startsWith('/')) return fallback;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // '/a/..//evil' 은 같은 출처로 풀리지만 결과가 '//evil' 이다. 다시 쓰면 외부 주소가 된다(리뷰 P2)
    return path.startsWith('//') || path.startsWith('/\\') ? fallback : path;
  } catch {
    return fallback;
  }
};
