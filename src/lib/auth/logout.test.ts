import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from './logout';
import { redirectToLogin } from './redirectToLogin';

/**
 * 로그아웃 중 401 이 로그인 이동을 걸어 IdP 로그아웃 이동을 끊던 결함(SSO 포털 카드에서 발견).
 * location.assign 을 가로채 어떤 이동이 걸렸는지 본다.
 */
const assign = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  assign.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      assign,
      origin: 'http://localhost',
      pathname: '/purchase',
      search: '',
    },
  });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  vi.unstubAllGlobals();
});

const IDP_LOGOUT = 'http://idp.test/realms/everp/protocol/openid-connect/logout?id_token_hint=x';

describe('로그아웃', () => {
  it('IdP 로그아웃으로 떠나는 동안 401 처리기는 로그인 이동을 걸지 않는다', async () => {
    let answer: (value: Response) => void = () => {};
    vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => (answer = resolve)));
    const pending = logout({ clearUserInfo: () => {}, goToLogin: () => {} });

    // 로그아웃 POST 가 끝나기 전, 다른 요청이 401 을 받았다
    redirectToLogin();
    answer(new Response(JSON.stringify({ message: 'OK', redirectTo: IDP_LOGOUT })));
    await pending;
    // 로그아웃 뒤에 또 401 이 와도
    redirectToLogin();

    expect(assign.mock.calls.map(([url]) => String(url))).toEqual([IDP_LOGOUT]);
  });

  it('데모 세션(IdP 주소 없음)이면 로그인 화면으로 가고, 그 뒤의 401 은 다시 로그인 이동을 건다', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ message: 'OK' })));
    const goToLogin = vi.fn();
    const clearUserInfo = vi.fn();
    await logout({ clearUserInfo, goToLogin });
    expect(clearUserInfo).toHaveBeenCalled();
    expect(goToLogin).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();

    redirectToLogin();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(String(assign.mock.calls[0]?.[0])).toContain('/login?returnTo=%2Fpurchase');
  });
});
