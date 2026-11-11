import type { UserInfo } from '@/lib/auth/userInfo';
import type { Role } from '@/lib/authz/policy';
import type messages from '@/i18n/messages/ko.json';

// 로그인 카드 글자는 메시지 키로 둔다(i18n 11). 화면이 login 메시지에서 번역한다
type DemoAccountNameKey = keyof (typeof messages)['login']['account'];
export type DemoMenuKey = keyof (typeof messages)['login']['menu'];

/** 데모 사용자. 세션에 넣는 role 이 역할 표에 있는 값임을 타입으로 보장한다 */
export interface DemoUser extends UserInfo {
  role: Role;
}

// 데모 계정 목록과 사용자 정보 생성만 담당한다.
// 누가 로그인했는지는 브라우저가 아니라 서버 세션 쿠키(/api/auth/*)가 기억한다.

export interface DemoAccount {
  loginId: string;
  /** 세션에 넣는 사용자 이름(buildMockUser). 서버 값이라 번역하지 않는다 */
  displayName: string;
  /** 로그인 카드에 보이는 이름의 메시지 키(login.account) */
  displayNameKey: DemoAccountNameKey;
  role: Role;
  department: string;
  icon: string;
  /** 로그인 카드에 보이는 메뉴의 메시지 키(login.menu) */
  menus: DemoMenuKey[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    loginId: 'admin',
    displayName: '전체 관리자',
    displayNameKey: 'admin',
    role: 'ALL_ADMIN',
    department: '경영진',
    icon: 'ri-shield-star-line',
    menus: ['dashboard', 'sales', 'production', 'purchase', 'inventory', 'finance', 'hrm'],
  },
  {
    loginId: 'mm_admin',
    displayName: '구매 관리자',
    displayNameKey: 'mm_admin',
    role: 'MM_ADMIN',
    department: '구매팀',
    icon: 'ri-settings-3-line',
    menus: ['dashboard', 'sales', 'production', 'purchase', 'inventory'],
  },
  {
    loginId: 'sd_admin',
    displayName: '영업 관리자',
    displayNameKey: 'sd_admin',
    role: 'SD_ADMIN',
    department: '영업팀',
    icon: 'ri-line-chart-line',
    menus: ['dashboard', 'sales', 'production', 'purchase', 'inventory'],
  },
  {
    loginId: 'fcm_admin',
    displayName: '재무 관리자',
    displayNameKey: 'fcm_admin',
    role: 'FCM_ADMIN',
    department: '재무팀',
    icon: 'ri-money-dollar-circle-line',
    menus: ['dashboard', 'finance'],
  },
  {
    loginId: 'hrm_admin',
    displayName: '인사 관리자',
    displayNameKey: 'hrm_admin',
    role: 'HRM_ADMIN',
    department: '인사팀',
    icon: 'ri-team-line',
    menus: ['dashboard', 'hrm'],
  },
  {
    loginId: 'im_admin',
    displayName: '재고 관리자',
    displayNameKey: 'im_admin',
    role: 'IM_ADMIN',
    department: '물류팀',
    icon: 'ri-archive-line',
    menus: ['dashboard', 'sales', 'production', 'purchase', 'inventory'],
  },
  {
    loginId: 'pp_admin',
    displayName: '생산 관리자',
    displayNameKey: 'pp_admin',
    role: 'PP_ADMIN',
    department: '생산팀',
    icon: 'ri-cpu-line',
    menus: ['dashboard', 'sales', 'production', 'purchase', 'inventory'],
  },
  {
    loginId: 'customer',
    displayName: '고객사 관리자',
    displayNameKey: 'customer',
    role: 'CUSTOMER_ADMIN',
    department: '고객사',
    icon: 'ri-user-star-line',
    menus: ['dashboard', 'purchaseManage', 'finance'],
  },
  {
    loginId: 'supplier',
    displayName: '공급사 관리자',
    displayNameKey: 'supplier',
    role: 'SUPPLIER_ADMIN',
    department: '공급사',
    icon: 'ri-truck-line',
    menus: ['salesManage', 'finance'],
  },
];

/**
 * 아이디 판정 한 곳. 로그인 화면, 로그인 라우트, buildMockUser 가 같이 쓴다.
 * 앞뒤 공백과 대소문자를 가리지 않는다. 없는 아이디면 undefined
 */
export const findDemoAccount = (loginId: string): DemoAccount | undefined => {
  const key = loginId.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.loginId === key);
};

export function buildMockUser(loginId?: string): DemoUser {
  const account = findDemoAccount((loginId ?? '').trim() || 'admin');

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
