'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/app/hooks/useRole';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import ProfileInfoModal from '@/app/components/header/ProfileInfoModal';
import { useRoleLabel } from '@/app/components/header/roleLabel';
import { logout } from '@/lib/auth/logout';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALES } from '@/i18n/locale';
import { useSetLocale } from '@/i18n/useSetLocale';

interface SidebarProfileProps {
  isExpanded: boolean;
}

export default function SidebarProfile({ isExpanded }: SidebarProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupOrCusModalOpen, setIsSupOrCusModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const role = useRole();
  const roleLabel = useRoleLabel(role);
  const router = useRouter();

  const { userInfo, clearUserInfo } = useAuthStore();
  const t = useTranslations('profile');
  const locale = useLocale();
  const setLocale = useSetLocale();
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
    <div className="relative mt-auto border-t border-gray-200 bg-white" ref={dropdownRef}>
      {/* 프로필 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
          isExpanded ? 'justify-start' : 'justify-center'
        }`}
        title={!isExpanded ? userName : undefined}
      >
        {/* 프로필 아바타 */}
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <i className="ri-user-3-line text-blue-600 text-base"></i>
        </div>

        {/* 이름 & 직급 */}
        {isExpanded && (
          <div className="flex-1 text-left overflow-hidden">
            <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
            <div className="text-xs text-gray-500 truncate">{roleLabel}</div>
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
              {t('profile')}
            </Link>
            <hr className="my-1 border-gray-100" />
            {/* 언어(i18n 1 카드). 쿠키에 두고 서버 컴포넌트를 다시 그린다 */}
            <div role="group" aria-label={t('language')} className="flex gap-1 px-4 py-2">
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={locale === code}
                  onClick={() => setLocale(code)}
                  className={`flex-1 rounded-md px-2 py-1 text-xs cursor-pointer ${
                    locale === code ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {code === 'ko' ? t('korean') : t('english')}
                </button>
              ))}
            </div>
            <hr className="my-1 border-gray-100" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
