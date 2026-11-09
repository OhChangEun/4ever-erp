/**
 * 로그인 뒤 돌아갈 경로. 같은 사이트 안의 경로만 허용한다(오픈 리다이렉트 방지).
 * '/'로 시작하되 다음 글자가 '/'나 '\'면 거부한다. '//evil', '/\evil' 은 브라우저가 외부 주소로 바꾼다.
 * 로그인 페이지(클라이언트)와 OIDC 콜백(서버)이 같이 쓴다.
 */
export const safeReturnTo = (value: string | null | undefined, fallback = '/dashboard'): string =>
  value && /^\/(?![/\\])/.test(value) ? value : fallback;
