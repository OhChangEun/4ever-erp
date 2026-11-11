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
export const OPERATIONS = [
  'ALL_ADMIN',
  ...MM,
  ...SD,
  ...IM,
  ...PP,
] as const satisfies readonly Role[];

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
 * business/hrm 중 본인 셀프서비스(프로필 화면의 출퇴근, 휴가 신청).
 * HRM 역할이 없어도 로그인만 되면 허용한다. 관리자용 PII 경로는 영역 표대로 HRM 역할만.
 */
export const HRM_SELF_SERVICE: ReadonlySet<string> = new Set([
  'business/hrm/attendance/check-in',
  'business/hrm/attendance/check-out',
  'business/hrm/leave/request',
]);

const matchesPage = (pathname: string, page: string) =>
  pathname === page || pathname.startsWith(`${page}/`);

/** 페이지 접근. 표에 없는 페이지(프로필 등)는 로그인만 되면 연다 */
export const canAccessPage = (role: Role, pathname: string): boolean => {
  const area = ACCESS_AREAS.find((a) => matchesPage(pathname, a.page));
  return !area || area.roles.includes(role);
};

/** 회사 전체 손익(재무 현황, 시각화 4)을 볼 역할. 재무 화면은 고객사, 공급사도 들어오지만 이건 사내 재무만 */
export const FINANCE_ANALYTICS_ROLES = ['ALL_ADMIN', ...FCM] as const satisfies readonly Role[];

/*
 * 운영 화면은 운영 역할 모두에게 열리지만 쓰기 API 몇 개는 게이트웨이가 더 좁게 막는다.
 * 목록은 게이트웨이 @PreAuthorize 그대로 옮겼다(_4EVER_BE_GW/src/main/java/org/ever/_4ever_be_gw/ 기준).
 * 버튼 노출과 아래 API_RULES 가 같은 목록을 읽는다.
 */
/** scm/pp/controller/PpController.java:326 mrp/convert, :488 quotations/simulate, :545 quotations/confirm */
export const PP_PLANNING_ROLES = ['ALL_ADMIN', ...PP] as const satisfies readonly Role[];
/**
 * scm/im/controller/ImController.java 의 POST 셋. :297 stock-transfers, :423 warehouses,
 * :455 items/info(조회지만 POST)
 */
export const IM_GATEWAY_ROLES = ['ALL_ADMIN', ...IM] as const satisfies readonly Role[];
/**
 * scm/mm/controller/MmController.java 의 POST 넷. :111 supplier, :185 stock-purchase-requisitions,
 * :335 purchase-requisitions/{id}/release, :371 purchase-requisitions/{id}/reject
 */
export const MM_GATEWAY_ROLES = ['ALL_ADMIN', ...MM] as const satisfies readonly Role[];
/** 계획 주문의 자재 구매 요청은 items/info 다음 stock-purchase-requisitions 를 부른다. 둘 다 통과하는 역할만 */
export const MRP_PURCHASE_REQUEST_ROLES: readonly Role[] = IM_GATEWAY_ROLES.filter((role) =>
  hasRole(MM_GATEWAY_ROLES, role),
);

/**
 * 영역보다 좁은 API 규칙. 영역 표보다 먼저 본다.
 * 탭을 숨기는 것만으로는 직접 요청을 못 막는다(시각화 4 리뷰 P1).
 */
export const API_RULES: readonly { prefix: string; roles: readonly Role[] }[] = [
  { prefix: 'business/fcm/analytics', roles: FINANCE_ANALYTICS_ROLES },
  // 이번 달 자재 흐름(시각화 6). 대시보드는 모두에게 열리지만 회사 전체 구매, 재고, 출하 금액은 운영 역할만
  { prefix: 'dashboard/supply-flow', roles: OPERATIONS },
  // 게이트웨이가 403 을 줄 요청은 프록시에서 먼저 막는다. 다섯 경로 모두 게이트웨이에는 POST 하나뿐이다.
  // supplier, warehouses, stock-transfers 는 같은 경로에 누구나 쓰는 GET 이 있고 이 표는 메서드를 안 봐서 넣지 않는다.
  // 구매 요청 release, reject 는 id 가 경로 가운데라 접두사로 못 잡는다(넣으면 목록 GET 까지 막힌다). 게이트웨이가 403 으로 막는다
  { prefix: 'scm-pp/pp/mrp/convert', roles: PP_PLANNING_ROLES },
  { prefix: 'scm-pp/pp/quotations/simulate', roles: PP_PLANNING_ROLES },
  { prefix: 'scm-pp/pp/quotations/confirm', roles: PP_PLANNING_ROLES },
  { prefix: 'scm-pp/iv/items/info', roles: IM_GATEWAY_ROLES },
  { prefix: 'scm-pp/mm/stock-purchase-requisitions', roles: MM_GATEWAY_ROLES },
];

/** API 접근. upstreamPath 는 /api/proxy 뒤의 정규화된 경로. 표에 없는 경로는 로그인만 되면 통과 */
export const canAccessApi = (role: Role, upstreamPath: string): boolean => {
  if (HRM_SELF_SERVICE.has(upstreamPath)) return true;
  const rule = API_RULES.find((r) => upstreamPath.startsWith(r.prefix));
  if (rule) return rule.roles.includes(role);
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
