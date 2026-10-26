'use client';

import Link from 'next/link';
import { LowStockItemResponse } from '../../low-stock/types/LowStockAlertType';
import { useQuery } from '@tanstack/react-query';
import { getLowStockItems } from '../inventory.api';
import Button from '@/app/components/common/Button';
import { lowStockItemKeys } from '@/app/(private)/inventory/inventory.keys';

export default function LowStockAlert() {
  const {
    data: lowStockRes,
    isLoading,
    isError,
  } = useQuery<LowStockItemResponse[]>({
    queryKey: lowStockItemKeys.all,
    queryFn: getLowStockItems,
    staleTime: 1000,
  });

  const lowStockCount = lowStockRes?.length ?? 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">재고 부족 알림</h3>
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              {lowStockCount}건
            </span>
          </div>
          <Link href="/low-stock">
            <Button label="전체 보기 →" size="sm" variant="ghost" />
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-sm text-gray-500">
            데이터를 불러오는 중입니다...
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg bg-red-50 text-red-600 text-sm px-4 py-6">
            재고 부족 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {!isLoading && !isError && lowStockCount === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-2xl text-green-500"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">재고 부족 품목이 없습니다.</p>
              <p className="text-xs text-gray-500 mt-1">창고 재고가 안정적으로 유지되고 있어요.</p>
            </div>
          </div>
        )}

        {!isLoading &&
          !isError &&
          lowStockRes?.map((item) => (
            <div
              key={item.itemId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
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
                  현재: {item.currentStock}
                  {item.uomName} / 최소: {item.safetyStock}
                  {item.uomName}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-medium ${
                    item.statusCode === 'URGENT' ? 'text-red-600' : 'text-yellow-600'
                  }`}
                >
                  {item.statusCode === 'URGENT' ? '긴급' : '주의'}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
