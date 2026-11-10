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

let leaving = false;

/**
 * 로그아웃으로 페이지를 떠나는 중인가. 로그아웃 POST 가 세션을 지운 뒤 진행 중이던 다른 API 가 401 을 받으면
 * 전역 처리기(redirectToLogin)가 /login 으로 이동을 건다. 그 이동이 IdP 로그아웃 주소로 가는 이동을 끊어
 * Keycloak 세션이 남았다(SSO 포털 카드의 e2e 에서 발견: 로그아웃했는데 포털이 폼 없이 열림).
 */
export const isLeavingForLogout = (): boolean => leaving;

/**
 * 로그아웃 한 곳. 화면(사이드바, 헤더)은 이것만 부른다.
 * OIDC 면 IdP 로그아웃 주소로 전체 이동하고 떠나는 중 표시를 유지한다(페이지가 바뀌며 사라진다).
 * 데모면 표시를 풀고 로그인 화면으로 간다.
 */
export const logout = async ({
  clearUserInfo,
  goToLogin,
}: {
  clearUserInfo: () => void;
  goToLogin: () => void;
}): Promise<void> => {
  leaving = true;
  const idpLogoutUrl = await requestLogout();
  // 저장해 둔 사용자 정보는 지운다(persist). 401 이 와도 위 표시 때문에 로그인 이동을 걸지 않는다
  clearUserInfo();
  if (idpLogoutUrl) {
    window.location.assign(idpLogoutUrl);
    return;
  }
  leaving = false;
  goToLogin();
};
