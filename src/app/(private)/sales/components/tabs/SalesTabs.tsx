'use client';

import { ReactNode } from 'react';
import TabNavigation from '@/app/components/common/TabNavigation';
import { useRole } from '@/app/hooks/useRole';
import { getSalesTabsByRole } from '../../utils';

export default function SalesTabs({ header }: { header?: ReactNode }) {
  const role = useRole();
  //   const role = 'CUSTOMER_ADMIN';
  //   const role = 'SUPPLIER_ADMIN';
  const allowedTabs = getSalesTabsByRole(role);

  return <TabNavigation tabs={allowedTabs} header={header} />;
}
