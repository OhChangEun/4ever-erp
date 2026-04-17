import type { userInfoResponse } from '@/app/(public)/callback/userInfoType';

const LOGIN_ID_KEY = 'demo_login_id';

export function saveLoginId(loginId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOGIN_ID_KEY, loginId);
}

export function readLoginId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOGIN_ID_KEY);
}

export function clearLoginId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOGIN_ID_KEY);
}

export interface DemoAccount {
  loginId: string;
  displayName: string;
  role: string;
  department: string;
  icon: string;
  menus: string[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    loginId: 'admin',
    displayName: '전체 관리자',
    role: 'ALL_ADMIN',
    department: '경영진',
    icon: 'ri-shield-star-line',
    menus: ['대시보드', '영업', '생산', '구매', '재고', '재무', '인사'],
  },
  {
    loginId: 'mm_admin',
    displayName: '생산 관리자',
    role: 'MM_ADMIN',
    department: '생산팀',
    icon: 'ri-settings-3-line',
    menus: ['대시보드', '영업', '생산', '구매', '재고'],
  },
  {
    loginId: 'sd_admin',
    displayName: '영업 관리자',
    role: 'SD_ADMIN',
    department: '영업팀',
    icon: 'ri-line-chart-line',
    menus: ['대시보드', '영업', '생산', '구매', '재고'],
  },
  {
    loginId: 'fcm_admin',
    displayName: '재무 관리자',
    role: 'FCM_ADMIN',
    department: '재무팀',
    icon: 'ri-money-dollar-circle-line',
    menus: ['대시보드', '재무'],
  },
  {
    loginId: 'hrm_admin',
    displayName: '인사 관리자',
    role: 'HRM_ADMIN',
    department: '인사팀',
    icon: 'ri-team-line',
    menus: ['대시보드', '인사'],
  },
  {
    loginId: 'im_admin',
    displayName: '재고 관리자',
    role: 'IM_ADMIN',
    department: '물류팀',
    icon: 'ri-archive-line',
    menus: ['대시보드', '영업', '생산', '구매', '재고'],
  },
  {
    loginId: 'customer',
    displayName: '고객사 관리자',
    role: 'CUSTOMER_ADMIN',
    department: '고객사',
    icon: 'ri-user-star-line',
    menus: ['대시보드', '구매관리', '재무'],
  },
  {
    loginId: 'supplier',
    displayName: '공급사 관리자',
    role: 'SUPPLIER_ADMIN',
    department: '공급사',
    icon: 'ri-truck-line',
    menus: ['영업관리', '재무'],
  },
];

const ACCOUNT_MAP: Record<string, DemoAccount> = Object.fromEntries(
  DEMO_ACCOUNTS.map((a) => [a.loginId, a]),
);

export function buildMockUser(loginId?: string): userInfoResponse {
  const key = (loginId ?? '').trim().toLowerCase() || 'admin';
  const account = ACCOUNT_MAP[key];

  if (account) {
    return {
      id: DEMO_ACCOUNTS.indexOf(account) + 1,
      name: account.displayName,
      email: `${account.loginId}@everp.local`,
      role: account.role,
    };
  }

  // 알 수 없는 loginId → ALL_ADMIN 폴백
  return {
    id: 999,
    name: loginId ?? 'demo',
    email: `${loginId ?? 'demo'}@everp.local`,
    role: 'ALL_ADMIN',
  };
}
