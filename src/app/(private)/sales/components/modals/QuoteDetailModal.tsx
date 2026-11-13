import {
  type QuoteDetailModalProps,
  type QuoteDetail,
} from '@/app/(private)/sales/types/QuoteDetailModalType';
import { useQuery } from '@tanstack/react-query';
import { getQuoteDetail } from '../../sales.api';
import { quoteKeys } from '@/app/(private)/sales/sales.keys';
import { ModalStatusBox } from '@everp/ui';
import { ITEM_TABLE_HEADERS } from '../../constant';
import StatusLabel from '@/app/components/common/StatusLabel';

import { formatCurrency } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';
import { useSalesLabels } from '@/app/(private)/sales/sales.labels';
const QuoteDetailModal = ({ selectedQuotationId }: QuoteDetailModalProps) => {
  const t = useTranslations('sales.quote');
  const tc = useTranslations('sales.common');
  const { uomLabel } = useSalesLabels();
  const { data, isLoading, isError } = useQuery<QuoteDetail>({
    queryKey: quoteKeys.detail(selectedQuotationId),
    meta: { listOnNotFound: quoteKeys.lists() },
    queryFn: () => getQuoteDetail(selectedQuotationId),
    enabled: !!selectedQuotationId,
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox type="error" message={t('loadError')} onClose={() => errorDialog.dismiss()} />
    );
  return (
    <>
      <div className="space-y-6">
        {/* 견적서 헤더 */}
        <div className="bg-white rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('infoTitle')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('number')}</span>
                  <span className="font-medium">{data?.quotationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('quotationDate')}</span>
                  <span className="font-medium">{data?.quotationDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('dueDate')}</span>
                  <span className="font-medium">{data?.dueDate}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('customerTitle')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('customerName')}</span>
                  <span className="font-medium">{data?.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('ceo')}</span>
                  <span className="font-medium">{data?.ceoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('status')}</span>
                  <StatusLabel statusCode={data?.statusCode} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 견적 품목 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('itemsTitle')}</h4>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {ITEM_TABLE_HEADERS.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-sm font-medium text-gray-700 border-b text-center"
                    >
                      {tc(`itemColumns.${header}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 같은 품목이 두 줄일 수 있어 순번을 붙인다. 정렬과 삭제가 없는 읽기 표다 */}
                {data?.items.map((item, index) => (
                  <tr key={`${item.itemId}-${index}`} className="border-b">
                    <td className="px-4 py-3 text-sm">{item.itemName}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-center">{uomLabel(item.uomName)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.amount)}</td>
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
                    {t('total')}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">
                    {formatCurrency(data?.totalAmount)}
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
