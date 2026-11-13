'use client';

import Link from 'next/link';
import type { LowStockItemResponse } from '@/app/(private)/low-stock';
import { useQuery } from '@tanstack/react-query';
import { getLowStockItems } from '../inventory.api';
import { useTranslations } from 'next-intl';
import { lowStockItemKeys } from '@/app/(private)/inventory/inventory.keys';

export default function LowStockAlert() {
  const t = useTranslations('inventory');
  const {
    data: lowStockRes,
    isLoading,
    isError,
  } = useQuery<LowStockItemResponse[]>({
    queryKey: lowStockItemKeys.all,
    queryFn: getLowStockItems,
  });

  const lowStockCount = lowStockRes?.length ?? 0;

  return (
    // 표 위 요약. 카드로 감싸지 않고 소제목 줄 + 목록(디자인 지침 12장 "카드 래퍼를 두지 않는다")
    <section>
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('lowStockAlert.title')}</h3>
          <span className="text-sm text-gray-500">
            {t('lowStockAlert.count', { count: String(lowStockCount) })}
          </span>
        </div>
        <Link href="/low-stock" className="text-sm text-blue-500 hover:underline">
          {t('lowStockAlert.viewAll')}
        </Link>
      </div>

      <div className="divide-y divide-gray-200">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-sm text-gray-500">
            {t('lowStockAlert.loading')}
          </div>
        )}

        {isError && (
          <div className="rounded-lg bg-red-50 text-red-600 text-sm px-4 py-6">
            {t('lowStockAlert.loadError')}
          </div>
        )}

        {!isLoading && !isError && lowStockCount === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-2xl text-green-500"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{t('lowStockAlert.empty')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('lowStockAlert.emptyHint')}</p>
            </div>
          </div>
        )}

        {!isLoading &&
          !isError &&
          lowStockRes?.map((item) => (
            <div key={item.itemId} className="flex items-center justify-between py-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.statusCode === 'URGENT' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                  ></span>
                  <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('lowStockAlert.stockLine', {
                    // 예전처럼 숫자를 그대로 둔다(1000 은 1000). 숫자로 넘기면 언어별로 1,000 처럼 묶일 수 있다
                    current: String(item.currentStock),
                    safety: String(item.safetyStock),
                    unit: item.uomName,
                  })}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-medium ${
                    item.statusCode === 'URGENT' ? 'text-red-600' : 'text-yellow-600'
                  }`}
                >
                  {item.statusCode === 'URGENT'
                    ? t('lowStockAlert.urgent')
                    : t('lowStockAlert.caution')}
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
