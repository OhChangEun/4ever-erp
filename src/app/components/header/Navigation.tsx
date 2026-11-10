'use client';

import { useRole } from '@/app/hooks/useRole';
import { hasRole, menuRoles } from '@/lib/authz/policy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getNavLabelKey } from '@/app/components/sidebar/SidebarNavigation';

// 글자는 메시지의 nav. 역할에 따라 바뀌는 이름(공급사 구매→영업, 고객사 영업→구매)은 getNavLabelKey 가 고른다
const NAV_ITEMS = [
  { href: '/dashboard', roles: menuRoles('/dashboard') },
  { href: '/purchase', roles: menuRoles('/purchase') },
  { href: '/sales', roles: menuRoles('/sales') },
  { href: '/inventory', roles: menuRoles('/inventory') },
  { href: '/finance', roles: menuRoles('/finance') },
  { href: '/hrm', roles: menuRoles('/hrm') },
  { href: '/production', roles: menuRoles('/production') },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const role = useRole();
  const t = useTranslations('nav');

  const accessibleNavItems = NAV_ITEMS.filter((item) => hasRole(item.roles, role)).flatMap(
    (item) => {
      const labelKey = getNavLabelKey(item.href, role);
      return labelKey ? [{ ...item, label: t(labelKey) }] : [];
    },
  );

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
