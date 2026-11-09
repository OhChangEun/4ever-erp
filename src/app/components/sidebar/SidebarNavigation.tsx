'use client';

import { useRole } from '@/app/hooks/useRole';
import { FCM, HRM, IM, MM, PP, SD } from '@/lib/role';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebarStore';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: '대시보드',
    icon: 'ri-dashboard-line',
    roles: ['ALL_ADMIN', ...MM, ...HRM, ...FCM, ...IM, ...PP, ...SD, 'CUSTOMER_ADMIN'],
  },
  {
    href: '/sales',
    label: '영업관리',
    icon: 'ri-line-chart-line',
    roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'CUSTOMER_ADMIN'],
  },
  {
    href: '/production',
    label: '생산관리',
    icon: 'ri-settings-3-line',
    roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP],
  },
  {
    href: '/purchase',
    label: '구매관리',
    icon: 'ri-shopping-cart-line',
    roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'SUPPLIER_ADMIN'],
  },
  {
    href: '/inventory',
    label: '재고관리',
    icon: 'ri-archive-line',
    roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP],
  },
  {
    href: '/finance',
    label: '재무관리',
    icon: 'ri-money-dollar-circle-line',
    roles: ['ALL_ADMIN', ...FCM, 'CUSTOMER_ADMIN', 'SUPPLIER_ADMIN'],
  },
  {
    href: '/hrm',
    label: '인적자원관리',
    icon: 'ri-team-line',
    roles: ['ALL_ADMIN', ...HRM],
  },
] as const;

/** 역할에 따라 메뉴 이름이 바뀌는 경우 (공급사는 구매→영업, 고객사는 영업→구매) */
export function getNavLabel(href: string, role: string | undefined): string | undefined {
  const item = NAV_ITEMS.find((nav) => nav.href === href);
  if (!item) return undefined;
  if (role === 'SUPPLIER_ADMIN' && href === '/purchase') return '영업관리';
  if (role === 'CUSTOMER_ADMIN' && href === '/sales') return '구매관리';
  return item.label;
}

interface SidebarNavigationProps {
  isExpanded: boolean;
}

export default function SidebarNavigation({ isExpanded }: SidebarNavigationProps) {
  const pathname = usePathname();
  const role = useRole();
  const setExpanded = useSidebarStore((state) => state.setExpanded);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const accessibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({
    ...item,
    label: getNavLabel(item.href, role) ?? item.label,
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
