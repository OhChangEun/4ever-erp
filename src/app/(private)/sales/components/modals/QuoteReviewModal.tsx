'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INVENTORY_NEED_TABLE_HEADERS } from '@/app/(private)/sales/constant';
import {
  InventoryCheckRes,
  QuoteReviewModalProps,
} from '@/app/(private)/sales/types/QuoteReviewModalType';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Inventories, QuoteDetail } from '../../types/QuoteDetailModalType';
import {
  getQuoteDetail,
  postDeliveryProcess,
  postInventoryCheck,
  postQuotationConfirm,
} from '../../sales.api';
import { isAllInventoryFulfilled } from '../../utils';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';

const QuoteReviewModal = ({ onClose, $selectedQuotationId }: QuoteReviewModalProps) => {
  const [inventoryCheckResult, setInventoryCheckResult] = useState<InventoryCheckRes[] | null>(
    null,
  );
  const toast = useToast();

  const handleInventoryCheck = () => {
    inventoryCheckReq(haveToCheckItems);
  };

  const handleDelieveryProcess = () => {
    delieveryProcessReq($selectedQuotationId);
  };

  const {
    data: quote,
    isLoading,
    isError,
  } = useQuery<QuoteDetail>({
    queryKey: ['quoteDetailForReview', $selectedQuotationId],
    queryFn: () => getQuoteDetail($selectedQuotationId),
    enabled: !!$selectedQuotationId,
  });

  const haveToCheckItems: Inventories[] =
    quote?.items.map(({ itemId, quantity }) => ({
      itemId,
      requiredQuantity: quantity,
    })) ?? [];

  const { mutate: quotationConfirmReq } = useMutation({
    mutationFn: (id: string) => postQuotationConfirm(id),
    onSuccess: (data) => {
      toast.success('검토 요청이 완료되었습니다.');
    },
    onError: (error) => {
      toast.error(`검토 요청 중 오류가 발생했습니다. ${error}`);
    },
  });

  const { mutate: inventoryCheckReq, isPending } = useMutation({
    mutationFn: (items: Inventories[]) => postInventoryCheck(items),
    onSuccess: (data) => {
      setInventoryCheckResult(data);
    },
    onError: (error) => {
      toast.error(`재고 확인 중 오류가 발생했습니다. ${error}`);
    },
  });

  const { mutate: delieveryProcessReq } = useMutation({
    mutationFn: (id: string) => postDeliveryProcess(id),
    onSuccess: (data) => {
      toast.info(`${data.status} : ${quote?.quotationNumber}
          `);
    },
    onError: (error) => {
      toast.error(`즉시 납품 처리 중 오류가 발생했습니다. ${error}`);
    },
  });

  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  const [errorModal, setErrorModal] = useState(false);

  if (isLoading) return <ModalStatusBox $type="loading" $message="견적서를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="견적서를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );

  return (
    <div className="space-y-6">
      {/* 견적 정보 요약 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">견적 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">고객명:</span>
              <span className="font-medium">{quote?.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">담당자:</span>
              <span className="font-medium">{quote?.ceoName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">견적일자:</span>
              <span className="font-medium">{quote?.quotationDate}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">납기일:</span>
              <span className="font-medium">{quote?.dueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">견적금액:</span>
              <span className="font-medium text-blue-600">
                ₩{quote?.totalAmount?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">상태:</span>
              <StatusLabel $statusCode={quote!.statusCode} />
            </div>
          </div>
        </div>
      </div>

      {/* 재고 확인 섹션 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">재고 확인</h4>
          {!inventoryCheckResult && (
            <button
              onClick={handleInventoryCheck}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>확인 중...</span>
                </>
              ) : (
                <>
                  <i className="ri-search-line"></i>
                  <span>재고 확인</span>
                </>
              )}
            </button>
          )}
        </div>

        {isPending && (
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-3">
              <i className="ri-loader-4-line text-2xl text-blue-600 animate-spin"></i>
              <span className="text-gray-600">재고 상태를 확인하고 있습니다...</span>
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
                    {isAllInventoryFulfilled(inventoryCheckResult) ? '재고 충족' : '재고 부족'}
                  </h5>
                  <p
                    className={`text-sm ${isAllInventoryFulfilled(inventoryCheckResult) ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isAllInventoryFulfilled(inventoryCheckResult)
                      ? `요청하신 납기일(${quote?.dueDate})에 모든 제품의 재고가 충분합니다.`
                      : '일부 제품의 재고가 부족하여 생산 계획 검토가 필요합니다.'}
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
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryCheckResult?.map((item, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3 text-sm font-medium">{item.itemName}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.requiredQuantity}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.inventoryQuantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            isAllInventoryFulfilled(inventoryCheckResult)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isAllInventoryFulfilled(inventoryCheckResult) ? '충족' : '부족'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 확인 일시 */}
            <div className="text-sm text-gray-500 text-right">
              재고 확인 일시:{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      {inventoryCheckResult && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">다음 단계</h4>

          {isAllInventoryFulfilled(inventoryCheckResult) ? (
            <div className="space-y-3">
              <p className="text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                <i className="ri-check-circle-line mr-2"></i>
                모든 제품의 재고가 충족되어 즉시 납품이 가능합니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelieveryProcess}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                >
                  <i className="ri-truck-line"></i>
                  <span>즉시 납품 처리</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                <i className="ri-error-warning-line mr-2"></i>
                재고 부족으로 인해 생산 계획 검토가 필요합니다.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/production"
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                  onClick={() => {
                    quotationConfirmReq($selectedQuotationId);
                    onClose();
                  }}
                >
                  <i className="ri-settings-3-line"></i>
                  <span>생산관리에서 검토</span>
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
          닫기
        </button>
      </div>
    </div>
  );
};

export default QuoteReviewModal;
