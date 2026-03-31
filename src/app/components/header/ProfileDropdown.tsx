'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ProfileInfoModal from './ProfileInfoModal';
import { useRole } from '@/app/hooks/useRole';
import { useRouter } from 'next/navigation';
import { clearAccessToken } from '@/lib/auth/tokenStorage';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';
import { clearLoginId } from '@/lib/auth/simpleLogin';

export function mapRoleToKorean(role: string | undefined): string {
  if (!role) return '';

  // 특수 관리자 케이스
  const specialRoles: Record<string, string> = {
    ALL_ADMIN: '전사 관리자',
    CUSTOMER_ADMIN: '고객사 관리자',
    SUPPLIER_ADMIN: '공급사 관리자',
  };

  if (specialRoles[role]) return specialRoles[role];

  // 일반 권한: 접두사(부서) + USER/ADMIN
  const departmentMap: Record<string, string> = {
    MM: '구매관리',
    SD: '영업관리',
    IM: '재고관리',
    FCM: '재무관리',
    HRM: '인적자원관리',
    PP: '생산관리',
  };

  const [deptCode, position] = role.split('_'); // 예: MM_USER → ['MM', 'USER']

  const departmentName = departmentMap[deptCode];
  if (!departmentName) return role; // 매칭 안 되면 원본 반환

  if (position === 'USER') return `${departmentName} 부서 사원`;
  if (position === 'ADMIN') return `${departmentName} 부서 관리자`;

  return role;
}

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSupOrCusModalOpen, setIsSupOrCusModalOpen] = useState(false);
  const role = useRole();
  const router = useRouter();

  const { userInfo, clearUserInfo } = useAuthStore();
  const userName = userInfo?.name;
  const userEmail = userInfo?.email;

  console.log(userEmail);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleLogout = () => {
    clearAccessToken();
    clearUserInfo();
    clearLoginId();
    Cookies.remove('role', { path: '/' });
    router.replace('/login');
  };

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
        aria-label="프로필 메뉴"
      >
        {/* 프로필 */}
        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
          <i className="ri-user-3-line text-gray-600 text-xl"></i>
        </div>
        {/* 이름 & 직급 */}
        <div className="hidden md:block text-left pl-1">
          <div className="text-sm font-medium text-gray-900">{userName}</div>
          <div className="text-xs text-gray-400">{mapRoleToKorean(role)}</div>
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
              프로필 설정
            </Link>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
            >
              <i className="ri-logout-box-line mr-3"></i>
              로그아웃
            </button>
          </div>
        </div>
      )}
      {isSupOrCusModalOpen && <ProfileInfoModal $setIsOpen={setIsSupOrCusModalOpen} />}
    </div>
  );
}
