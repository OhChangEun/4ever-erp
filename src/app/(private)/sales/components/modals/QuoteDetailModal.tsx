import {
  QuoteDetailModalProps,
  QuoteDetail,
} from '@/app/(private)/sales/types/QuoteDetailModalType';
import { useQuery } from '@tanstack/react-query';
import { getQuoteDetail } from '../../sales.api';
import { useEffect, useState } from 'react';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { QUOTE_DETAIL_TABLE_HEADERS } from '../../constant';
import StatusLabel from '@/app/components/common/StatusLabel';
import { ModalProps } from '@/app/components/common/modal/types';

const QuoteDetailModal = ({ onClose, selectedQuotationId }: QuoteDetailModalProps) => {
  const { data, isLoading, isError } = useQuery<QuoteDetail>({
    queryKey: ['quoteDetail', selectedQuotationId],
    queryFn: () => getQuoteDetail(selectedQuotationId),
    enabled: !!selectedQuotationId,
  });

  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  const [errorModal, setErrorModal] = useState(false);

  if (isLoading) return <ModalStatusBox type="loading" message="견적서를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        type="error"
        message="견적서를 불러오는 중 오류가 발생했습니다."
        onClose={() => setErrorModal(false)}
      />
    );
  return (
    <>
      <div className="space-y-6">
        {/* 견적서 헤더 */}
        <div className="bg-white rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">견적 정보</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">견적번호:</span>
                  <span className="font-medium">{data?.quotationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">견적일자:</span>
                  <span className="font-medium">{data?.quotationDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">납기일:</span>
                  <span className="font-medium">{data?.dueDate}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">고객 정보</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">고객명:</span>
                  <span className="font-medium">{data?.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">담당자:</span>
                  <span className="font-medium">{data?.ceoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상태:</span>
                  <StatusLabel statusCode={data?.statusCode as string} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 견적 품목 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">견적 품목</h4>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {QUOTE_DETAIL_TABLE_HEADERS.map((header) => (
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
                {data?.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-3 text-sm">{item.itemName}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.uomName}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      ₩{item.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      ₩{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* <tr className="border-b">
                        <td className="px-4 py-3 text-sm">제품 B</td>
                        <td className="px-4 py-3 text-sm text-center">5</td>
                        <td className="px-4 py-3 text-sm text-right">₩200,000</td>
                        <td className="px-4 py-3 text-sm text-right">₩1,000,000</td>
                      </tr> */}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-medium text-gray-900">
                    총 견적금액
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">
                    ₩{data?.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuoteDetailModal;
