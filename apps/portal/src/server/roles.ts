/** 포털이 받는 역할. 공급사, 고객사, 그리고 둘 다 보는 사내 관리자. 그 밖의 역할은 로그인 거절(no_role) */
export const PORTAL_ROLES = ['ALL_ADMIN', 'SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const ROLE_LABEL: Record<PortalRole, string> = {
  ALL_ADMIN: '사내 관리자',
  SUPPLIER_ADMIN: '공급사',
  CUSTOMER_ADMIN: '고객사',
};

/** 토큰 역할 중 표 순서로 첫 번째 */
export const pickPortalRole = (roles: readonly string[]): PortalRole | null =>
  PORTAL_ROLES.find((role) => roles.includes(role)) ?? null;

/**
 * 같은 앱 안의 경로만. 앞 글자만 보면 '/\t/evil' 처럼 탭이 섞인 주소가 통과하고 URL 파서가 탭을 지워
 * 외부 주소가 된다(리뷰 P2). 실제로 풀어 보고 출처가 그대로일 때만 풀린 경로를 돌려준다. erp 의 returnTo 와 같은 규칙
 */
const BASE = 'http://same-origin.invalid';
export const safeReturnTo = (value: string | null | undefined): string => {
  if (!value || !value.startsWith('/')) return '/';
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return '/';
    const path = `${url.pathname}${url.search}${url.hash}`;
    // '/a/..//evil' 은 같은 출처로 풀리지만 결과가 '//evil'(외부 주소)이다
    return path.startsWith('//') || path.startsWith('/\\') ? '/' : path;
  } catch {
    return '/';
  }
};
