import { describe, expect, it } from 'vitest';
import { menuRoles } from '@/lib/authz/policy';
import { DEMO_ACCOUNTS, buildMockUser, findDemoAccount, type DemoMenuKey } from './simpleLogin';

// 카드 "로그인 아이디와 생산 데모 계정". 아이디 판정은 이 함수 하나이고 화면과 서버가 같이 쓴다
describe('데모 계정 아이디 판정', () => {
  it.each(['mm_admin', 'MM_ADMIN', 'Mm_Admin', '  mm_admin  ', '\tMM_ADMIN\n'])(
    '"%s" 는 구매 관리자다(대소문자와 앞뒤 공백을 가리지 않는다)',
    (loginId) => {
      expect(findDemoAccount(loginId)?.role).toBe('MM_ADMIN');
    },
  );

  // constructor, __proto__ 는 객체를 표로 쓰면 값이 나오는 키다
  it.each(['', '   ', 'nobody', 'mm admin', 'mm_admin2', 'constructor', '__proto__'])(
    '"%s" 는 없는 아이디다',
    (loginId) => {
      expect(findDemoAccount(loginId)).toBeUndefined();
    },
  );

  it('기존 계정 여덟의 아이디와 역할은 그대로다', () => {
    expect(
      Object.fromEntries(
        DEMO_ACCOUNTS.filter((a) => a.loginId !== 'pp_admin').map((a) => [a.loginId, a.role]),
      ),
    ).toEqual({
      admin: 'ALL_ADMIN',
      mm_admin: 'MM_ADMIN',
      sd_admin: 'SD_ADMIN',
      fcm_admin: 'FCM_ADMIN',
      hrm_admin: 'HRM_ADMIN',
      im_admin: 'IM_ADMIN',
      customer: 'CUSTOMER_ADMIN',
      supplier: 'SUPPLIER_ADMIN',
    });
  });
});

describe('생산 데모 계정 pp_admin', () => {
  it('역할은 PP_ADMIN, 이름은 생산 관리자', () => {
    expect(findDemoAccount('pp_admin')).toMatchObject({
      role: 'PP_ADMIN',
      displayName: '생산 관리자',
      department: '생산팀',
    });
    expect(buildMockUser('PP_ADMIN')).toMatchObject({
      name: '생산 관리자',
      email: 'pp_admin@everp.local',
      role: 'PP_ADMIN',
    });
  });

  it('카드의 메뉴 줄은 인가 표에서 PP_ADMIN 에게 보이는 메뉴와 같다', () => {
    // 사이드바 순서(SidebarNavigation 의 NAV_ITEMS)
    const sidebar: DemoMenuKey[] = [
      'dashboard',
      'sales',
      'production',
      'purchase',
      'inventory',
      'finance',
      'hrm',
    ];
    const visible = sidebar.filter((menu) => menuRoles(`/${menu}`).includes('PP_ADMIN'));
    expect(findDemoAccount('pp_admin')?.menus).toEqual(visible);
    expect(visible).toEqual(['dashboard', 'sales', 'production', 'purchase', 'inventory']);
  });
});
