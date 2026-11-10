'use client';

import { useState } from 'react';
import { type QuotationPreviewData } from '@/app/(private)/production/types/QuotationPreviewApiType';
import { Pagination } from '@everp/ui'; // Pagination 경로 맞춰서 import
import { type ModalProps } from '@/app/components/common/modal/types';
import { Button } from '@everp/ui';

interface MpsPreviewModalProps extends ModalProps {
  previewResults: QuotationPreviewData[]; // 배열 형태
  onConfirm: () => void;
}

export default function MpsPreviewModal({ previewResults, onConfirm }: MpsPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = previewResults.length;
  const currentPreview = previewResults[currentPage - 1]; // 현재 페이지 데이터

  return (
    <>
      {!currentPreview ? (
        <p className="text-center text-gray-500">미리보기 데이터가 없습니다.</p>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {currentPreview.productName} - {currentPreview.customerCompanyName}
            </h4>
            <p className="text-sm text-gray-700 mb-4">
              견적 번호: {currentPreview.quotationNumber} | 확정 납기:{' '}
              {currentPreview.confirmedDueDate}
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900">
                      구분
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
                      수요
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
                      재고 필요량
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
                      생산 소요량
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
                      계획 생산 (MPS)
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
            <Button label="MPS 확정" onClick={onConfirm} />
          </div>
        </>
      )}
    </>
  );
}
