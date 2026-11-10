'use client';

import { useRole } from '@/app/hooks/useRole';
import { hasRole, menuRoles } from '@/lib/authz/policy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: '대시보드',
    roles: menuRoles('/dashboard'),
  },
  {
    href: '/purchase',
    label: '구매관리',
    roles: menuRoles('/purchase'),
  },
  {
    href: '/sales',
    label: '영업관리',
    roles: menuRoles('/sales'),
  },
  { href: '/inventory', label: '재고관리', roles: menuRoles('/inventory') },
  {
    href: '/finance',
    label: '재무관리',
    roles: menuRoles('/finance'),
  },
  { href: '/hrm', label: '인적자원관리', roles: menuRoles('/hrm') },
  { href: '/production', label: '생산관리', roles: menuRoles('/production') },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const role = useRole();

  // role에 따라 label 변경
  const accessibleNavItems = NAV_ITEMS.filter((item) => hasRole(item.roles, role)).map((item) => {
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
