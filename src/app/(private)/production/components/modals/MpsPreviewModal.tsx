'use client';

import { useState } from 'react';
import { type QuotationPreviewData } from '@/app/(private)/production/types/QuotationPreviewApiType';
import { Pagination } from '@everp/ui'; // Pagination 경로 맞춰서 import
import { type ModalProps } from '@/app/components/common/modal/types';
import { Button } from '@everp/ui';
import { useTranslations } from 'next-intl';

interface MpsPreviewModalProps extends ModalProps {
  previewResults: QuotationPreviewData[]; // 배열 형태
  onConfirm: () => void;
}

export default function MpsPreviewModal({ previewResults, onConfirm }: MpsPreviewModalProps) {
  const t = useTranslations('production');
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = previewResults.length;
  // 목록이 비면 없다. at() 은 undefined 를 타입에 넣어 준다(인덱스 접근은 말하지 않는다)
  const currentPreview = previewResults.at(currentPage - 1);

  return (
    <>
      {!currentPreview ? (
        <p className="text-center text-gray-500">{t('mpsPreview.empty')}</p>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {currentPreview.productName} - {currentPreview.customerCompanyName}
            </h4>
            <p className="text-sm text-gray-700 mb-4">
              {t('mpsPreview.summary', {
                number: currentPreview.quotationNumber,
                dueDate: currentPreview.confirmedDueDate,
              })}
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900">
                      {t('mpsPreview.category')}
                    </th>
                    {currentPreview.weeks.map((week, index) => (
                      <th
                        key={index}
                        className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-900"
                      >
                        {week.week}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                      {t('common.demand')}
                    </td>
                    {currentPreview.weeks.map((week, index) => (
                      <td
                        key={index}
                        className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900"
                      >
                        {week.demand}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                      {t('common.requiredInventory')}
                    </td>
                    {currentPreview.weeks.map((week, index) => (
                      <td
                        key={index}
                        className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900"
                      >
                        {week.requiredQuantity}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                      {t('common.productionNeeded')}
                    </td>
                    {currentPreview.weeks.map((week, index) => (
                      <td
                        key={index}
                        className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900"
                      >
                        {week.productionQuantity}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 bg-blue-50">
                      {t('common.plannedProduction')}
                    </td>
                    {currentPreview.weeks.map((week, index) => (
                      <td
                        key={index}
                        className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-blue-700 bg-blue-50"
                      >
                        {week.mps}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={previewResults.length}
            onPageChange={setCurrentPage}
          />

          <div className="flex justify-end">
            <Button label={t('mpsPreview.confirm')} onClick={onConfirm} />
          </div>
        </>
      )}
    </>
  );
}
