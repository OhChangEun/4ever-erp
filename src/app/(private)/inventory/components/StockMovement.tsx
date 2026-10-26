'use client';

import { StockMovementResponse } from '../types/StockMovement';
import { useQuery } from '@tanstack/react-query';
import { getCurrentStockMovement } from '../inventory.api';
import { FormatDate, getMovementColor, getMovementIcon } from '../inventory.utils';
import StatusLabel from '@/app/components/common/StatusLabel';
import { stockMovementKeys } from '@/app/(private)/inventory/inventory.keys';

export default function StockMovement() {
  const {
    data: stockMovementRes,
    isLoading,
    isError,
  } = useQuery<StockMovementResponse[]>({
    queryKey: stockMovementKeys.all,
    queryFn: getCurrentStockMovement,
    staleTime: 1000,
  });

  const stockMovementCount = stockMovementRes?.length ?? 0;

  return (
    <div className="bg-white rounded-lg border border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">최근 재고 이동</h3>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              재고 이동 내역을 불러오는 중입니다...
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-lg bg-red-50 text-red-600 text-sm px-4 py-6">
              최근 재고 이동 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}

          {!isLoading && !isError && stockMovementCount === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-gray-500">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="ri-time-line text-2xl text-gray-400"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">최근 재고 이동 내역이 없습니다.</p>
                <p className="text-xs text-gray-500 mt-1">
                  입·출고 작업이 등록되면 여기에서 확인할 수 있어요.
                </p>
              </div>
            </div>
          )}

          {!isLoading &&
            !isError &&
            stockMovementRes?.map((movement) => (
              <div
                key={movement.itemName}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${getMovementColor(movement.type)}`}
                >
                  <i className={`${getMovementIcon(movement.type)} text-sm`}></i>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusLabel statusCode={movement.type} />
                    <span className="text-sm font-medium text-gray-900">
                      {movement.quantity} {movement.uomName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">{movement.itemName}</div>
                  <div className="text-xs text-gray-500">
                    {FormatDate(movement.workDate)} · {movement.managerName}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
