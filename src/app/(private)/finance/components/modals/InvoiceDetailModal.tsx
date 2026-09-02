'use client';

import { getInvoiceType } from '@/app/(private)/finance/utils';
import { VOUCHER_DETAIL_TABLE_HEADERS } from '@/app/(private)/finance/constants';
import {
  InvoiceDetailModalProps,
  InvoicetDetailRes,
} from '@/app/(private)/finance/types/InvoiceDetailModalType';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPurchaseInvoiceDetail, getSalesInvoiceDetail } from '../../finance.api';
import { useSearchParams } from 'next/navigation';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';
import { useModal } from '@/app/components/common/modal/useModal';

const InvoiceDetailModal = ({
  onClose,
  selectedInvoiceId,
  setSelectedInvoiceId,
}: InvoiceDetailModalProps) => {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'sales';
  const role = useRole();

  // const queryFn =
  //   currentTab === 'sales'
  //     ? () => getSalesInvoiceDetail(selectedInvoiceId)
  //     : () => {
  //         return getPurchaseInvoiceDetail(selectedInvoiceId);
  //       };

  const queryFn =
    currentTab === 'sales'
      ? role === 'SUPPLIER_ADMIN'
        ? () => getPurchaseInvoiceDetail(selectedInvoiceId)
        : () => getSalesInvoiceDetail(selectedInvoiceId)
      : role === 'SUPPLIER_ADMIN'
        ? () => getSalesInvoiceDetail(selectedInvoiceId)
        : () => getPurchaseInvoiceDetail(selectedInvoiceId);

  const {
    data: invoiceRes,
    isLoading,
    isError,
  } = useQuery<InvoicetDetailRes>({
    queryKey: ['invoiceDetail', selectedInvoiceId],
    queryFn: queryFn,
    enabled: !!selectedInvoiceId,
  });

  const [errorModal, setErrorModal] = useState(false);
  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  // useEffect(() => {
  //   setSelectedInvoiceId('');
  // }, [onClose]);

  if (isLoading)
    return <ModalStatusBox type="loading" message="고객 상세 데이터를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        type="error"
        message="고객 상세 데이터를 불러오는 중 오류가 발생했습니다."
        onClose={() => setErrorModal(false)}
      />
    );

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전표번호</label>
            <div className="text-lg font-semibold text-gray-900">{invoiceRes?.invoiceNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전표유형</label>
            <div className="text-gray-900">{getInvoiceType(invoiceRes?.invoiceType ?? 'AR')}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">거래처</label>
            <div className="text-gray-900">{invoiceRes?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <div className="text-gray-900">{invoiceRes?.note}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">참조번호</label>
            <div className="text-gray-900">{invoiceRes?.referenceNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전표 발생일</label>
            <div className="text-gray-900">{invoiceRes?.issueDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">납기일</label>
            <div className="text-gray-900">{invoiceRes?.dueDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <StatusLabel statusCode={invoiceRes?.statusCode as string} />
          </div>
        </div>
      </div>

      {/* 주문 품목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">주문 품목</label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {VOUCHER_DETAIL_TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className={`px-4 py-3 text-sm font-medium text-gray-700 border-b ${
                      header === '품목'
                        ? 'text-left'
                        : header === '수량' || header === '단위'
                          ? 'text-center'
                          : 'text-right'
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoiceRes?.items.map((item, index: number) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">{item?.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">
                    {item?.unitOfMaterialName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₩{item.unitPrice?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₩{item.totalPrice?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right font-medium text-gray-900">
                  총 금액
                </td>
                <td className="px-4 py-3 text-right font-medium text-green-600">
                  ₩{invoiceRes?.totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            onClose();
          }}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
