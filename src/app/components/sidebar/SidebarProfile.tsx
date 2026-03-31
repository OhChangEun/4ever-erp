'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/app/hooks/useRole';
import { useRouter } from 'next/navigation';
import { clearAccessToken } from '@/lib/auth/tokenStorage';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';
import { clearLoginId } from '@/lib/auth/simpleLogin';
import ProfileInfoModal from '@/app/components/header/ProfileInfoModal';
import { mapRoleToKorean } from '@/app/components/header/ProfileDropdown';

interface SidebarProfileProps {
  isExpanded: boolean;
}

export default function SidebarProfile({ isExpanded }: SidebarProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupOrCusModalOpen, setIsSupOrCusModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const role = useRole();
  const router = useRouter();

  const { userInfo, clearUserInfo } = useAuthStore();
  const userName = userInfo?.name;
  const userEmail = userInfo?.email;

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
    <div className="relative mt-auto border-t border-gray-200 bg-gray-50" ref={dropdownRef}>
      {/* 프로필 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-100 transition-colors ${
          isExpanded ? 'justify-start' : 'justify-center'
        }`}
        title={!isExpanded ? userName : undefined}
      >
        {/* 프로필 아바타 */}
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <i className="ri-user-3-line text-blue-600 text-xl"></i>
        </div>

        {/* 이름 & 직급 */}
        {isExpanded && (
          <div className="flex-1 text-left overflow-hidden">
            <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
            <div className="text-xs text-gray-500 truncate">{mapRoleToKorean(role)}</div>
          </div>
        )}

        {/* 더보기 아이콘 */}
        {isExpanded && (
          <i
            className={`ri-more-2-fill text-lg text-gray-400 transition-transform ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          className={`absolute ${isExpanded ? 'left-4 right-4' : 'left-full ml-2'} bottom-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-overlay animate-fade-in`}
          style={{ minWidth: isExpanded ? 'auto' : '200px' }}
        >
          {/* 프로필 정보 (축소 상태일 때만) */}
          {!isExpanded && (
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-3-line text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
              </div>
            </div>
          )}

          {/* 메뉴 아이템 */}
          <div className="py-1">
            <Link
              href="/profile"
              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={handleProfile}
            >
              <i className="ri-user-settings-line mr-3 text-gray-400"></i>
              프로필 설정
            </Link>
            <hr className="my-1 border-gray-100" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
