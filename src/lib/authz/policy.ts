/**
 * 인가 규칙 한 곳(계획 8절 3번, 인증 2단계 카드).
 * 페이지 접근(src/proxy.ts), API 접근(src/app/api/proxy/[...path]/route.ts), 메뉴 노출(헤더, 사이드바)이
 * 모두 이 표를 읽는다. 강제는 서버 두 곳만 한다. 메뉴는 보여줄지만 정한다.
 * 비밀 값이 없어 클라이언트도 import 한다(server-only 아님).
 */

export const ROLES = [
  'ALL_ADMIN',
  'MM_USER',
  'MM_ADMIN',
  'SD_USER',
  'SD_ADMIN',
  'IM_USER',
  'IM_ADMIN',
  'FCM_USER',
  'FCM_ADMIN',
  'HRM_USER',
  'HRM_ADMIN',
  'PP_USER',
  'PP_ADMIN',
  'SUPPLIER_ADMIN',
  'CUSTOMER_ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export const isRole = (value: string): value is Role => ROLES.some((role) => role === value);

/** 목록에 role 이 있는지. role 이 string 이어도(클라이언트 캐시) 단언 없이 비교한다 */
export const hasRole = (roles: readonly Role[], role: string): boolean =>
  roles.some((allowed) => allowed === role);

// 업무 그룹
export const MM = ['MM_USER', 'MM_ADMIN'] as const satisfies readonly Role[];
export const SD = ['SD_USER', 'SD_ADMIN'] as const satisfies readonly Role[];
export const IM = ['IM_USER', 'IM_ADMIN'] as const satisfies readonly Role[];
export const FCM = ['FCM_USER', 'FCM_ADMIN'] as const satisfies readonly Role[];
export const HRM = ['HRM_USER', 'HRM_ADMIN'] as const satisfies readonly Role[];
export const PP = ['PP_USER', 'PP_ADMIN'] as const satisfies readonly Role[];

/** 사내 역할 전부(공급사, 고객사 제외). 탭 노출 표가 쓴다 */
export const INTERNAL_ROLES = [
  'ALL_ADMIN',
  ...MM,
  ...SD,
  ...IM,
  ...FCM,
  ...HRM,
  ...PP,
] as const satisfies readonly Role[];

/** 생산, 구매, 영업, 재고 업무를 같이 보는 사내 운영 역할 */
const OPERATIONS = ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] as const satisfies readonly Role[];

export interface AccessArea {
  /** 페이지 경로(세그먼트 단위로 맞춘다). 없으면 API 만 막는 영역 */
  page: string;
  /** 업스트림 API 경로 접두사(/api/proxy 뒤). 없으면 페이지만 막는다 */
  apiPrefixes: readonly string[];
  roles: readonly Role[];
  /** 페이지는 열지만 메뉴에는 안 보일 역할 */
  menuHiddenFor?: readonly Role[];
}

export const ACCESS_AREAS: readonly AccessArea[] = [
  {
    page: '/dashboard',
    apiPrefixes: [], // dashboard API 는 로그인만 되면 통과
    roles: [...ROLES],
    menuHiddenFor: ['SUPPLIER_ADMIN'], // 공급사 메뉴는 영업관리와 재무뿐(데모 계정 표)
  },
  { page: '/purchase', apiPrefixes: ['scm-pp/mm'], roles: [...OPERATIONS, 'SUPPLIER_ADMIN'] },
  { page: '/sales', apiPrefixes: ['business/sd'], roles: [...OPERATIONS, 'CUSTOMER_ADMIN'] },
  {
    page: '/inventory',
    // 재고 화면의 출하, 입고는 scm-pp/sales-orders, scm-pp/purchase-orders 경로를 쓴다
    apiPrefixes: ['scm-pp/iv', 'scm-pp/sales-orders', 'scm-pp/purchase-orders'],
    roles: OPERATIONS,
  },
  // 창고와 안전재고 화면은 재고 API(scm-pp/iv)를 쓴다. 예전엔 페이지 규칙이 없어 누구나 들어가 403 을 봤다
  { page: '/warehouse', apiPrefixes: [], roles: OPERATIONS },
  { page: '/low-stock', apiPrefixes: [], roles: OPERATIONS },
  {
    page: '/finance',
    apiPrefixes: ['business/fcm'],
    roles: ['ALL_ADMIN', ...FCM, 'SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'],
  },
  { page: '/hrm', apiPrefixes: ['business/hrm'], roles: ['ALL_ADMIN', ...HRM] },
  { page: '/production', apiPrefixes: ['scm-pp/pp'], roles: OPERATIONS },
];

/**
 * business/hrm 중 본인 셀프서비스(프로필 화면의 출퇴근, 휴가 신청, 본인 정보).
 * HRM 역할이 없어도 로그인만 되면 허용한다. 관리자용 PII 경로는 영역 표대로 HRM 역할만.
 */
export const HRM_SELF_SERVICE: ReadonlySet<string> = new Set([
  'business/hrm/attendance/check-in',
  'business/hrm/attendance/check-out',
  'business/hrm/leave/request',
  'business/hrm/employees/by-internel-user',
]);

const matchesPage = (pathname: string, page: string) =>
  pathname === page || pathname.startsWith(`${page}/`);

/** 페이지 접근. 표에 없는 페이지(프로필 등)는 로그인만 되면 연다 */
export const canAccessPage = (role: Role, pathname: string): boolean => {
  const area = ACCESS_AREAS.find((a) => matchesPage(pathname, a.page));
  return !area || area.roles.includes(role);
};

/** API 접근. upstreamPath 는 /api/proxy 뒤의 정규화된 경로. 표에 없는 경로는 로그인만 되면 통과 */
export const canAccessApi = (role: Role, upstreamPath: string): boolean => {
  if (HRM_SELF_SERVICE.has(upstreamPath)) return true;
  const area = ACCESS_AREAS.find((a) =>
    a.apiPrefixes.some((prefix) => upstreamPath.startsWith(prefix)),
  );
  return !area || area.roles.includes(role);
};

/** 메뉴에 보일 역할. 페이지 규칙에서 menuHiddenFor 를 뺀다 */
export const menuRoles = (page: string): readonly Role[] => {
  const area = ACCESS_AREAS.find((a) => a.page === page);
  if (!area) return ROLES;
  const hidden = area.menuHiddenFor ?? [];
  return area.roles.filter((role) => !hidden.includes(role));
};
