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

  it('메뉴: 대시보드는 공급사에게 숨긴다(페이지는 열림). 나머지는 페이지 표와 같다', () => {
    expect(menuRoles('/dashboard')).not.toContain('SUPPLIER_ADMIN');
    expect(canAccessPage('SUPPLIER_ADMIN', '/dashboard')).toBe(true);
    expect(menuRoles('/purchase')).toContain('SUPPLIER_ADMIN');
    expect(menuRoles('/hrm')).toEqual(['ALL_ADMIN', 'HRM_USER', 'HRM_ADMIN']);
  });
});
