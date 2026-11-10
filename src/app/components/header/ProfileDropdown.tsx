'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ProfileInfoModal from './ProfileInfoModal';
import { useRole } from '@/app/hooks/useRole';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { logout } from '@/lib/auth/logout';
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

/** 역할 글자(예: 영업관리 부서 관리자). 헤더 프로필과 사이드바 프로필이 같이 쓴다 */
export function useRoleLabel(role: string | undefined): string {
  const t = useTranslations();
  const label = getRoleLabel(role);
  if (!label) return '';
  if (label.kind === 'raw') return label.text;
  if (label.kind === 'special') return t(`role.${label.key}`);
  return t(`role.${label.key}`, { dept: t(`nav.${label.department}`) });
}

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSupOrCusModalOpen, setIsSupOrCusModalOpen] = useState(false);
  const role = useRole();
  const roleLabel = useRoleLabel(role);
  const router = useRouter();
  const t = useTranslations('profile');

  const { userInfo, clearUserInfo } = useAuthStore();
  const userName = userInfo?.name;
  const userEmail = userInfo?.email;

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target instanceof Node ? event.target : null)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 세션 쿠키는 httpOnly 라 서버가 지운다. OIDC 면 IdP 로그아웃 화면을 거쳐 /login 으로 돌아온다(src/lib/auth/logout.ts)
  const handleLogout = () =>
    void logout({ clearUserInfo, goToLogin: () => router.replace('/login') });

  const handleProfile = (e: React.MouseEvent) => {
    if (role === 'SUPPLIER_ADMIN' || role === 'CUSTOMER_ADMIN') {
      e.preventDefault();
      setIsSupOrCusModalOpen(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors duration-200"
        aria-label={t('menu')}
      >
        {/* 프로필 */}
        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
          <i className="ri-user-3-line text-gray-600 text-xl"></i>
        </div>
        {/* 이름 & 직급 */}
        <div className="hidden md:block text-left pl-1">
          <div className="text-sm font-medium text-gray-900">{userName}</div>
          <div className="text-xs text-gray-400">{roleLabel}</div>
        </div>
        <i
          className={`ri-arrow-down-s-line text-lg font-medium transition-transform ${isOpen ? 'rotate-180' : ''}`}
        ></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-overlay animate-fade-in">
          {/* 프로필 정보 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="ri-user-3-line text-gray-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* 메뉴 아이템 */}
          <div className="py-1">
            <Link
              href="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={handleProfile}
            >
              <i className="ri-user-settings-line mr-3 text-gray-400"></i>
              {t('profile')}
            </Link>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
            >
              <i className="ri-logout-box-line mr-3"></i>
              {t('logout')}
            </button>
          </div>
        </div>
      )}
      {isSupOrCusModalOpen && <ProfileInfoModal setIsOpen={setIsSupOrCusModalOpen} />}
    </div>
  );
}
