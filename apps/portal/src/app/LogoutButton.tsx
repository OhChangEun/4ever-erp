'use client';

import { useState } from 'react';

/**
 * 포털 로그아웃. 서버가 Keycloak 로그아웃 주소를 주면 그리로 가서 IdP 세션까지 끝낸다.
 * 요청이 실패하면 버튼을 다시 풀고 알린다(세션은 그대로라 다시 눌러야 한다, 리뷰 P2).
 */
export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const logout = async () => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error(`logout ${res.status}`);
      const body: unknown = await res.json().catch(() => null);
      const redirectTo =
        typeof body === 'object' &&
        body !== null &&
        'redirectTo' in body &&
        typeof body.redirectTo === 'string'
          ? body.redirectTo
          : '/signed-out';
      window.location.assign(redirectTo);
    } catch {
      setPending(false);
      setFailed(true);
    }
  };

  return (
    <>
      {failed && (
        <span className="error" role="status">
          로그아웃하지 못했습니다. 다시 눌러 주세요.
        </span>
      )}
      <button type="button" onClick={logout} disabled={pending}>
        로그아웃
      </button>
    </>
  );
}
