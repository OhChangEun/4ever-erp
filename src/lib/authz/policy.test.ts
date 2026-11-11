import { describe, expect, it } from 'vitest';
import { ROLES, canAccessApi, canAccessPage, isRole, menuRoles, type Role } from './policy';

/**
 * 예전 두 표(src/proxy.ts 의 ACCESS_RULES, 프록시 라우트의 PROXY_ACCESS_RULES)를 그대로 옮겨 두고
 * 새 표 하나가 같은 판정을 내리는지 본다. 바뀐 곳은 아래 "의도한 변화" 테스트에만 있다.
 */
const MM = ['MM_USER', 'MM_ADMIN'];
const SD = ['SD_USER', 'SD_ADMIN'];
const IM = ['IM_USER', 'IM_ADMIN'];
const FCM = ['FCM_USER', 'FCM_ADMIN'];
const HRM = ['HRM_USER', 'HRM_ADMIN'];
const PP = ['PP_USER', 'PP_ADMIN'];

const OLD_PAGE_RULES = [
  {
    path: '/dashboard',
    roles: [
      'ALL_ADMIN',
      ...MM,
      ...HRM,
      ...FCM,
      ...IM,
      ...PP,
      ...SD,
      'SUPPLIER_ADMIN',
      'CUSTOMER_ADMIN',
    ],
  },
  { path: '/purchase', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'SUPPLIER_ADMIN'] },
  { path: '/sales', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'CUSTOMER_ADMIN'] },
  { path: '/inventory', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
  { path: '/finance', roles: ['ALL_ADMIN', ...FCM, 'SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'] },
  { path: '/hrm', roles: ['ALL_ADMIN', ...HRM] },
  { path: '/production', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
];
const OLD_API_RULES = [
  { prefix: 'business/hrm', roles: ['ALL_ADMIN', ...HRM] },
  { prefix: 'business/fcm', roles: ['ALL_ADMIN', ...FCM, 'SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'] },
  { prefix: 'business/sd', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'CUSTOMER_ADMIN'] },
  { prefix: 'scm-pp/mm', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'SUPPLIER_ADMIN'] },
  { prefix: 'scm-pp/iv', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
  { prefix: 'scm-pp/sales-orders', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
  { prefix: 'scm-pp/purchase-orders', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
  { prefix: 'scm-pp/pp', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
];
const OLD_SELF_SERVICE = [
  'business/hrm/attendance/check-in',
  'business/hrm/attendance/check-out',
  'business/hrm/leave/request',
  'business/hrm/employees/by-internel-user',
];
const oldPage = (role: string, path: string) => {
  const rule = OLD_PAGE_RULES.find((r) => path.startsWith(r.path));
  return !rule || rule.roles.includes(role);
};
const oldApi = (role: string, path: string) => {
  if (OLD_SELF_SERVICE.includes(path)) return true;
  const rule = OLD_API_RULES.find((r) => path.startsWith(r.prefix));
  return !rule || rule.roles.includes(role);
};

const PAGES = [
  '/dashboard',
  '/purchase',
  '/sales?tab=orders',
  '/inventory',
  '/finance',
  '/hrm',
  '/production/x',
  '/profile',
];
const APIS = [
  'business/hrm/employee',
  'business/hrm/attendance/check-in',
  'business/fcm/invoice/ar',
  'business/sd/orders',
  'scm-pp/mm/purchase-orders',
  'scm-pp/iv/warehouses',
  'scm-pp/sales-orders/1/ready',
  'scm-pp/purchase-orders/1/receive',
  'scm-pp/pp/boms',
  'dashboard/statistics',
  'alarm/notifications/list',
];

describe('인가 표 하나', () => {
  it('역할 목록은 15개이고 isRole 은 목록 밖 값을 거른다', () => {
    expect(ROLES).toHaveLength(15);
    expect(isRole('ALL_ADMIN')).toBe(true);
    expect(isRole('all_admin')).toBe(false);
    expect(isRole('ROOT')).toBe(false);
  });

  it.each(ROLES)('%s: 예전 페이지 표와 같은 판정', (role: Role) => {
    for (const page of PAGES) {
      expect([page, canAccessPage(role, page.split('?')[0])]).toEqual([page, oldPage(role, page)]);
    }
  });

  it.each(ROLES)('%s: 예전 프록시 표와 같은 판정', (role: Role) => {
    for (const api of APIS)
      expect([api, canAccessApi(role, api)]).toEqual([api, oldApi(role, api)]);
  });

  it('의도한 변화: 창고와 안전재고 화면은 재고 API 를 쓰는 역할만 들어간다', () => {
    expect(canAccessPage('SUPPLIER_ADMIN', '/warehouse')).toBe(false);
    expect(canAccessPage('CUSTOMER_ADMIN', '/low-stock')).toBe(false);
    expect(canAccessPage('FCM_ADMIN', '/warehouse')).toBe(false);
    expect(canAccessPage('IM_USER', '/warehouse')).toBe(true);
    expect(canAccessPage('ALL_ADMIN', '/low-stock')).toBe(true);
  });

  it('의도한 변화: 경로는 세그먼트 단위로 맞춘다(/salesreport 는 /sales 규칙이 아니다)', () => {
    expect(canAccessPage('FCM_ADMIN', '/sales')).toBe(false);
    expect(canAccessPage('FCM_ADMIN', '/salesreport')).toBe(true);
  });

  it('의도한 변화: 재무 현황 API 는 사내 재무 역할만(재무 화면의 다른 API 는 그대로)', () => {
    const path = 'business/fcm/analytics/monthly';
    expect(canAccessApi('ALL_ADMIN', path)).toBe(true);
    expect(canAccessApi('FCM_USER', 'business/fcm/analytics/ar-aging')).toBe(true);
    expect(canAccessApi('CUSTOMER_ADMIN', path)).toBe(false);
    expect(canAccessApi('SUPPLIER_ADMIN', 'business/fcm/analytics/ar-aging')).toBe(false);
    expect(canAccessApi('SD_ADMIN', path)).toBe(false);
    expect(canAccessApi('CUSTOMER_ADMIN', 'business/fcm/invoice/ap')).toBe(true);
  });

  it('의도한 변화: 대시보드 자재 흐름 API 는 사내 운영 역할만', () => {
    const path = 'dashboard/supply-flow';
    for (const role of ['ALL_ADMIN', 'MM_USER', 'SD_ADMIN', 'IM_USER', 'PP_ADMIN'] as const)
      expect([role, canAccessApi(role, path)]).toEqual([role, true]);
    for (const role of ['FCM_ADMIN', 'HRM_USER', 'CUSTOMER_ADMIN', 'SUPPLIER_ADMIN'] as const)
      expect([role, canAccessApi(role, path)]).toEqual([role, false]);
    expect(canAccessApi('SUPPLIER_ADMIN', 'dashboard/statistics')).toBe(true);
  });

  it('의도한 변화: 생산 화면 쓰기 API 는 게이트웨이 @PreAuthorize 와 같은 역할만', () => {
    const allowed = (path: string) => ROLES.filter((role) => canAccessApi(role, path));
    // PpController.java 326, 488, 545
    for (const path of [
      'scm-pp/pp/mrp/convert',
      'scm-pp/pp/quotations/simulate',
      'scm-pp/pp/quotations/confirm',
    ])
      expect([path, allowed(path)]).toEqual([path, ['ALL_ADMIN', 'PP_USER', 'PP_ADMIN']]);
    // ImController.java 454-455
    expect(allowed('scm-pp/iv/items/info')).toEqual(['ALL_ADMIN', 'IM_USER', 'IM_ADMIN']);
    // MmController.java 184-185
    expect(allowed('scm-pp/mm/stock-purchase-requisitions')).toEqual([
      'ALL_ADMIN',
      'MM_USER',
      'MM_ADMIN',
    ]);
    // 같은 영역의 다른 경로는 그대로(조회, 미리보기는 게이트웨이도 역할을 안 본다)
    expect(canAccessApi('SD_USER', 'scm-pp/pp/quotations')).toBe(true);
    expect(canAccessApi('SD_USER', 'scm-pp/pp/quotations/preview')).toBe(true);
    expect(canAccessApi('MM_USER', 'scm-pp/pp/mrp/runs')).toBe(true);
    expect(canAccessApi('PP_USER', 'scm-pp/iv/items/toggle')).toBe(true);
    expect(canAccessApi('SUPPLIER_ADMIN', 'scm-pp/mm/purchase-orders')).toBe(true);
  });

  // 데모 계정 pp_admin 의 역할(카드 로그인 아이디와 생산 데모 계정). 표는 안 바꿨고 지금 판정을 고정한다
  it('PP_ADMIN 은 운영 화면 일곱 곳에 들어가고 재무와 인사는 막힌다', () => {
    const pages = [
      '/dashboard',
      '/sales',
      '/production',
      '/purchase',
      '/inventory',
      '/warehouse',
      '/low-stock',
      '/finance',
      '/hrm',
    ];
    expect(pages.filter((page) => canAccessPage('PP_ADMIN', page))).toEqual(pages.slice(0, 7));
    expect(canAccessApi('PP_ADMIN', 'scm-pp/pp/mrp/convert')).toBe(true);
    expect(canAccessApi('PP_ADMIN', 'scm-pp/mm/stock-purchase-requisitions')).toBe(false);
    expect(canAccessApi('PP_ADMIN', 'business/fcm/invoice/ar')).toBe(false);
    expect(canAccessApi('PP_ADMIN', 'business/hrm/employee')).toBe(false);
  });

  it('메뉴: 대시보드는 공급사에게 숨긴다(페이지는 열림). 나머지는 페이지 표와 같다', () => {
    expect(menuRoles('/dashboard')).not.toContain('SUPPLIER_ADMIN');
    expect(canAccessPage('SUPPLIER_ADMIN', '/dashboard')).toBe(true);
    expect(menuRoles('/purchase')).toContain('SUPPLIER_ADMIN');
    expect(menuRoles('/hrm')).toEqual(['ALL_ADMIN', 'HRM_USER', 'HRM_ADMIN']);
  });

  it('의도한 변화: by-internel-user 는 본인 업무 허용 목록에서 뺐다(인사 권한만)', () => {
    // 백엔드는 /by-internel-user/{internelUserId} 의 ID 가 본인인지 보지 않는다.
    // 허용 목록에 남아 있으면 접두사 검사로 넓히는 순간 누구나 남의 직원 정보를 읽는다
    for (const path of [
      'business/hrm/employees/by-internel-user',
      'business/hrm/employees/by-internel-user/u-2',
    ]) {
      expect(canAccessApi('SD_USER', path)).toBe(false);
      expect(canAccessApi('HRM_USER', path)).toBe(true);
    }
    // 허용 목록은 정확히 같은 경로만 본다. 접두사로 넓히면 휴가 승인과 반려가 누구에게나 열린다
    expect(canAccessApi('SD_USER', 'business/hrm/leave/request')).toBe(true);
    expect(canAccessApi('SD_USER', 'business/hrm/leave/request/1/release')).toBe(false);
    expect(canAccessApi('SD_USER', 'business/hrm/leave/request/1/reject')).toBe(false);
  });
});
