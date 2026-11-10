'use client';

import { useState } from 'react';
import Link from 'next/link';
import { INVENTORY_NEED_TABLE_HEADERS } from '@/app/(private)/sales/constant';
import {
  type InventoryCheckRes,
  type QuoteReviewModalProps,
} from '@/app/(private)/sales/types/QuoteReviewModalType';
import { ModalStatusBox } from '@everp/ui';
import { useQuery } from '@tanstack/react-query';
import { type Inventories, type QuoteDetail } from '../../types/QuoteDetailModalType';
import { getQuoteDetail } from '../../sales.api';
import { useCheckInventory, useConfirmQuotation, useProcessDelivery } from '../../sales.mutations';
import { quoteKeys } from '@/app/(private)/sales/sales.keys';
import { isAllInventoryFulfilled } from '../../utils';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';

import { formatCurrency } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';
const QuoteReviewModal = ({ onClose, selectedQuotationId }: QuoteReviewModalProps) => {
  const t = useTranslations('sales.quoteReview');
  const tq = useTranslations('sales.quote');
  const tc = useTranslations('sales.common');
  const [inventoryCheckResult, setInventoryCheckResult] = useState<InventoryCheckRes[] | null>(
    null,
  );
  const toast = useToast();

  const handleInventoryCheck = () => {
    inventoryCheckReq(haveToCheckItems);
  };

  const handleDelieveryProcess = () => {
    delieveryProcessReq(selectedQuotationId);
  };

  const {
    data: quote,
    isLoading,
    isError,
  } = useQuery<QuoteDetail>({
    queryKey: quoteKeys.reviewDetail(selectedQuotationId),
    queryFn: () => getQuoteDetail(selectedQuotationId),
    enabled: !!selectedQuotationId,
  });

  const haveToCheckItems: Inventories[] =
    quote?.items.map(({ itemId, quantity }) => ({
      itemId,
      requiredQuantity: quantity,
    })) ?? [];

  // 무효화 범위는 sales.mutations.ts 한 곳. 재고 확인은 읽기라 아래 useMutation 그대로.
  const { mutate: quotationConfirmReq } = useConfirmQuotation({
    onSuccess: () => toast.success(t('confirmSuccess')),
    onError: (error) => toast.error(t('confirmError', { message: errorMessageOf(error) })),
  });

  const { mutate: inventoryCheckReq, isPending } = useCheckInventory({
    onSuccess: (data) => setInventoryCheckResult(data),
    onError: (error) => toast.error(t('checkError', { message: errorMessageOf(error) })),
  });

  const { mutate: delieveryProcessReq, isPending: isProcessingDelivery } = useProcessDelivery({
    onSuccess: (data) => toast.info(`${data.status} : ${quote?.quotationNumber}`),
    onError: (error) => toast.error(t('deliverError', { message: errorMessageOf(error) })),
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={tq('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message={tq('loadError')}
        onClose={() => errorDialog.dismiss()}
      />
    );

  // 오류 창을 닫았거나 데이터가 없으면 내용 대신 안내. 예전엔 `!` 로 단언해 여기서 화면이 깨졌다
  if (!quote) return <ModalStatusBox type="error" message={tq('notFound')} />;

  return (
    <div className="space-y-6">
      {/* 견적 정보 요약 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">{tq('infoTitle')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{tq('customerName')}</span>
              <span className="font-medium">{quote.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{tq('ceo')}</span>
              <span className="font-medium">{quote.ceoName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{tq('quotationDate')}</span>
              <span className="font-medium">{quote.quotationDate}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{tq('dueDate')}</span>
              <span className="font-medium">{quote.dueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{tq('amount')}</span>
              <span className="font-medium text-blue-600">{formatCurrency(quote.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{tq('status')}</span>
              <StatusLabel statusCode={quote.statusCode} />
            </div>
          </div>
        </div>
      </div>

      {/* 재고 확인 섹션 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">{t('inventoryTitle')}</h4>
          {!inventoryCheckResult && (
            <button
              onClick={handleInventoryCheck}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>{t('checking')}</span>
                </>
              ) : (
                <>
                  <i className="ri-search-line"></i>
                  <span>{t('check')}</span>
                </>
              )}
            </button>
          )}
        </div>

        {isPending && (
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-3">
              <i className="ri-loader-4-line text-2xl text-blue-600 animate-spin"></i>
              <span className="text-gray-600">{t('checkingLong')}</span>
            </div>
          </div>
        )}

        {inventoryCheckResult && (
          <div className="space-y-4">
            {/* 재고 확인 결과 헤더 */}
            <div
              className={`p-4 rounded-lg ${isAllInventoryFulfilled(inventoryCheckResult) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            >
              <div className="flex items-center space-x-3">
                <i
                  className={`text-2xl ${isAllInventoryFulfilled(inventoryCheckResult) ? 'ri-check-circle-line text-green-600' : 'ri-error-warning-line text-red-600'}`}
                ></i>
                <div>
                  <h5
                    className={`font-semibold ${isAllInventoryFulfilled(inventoryCheckResult) ? 'text-green-800' : 'text-red-800'}`}
                  >
                    {isAllInventoryFulfilled(inventoryCheckResult) ? t('fulfilled') : t('short')}
                  </h5>
                  <p
                    className={`text-sm ${isAllInventoryFulfilled(inventoryCheckResult) ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isAllInventoryFulfilled(inventoryCheckResult)
                      ? t('fulfilledDesc', { dueDate: quote.dueDate })
                      : t('shortDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* 재고 상세 정보 */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {INVENTORY_NEED_TABLE_HEADERS.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-sm font-medium text-gray-700 border-b text-center"
                      >
                        {t(`columns.${header}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryCheckResult.map((item, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3 text-sm font-medium">{item.itemName}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.requiredQuantity}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.inventoryQuantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.productionRequired
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.productionRequired ? t('rowShort') : t('rowFulfilled')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 확인 일시 */}
            <div className="text-sm text-gray-500 text-right">
              {t('checkedAt', {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              })}
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      {inventoryCheckResult && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('nextTitle')}</h4>

          {isAllInventoryFulfilled(inventoryCheckResult) ? (
            <div className="space-y-3">
              <p className="text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                <i className="ri-check-circle-line mr-2"></i>
                {t('readyDesc')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelieveryProcess}
                  disabled={isProcessingDelivery}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                >
                  <i className="ri-truck-line"></i>
                  <span>{t('deliver')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                <i className="ri-error-warning-line mr-2"></i>
                {t('shortNext')}
              </p>
              <div className="flex gap-3">
                <Link
                  href="/production"
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                  onClick={() => {
                    quotationConfirmReq(selectedQuotationId);
                    onClose();
                  }}
                >
                  <i className="ri-settings-3-line"></i>
                  <span>{t('reviewInProduction')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
        >
          {tc('close')}
        </button>
      </div>
    </div>
  );
};

export default QuoteReviewModal;
