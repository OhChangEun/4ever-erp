/**
 * 로그아웃 요청. 서버가 세션과 쿠키를 지운다(httpOnly 라 브라우저 JS 는 못 지운다).
 * OIDC 세션이면 서버가 IdP 로그아웃 주소(redirectTo)를 돌려준다. 그 주소로 가야 IdP 세션도 끝나
 * 다음 로그인에서 SSO 로 바로 다시 들어오지 않는다. 데모 세션이면 null.
 */
export const requestLogout = async (): Promise<string | null> => {
  const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(
    () => null,
  );
  const body: unknown = res ? await res.json().catch(() => null) : null;
  if (typeof body !== 'object' || body === null) return null;
  const redirectTo: unknown = Reflect.get(body, 'redirectTo');
  return typeof redirectTo === 'string' ? redirectTo : null;
};
