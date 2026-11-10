'use client';

import { useRole } from '@/app/hooks/useRole';
import { hasRole, menuRoles } from '@/lib/authz/policy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebarStore';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    icon: 'ri-dashboard-line',
    roles: menuRoles('/dashboard'),
  },
  {
    href: '/sales',
    labelKey: 'sales',
    icon: 'ri-line-chart-line',
    roles: menuRoles('/sales'),
  },
  {
    href: '/production',
    labelKey: 'production',
    icon: 'ri-settings-3-line',
    roles: menuRoles('/production'),
  },
  {
    href: '/purchase',
    labelKey: 'purchase',
    icon: 'ri-shopping-cart-line',
    roles: menuRoles('/purchase'),
  },
  {
    href: '/inventory',
    labelKey: 'inventory',
    icon: 'ri-archive-line',
    roles: menuRoles('/inventory'),
  },
  {
    href: '/finance',
    labelKey: 'finance',
    icon: 'ri-money-dollar-circle-line',
    roles: menuRoles('/finance'),
  },
  {
    href: '/hrm',
    labelKey: 'hrm',
    icon: 'ri-team-line',
    roles: menuRoles('/hrm'),
  },
] as const;

export type NavLabelKey = (typeof NAV_ITEMS)[number]['labelKey'];

/**
 * 메뉴 이름의 메시지 키(messages 의 nav). 역할에 따라 바뀌는 경우가 있다
 * (공급사는 구매→영업, 고객사는 영업→구매). 글자는 부르는 쪽이 useTranslations('nav') 로 꺼낸다.
 */
export function getNavLabelKey(href: string, role: string | undefined): NavLabelKey | undefined {
  const item = NAV_ITEMS.find((nav) => nav.href === href);
  if (!item) return undefined;
  if (role === 'SUPPLIER_ADMIN' && href === '/purchase') return 'sales';
  if (role === 'CUSTOMER_ADMIN' && href === '/sales') return 'purchase';
  return item.labelKey;
}

interface SidebarNavigationProps {
  isExpanded: boolean;
}

export default function SidebarNavigation({ isExpanded }: SidebarNavigationProps) {
  const pathname = usePathname();
  const role = useRole();
  const setExpanded = useSidebarStore((state) => state.setExpanded);
  const t = useTranslations('nav');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const accessibleNavItems = NAV_ITEMS.filter((item) => hasRole(item.roles, role)).map((item) => ({
    ...item,
    label: t(getNavLabelKey(item.href, role) ?? item.labelKey),
  }));

  const isActive = (href: string) => pathname === href;

  const handleLinkClick = () => {
    // 모바일에서만 사이드바 닫기
    if (isMobile) {
      setExpanded(false);
    }
  };

  return (
    <ul className="space-y-0.5 px-2">
      {accessibleNavItems.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={handleLinkClick}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={`flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-blue-50 text-blue-600 font-medium shadow-[inset_3px_0_0_var(--color-blue-500)]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
            title={!isExpanded ? item.label : undefined}
          >
            <i
              className={`${item.icon} text-base shrink-0 ${
                isActive(item.href) ? 'text-blue-600' : 'text-gray-400'
              }`}
            />
            <span
              className={`whitespace-nowrap ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              {item.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
