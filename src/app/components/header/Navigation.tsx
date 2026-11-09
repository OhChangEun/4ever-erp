'use client';

import { useRole } from '@/app/hooks/useRole';
import { FCM, HRM, IM, MM, PP, SD } from '@/lib/role';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: '대시보드',
    roles: ['ALL_ADMIN', ...MM, ...HRM, ...FCM, ...IM, ...PP, ...SD, 'CUSTOMER_ADMIN'],
  },
  {
    href: '/purchase',
    label: '구매관리',
    roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'SUPPLIER_ADMIN'],
  },
  {
    href: '/sales',
    label: '영업관리',
    roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'CUSTOMER_ADMIN'],
  },
  { href: '/inventory', label: '재고관리', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
  {
    href: '/finance',
    label: '재무관리',
    roles: ['ALL_ADMIN', ...FCM, 'CUSTOMER_ADMIN', 'SUPPLIER_ADMIN'],
  },
  { href: '/hrm', label: '인적자원관리', roles: ['ALL_ADMIN', ...HRM] },
  { href: '/production', label: '생산관리', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const role = useRole();

  // const role = 'ALL_ADMIN';
  // const role = 'MM_USER';
  // const role = 'SD_USER';
  // const role = 'IM_USER';
  // const role = 'FCM_USER';
  // const role = 'HRM_USER';
  // const role = 'PP_USER';

  // role에 따라 label 변경
  const accessibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
    let label = item.label;

    if (role === 'SUPPLIER_ADMIN' && item.href === '/purchase') {
      label = '영업관리'; // SUPPLIER_ADMIN이면 구매관리 -> 영업관리
    }

    if (role === 'CUSTOMER_ADMIN' && item.href === '/sales') {
      label = '구매관리'; // CUSTOMER_ADMIN이면 영업관리 -> 구매관리
    }

    return { ...item, label };
  });

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="hidden lg:flex">
      {accessibleNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 pt-3.5 pb-2 cursor-pointer transition-colors font-normal ${
            isActive(item.href)
              ? 'text-gray-900 font-semibold'
              : 'text-gray-400 hover:text-gray-800 hover:font-semibold'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
