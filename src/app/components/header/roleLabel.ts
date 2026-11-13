'use client';

import { useTranslations } from 'next-intl';
import { type NavLabelKey } from '@/app/components/sidebar/SidebarNavigation';

type SpecialRole = 'ALL_ADMIN' | 'CUSTOMER_ADMIN' | 'SUPPLIER_ADMIN';
const SPECIAL_ROLES: readonly SpecialRole[] = ['ALL_ADMIN', 'CUSTOMER_ADMIN', 'SUPPLIER_ADMIN'];
const isSpecialRole = (role: string): role is SpecialRole =>
  SPECIAL_ROLES.some((special) => special === role);

// 일반 권한의 접두사(부서) → 메뉴 이름 키(messages 의 nav). 없는 접두사면 undefined
const DEPARTMENT_NAV_KEY: Partial<Record<string, NavLabelKey>> = {
  MM: 'purchase',
  SD: 'sales',
  IM: 'inventory',
  FCM: 'finance',
  HRM: 'hrm',
  PP: 'production',
};

/** 역할 표시의 메시지 키(messages 의 role). 모르는 역할은 코드를 그대로 보인다 */
export type RoleLabel =
  | { kind: 'special'; key: SpecialRole }
  | { kind: 'department'; key: 'USER' | 'ADMIN'; department: NavLabelKey }
  | { kind: 'raw'; text: string };

export function getRoleLabel(role: string | undefined): RoleLabel | null {
  if (!role) return null;
  if (isSpecialRole(role)) return { kind: 'special', key: role };

  // 일반 권한: 접두사(부서) + USER/ADMIN
  const [deptCode, position] = role.split('_'); // 예: MM_USER → ['MM', 'USER']
  const department = DEPARTMENT_NAV_KEY[deptCode];
  if (department && (position === 'USER' || position === 'ADMIN')) {
    return { kind: 'department', key: position, department };
  }
  return { kind: 'raw', text: role }; // 매칭 안 되면 원본
}

/** 역할 글자(예: 영업관리 부서 관리자). 사이드바 프로필(SidebarProfile)이 쓴다 */
export function useRoleLabel(role: string | undefined): string {
  const t = useTranslations();
  const label = getRoleLabel(role);
  if (!label) return '';
  if (label.kind === 'raw') return label.text;
  if (label.kind === 'special') return t(`role.${label.key}`);
  return t(`role.${label.key}`, { dept: t(`nav.${label.department}`) });
}
