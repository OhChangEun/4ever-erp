'use client';

import { type StockMovementResponse } from '../types/StockMovement';
import { useQuery } from '@tanstack/react-query';
import { getCurrentStockMovement } from '../inventory.api';
import { FormatDate, getMovementType } from '../inventory.utils';
import StatusLabel from '@/app/components/common/StatusLabel';
import { stockMovementKeys } from '@/app/(private)/inventory/inventory.keys';
import { useTranslations } from 'next-intl';

export default function StockMovement() {
  const t = useTranslations('inventory');
  const {
    data: stockMovementRes,
    isLoading,
    isError,
  } = useQuery<StockMovementResponse[]>({
    queryKey: stockMovementKeys.all,
    queryFn: getCurrentStockMovement,
  });

  const stockMovementCount = stockMovementRes?.length ?? 0;

  return (
    // 표 위 요약. 카드로 감싸지 않고 소제목 줄 + 목록(디자인 지침 12장 "카드 래퍼를 두지 않는다")
    <section>
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{t('stockMovement.title')}</h3>
      </div>

      <div>
        <div className="divide-y divide-gray-200">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              {t('stockMovement.loading')}
            </div>
          )}

          {isError && (
            <div className="rounded-lg bg-red-50 text-red-600 text-sm px-4 py-6">
              {t('stockMovement.loadError')}
            </div>
          )}

          {!isLoading && !isError && stockMovementCount === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-gray-500">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="ri-time-line text-2xl text-gray-400"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t('stockMovement.empty')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('stockMovement.emptyHint')}</p>
              </div>
            </div>
          )}

          {!isLoading && !isError && stockMovementCount > 0 && (
            // 이동 종류는 아이콘 대신 상태 글자 하나(지침 12장 아이콘 세 곳)
            <ul role="list" className="divide-y divide-gray-200">
              {/* 행에 id 가 없다. 시각과 품목이 같은 행만 그 안의 순번으로 가른다(위에 새 행이 끼어도 다른 행 key 는 그대로) */}
              {stockMovementRes?.map((movement, index, rows) => (
                <li
                  key={`${movement.workDate}-${movement.itemName}-${
                    rows
                      .slice(0, index)
                      .filter(
                        (row) =>
                          row.workDate === movement.workDate && row.itemName === movement.itemName,
                      ).length
                  }`}
                  className="py-3 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <StatusLabel statusCode={getMovementType(movement.type)} />
                    <span className="text-sm font-medium text-gray-900">
                      {movement.quantity} {movement.uomName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">{movement.itemName}</div>
                  <div className="text-xs text-gray-500">
                    {FormatDate(movement.workDate)} · {movement.managerName}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
